// Factory task ledger. Durable task records + evidence gates. Zero dependencies.
// Usage: node factory/bin/factory.mjs <command> ...   (run with no args for help)
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { currentBranch, FactoryExit, git, loadConfig, repoRoot, scanDiff } from './lib.mjs';

const root = repoRoot();
const cfg = loadConfig(root);
const dir = join(root, '.factory');
const tasksDir = join(dir, 'tasks');
const evDir = join(dir, 'evidence');
const ledger = join(dir, 'ledger.jsonl');
const ACTIVE = ['intake', 'planned', 'building', 'verifying', 'reviewing', 'repairing'];
const BUILD_KINDS = ['build', 'polish'];
const now = () => new Date().toISOString();
const die = (msg, code = 1) => {
  throw new FactoryExit(code, msg);
};
// Evidence is tied to the last commit that changed real code. Commits that only touch .factory/ (task records) do not make evidence stale.
const head = () => git(['log', '-1', '--format=%H', '--', '.', ...BOOKKEEPING], root) || git(['rev-parse', 'HEAD'], root);
// Task records, evidence and metrics are bookkeeping. .factory/config.json is NOT: it defines the checks.
const BOOKKEEPING = [':!.factory/tasks', ':!.factory/evidence', ':!.factory/ledger.jsonl'];
const dirty = () => git(['status', '--porcelain', '--', '.', ...BOOKKEEPING], root) !== '';

const file = (id) => join(tasksDir, `${id}.json`);
const load = (id) => (existsSync(file(id)) ? JSON.parse(readFileSync(file(id), 'utf8')) : die(`No task "${id}".`));
const save = (task) => {
  mkdirSync(tasksDir, { recursive: true });
  task.updatedAt = now();
  writeFileSync(file(task.id), `${JSON.stringify(task, null, 2)}\n`);
};
const all = () => (existsSync(tasksDir) ? readdirSync(tasksDir).filter((name) => name.endsWith('.json')).map((name) => JSON.parse(readFileSync(join(tasksDir, name), 'utf8'))) : []);
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);

const runIntegrity = () => {
  // A task scans only its own changes: `check` passes the commit the task started from.
  const base = process.env.FACTORY_TASK_BASE || (git(['rev-parse', '--verify', `origin/${cfg.baseBranch}`], root) ? `origin/${cfg.baseBranch}` : cfg.baseBranch);
  const diff = `${git(['diff', `${base}...HEAD`, '--', '.', ...BOOKKEEPING], root)}\n${git(['diff', 'HEAD', '--', '.', ...BOOKKEEPING], root)}`;
  const findings = scanDiff(diff);
  console.log(findings.length ? findings.join('\n') : 'integrity: no weakened tests or suppressed checks found');
  return findings.length ? 1 : 0;
};

const sub = {
  init() { mkdirSync(tasksDir, { recursive: true }); mkdirSync(evDir, { recursive: true }); console.log('ok'); },

  new([title, ...rest]) {
    if (!title) die('usage: new "<title>" [--kind build|fix|polish|review|maintain] [--request "<text>"] [--trivial]');
    const opt = (name, fallback) => { const at = rest.indexOf(`--${name}`); return at >= 0 ? rest[at + 1] : fallback; };
    const kind = opt('kind', 'build');
    if (BUILD_KINDS.includes(kind)) {
      const busy = all().filter((task) => BUILD_KINDS.includes(task.kind) && ACTIVE.includes(task.status));
      if (busy.length >= cfg.limits.concurrentFeatures)
        die(`Concurrency ceiling reached (${cfg.limits.concurrentFeatures}). Active: ${busy.map((task) => task.id).join(', ')}. Finish or block one first.`, 4);
    }
    const id = `T-${now().slice(2, 10).replace(/-/g, '')}-${slug(title)}`;
    if (existsSync(file(id))) die(`Task ${id} exists.`);
    save({ id, title, kind, status: 'intake', request: opt('request', title), trivial: rest.includes('--trivial'), branch: currentBranch(root), baseSha: head(), createdAt: now(), criteria: [], checks: {}, reviews: [], issues: {}, interventions: [], notes: [], waivers: [] });
    console.log(id);
  },

  set([id, field, ...value]) {
    const task = load(id);
    if (field === 'status' && !(ACTIVE.concat(['ready', 'blocked']).includes(value[0]))) die(`status must be one of: ${ACTIVE.concat(['ready', 'blocked']).join(', ')}`);
    if (field === 'status' && value[0] === 'ready') die('use "gate" to reach ready');
    if (field === 'status' && BUILD_KINDS.includes(task.kind) && ACTIVE.includes(value[0]) && !ACTIVE.includes(task.status)) {
      const busy = all().filter((other) => other.id !== id && BUILD_KINDS.includes(other.kind) && ACTIVE.includes(other.status));
      if (busy.length >= cfg.limits.concurrentFeatures) die('Concurrency ceiling reached.', 4);
    }
    task[field] = value.join(' ');
    save(task);
  },

  note([id, ...text]) { const task = load(id); task.notes.push({ at: now(), text: text.join(' ') }); save(task); },

  criteria([id, action, ...rest]) {
    const task = load(id);
    if (action === 'add') task.criteria.push({ text: rest.join(' '), done: false });
    else if (action === 'done') {
      const criterion = task.criteria[Number(rest[0]) - 1] ?? die('no such criterion');
      if (rest.length < 2) die('evidence required: criteria <id> done <n> "<how it was shown>"');
      criterion.done = true; criterion.evidence = rest.slice(1).join(' ');
    } else die('criteria <id> add "<text>" | done <n> "<evidence>"');
    save(task);
  },

  // Runs a command and records the result against the current commit.
  check([id, name, ...rest]) {
    const task = load(id);
    const sep = rest.indexOf('--');
    const cmd = sep >= 0 ? rest.slice(sep + 1).join(' ') : cfg.verify.checks[name];
    if (!cmd) die(`No command for check "${name}". Add it to .factory/config.json verify.checks or pass: -- <cmd>`);
    mkdirSync(join(evDir, id), { recursive: true });
    const started = Date.now();
    const run = spawnSync(cmd, { shell: true, cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, FACTORY_TASK_BASE: task.baseSha || '' } });
    const log = join('.factory', 'evidence', id, `${name}.log`);
    writeFileSync(join(root, log), `$ ${cmd}\n${run.stdout ?? ''}\n${run.stderr ?? ''}\nexit ${run.status}\n`);
    task.checks[name] = { result: run.status === 0 ? 'pass' : 'fail', exit: run.status, sha: head(), dirty: dirty(), at: now(), seconds: Math.round((Date.now() - started) / 1000), cmd, log };
    save(task);
    console.log(`${name}: ${task.checks[name].result.toUpperCase()} (${task.checks[name].seconds}s) log: ${log}`);
    if (run.status !== 0) console.log(`${run.stdout ?? ''}${run.stderr ?? ''}`.trim().split('\n').slice(-15).join('\n'));
    // Output is already printed, so the exit carries no message.
    if (run.status !== 0) throw new FactoryExit(1);
  },

  integrity() { const code = runIntegrity(); if (code !== 0) throw new FactoryExit(code); },

  waive([id, name, ...reason]) {
    if (!reason.length) die('waive <id> <check> "<reason>"');
    const task = load(id); task.waivers.push({ check: name, reason: reason.join(' '), at: now() }); save(task);
  },

  // Counts repair attempts per issue. Stops the loop at the ceiling.
  repair([id, key, ...summary]) {
    const task = load(id);
    const issue = (task.issues[key] ??= { attempts: 0, history: [], escalated: false });
    const prev = issue.history.at(-1);
    if (prev && summary.join(' ') === prev.summary) { issue.escalated = true; save(task); die(`ESCALATE: same fix attempted twice for "${key}". Stop and report.`, 3); }
    issue.attempts++; issue.history.push({ at: now(), summary: summary.join(' ') });
    if (issue.attempts > cfg.limits.repairAttemptsPerIssue) { issue.escalated = true; task.status = 'blocked'; save(task); die(`ESCALATE: "${key}" failed ${cfg.limits.repairAttemptsPerIssue} repair attempts. Task blocked. Report to the human.`, 3); }
    task.status = 'repairing'; save(task);
    console.log(`repair ${issue.attempts}/${cfg.limits.repairAttemptsPerIssue} for "${key}"`);
  },

  resolve([id, key, ...how]) { const task = load(id); const issue = task.issues[key] ?? die('no such issue'); issue.resolved = how.join(' ') || 'fixed'; issue.escalated = false; save(task); },

  review([id, mode, verdict, ...summary]) {
    if (!['plan', 'code'].includes(mode) || !['APPROVE', 'CHANGES', 'REJECT'].includes(verdict)) die('review <id> plan|code APPROVE|CHANGES|REJECT "<summary>"');
    const task = load(id); task.reviews.push({ mode, verdict, sha: head(), at: now(), summary: summary.join(' ') }); save(task);
  },

  intervention([id, ...why]) { const task = load(id); task.interventions.push({ at: now(), why: why.join(' ') }); save(task); },

  // Delivery gate. Reads evidence, not claims.
  gate([id]) {
    const task = load(id);
    const sha = head();
    const problems = [];
    if (task.criteria.length === 0) problems.push('no acceptance criteria recorded');
    task.criteria.forEach((criterion, index) => !criterion.done && problems.push(`criterion ${index + 1} not shown: ${criterion.text}`));
    const required = [...new Set([...cfg.verify.required, 'integrity'])];
    for (const name of required) {
      const recorded = task.checks[name];
      const waived = task.waivers.some((waiver) => waiver.check === name);
      if (waived) continue;
      if (!recorded) problems.push(`check "${name}" never ran`);
      else if (recorded.result !== 'pass') problems.push(`check "${name}" failed`);
      else if (recorded.sha !== sha || recorded.dirty) problems.push(`check "${name}" is stale (ran on ${recorded.sha.slice(0, 7)}${recorded.dirty ? '+uncommitted' : ''}, HEAD is ${sha.slice(0, 7)}). Commit, then rerun.`);
    }
    if (!task.trivial) {
      const latest = [...task.reviews].reverse().find((entry) => entry.mode === 'code');
      if (!latest) problems.push('no independent code review recorded');
      else if (latest.verdict !== 'APPROVE') problems.push(`latest code review is ${latest.verdict}`);
      else if (latest.sha !== sha) problems.push('code review is stale: code changed after the review');
    }
    for (const [key, issue] of Object.entries(task.issues)) if (issue.escalated && !issue.resolved) problems.push(`issue "${key}" is escalated and unresolved`);
    if (dirty()) problems.push('uncommitted changes in the working tree');
    if (problems.length) {
      console.log(`GATE: NOT READY\n- ${problems.join('\n- ')}`);
      throw new FactoryExit(1);
    }
    task.status = 'ready'; task.readySha = sha; task.readyAt = now(); save(task);
    console.log(`GATE: READY at ${sha.slice(0, 7)}`);
  },

  // After the human approves: archive a metrics line, drop the task file.
  close([id, outcome = 'approved']) {
    const task = load(id);
    if (task.status !== 'ready' && outcome === 'approved') die('Only a task that passed "gate" can be closed as approved.');
    const checks = Object.values(task.checks);
    const line = { id, title: task.title, kind: task.kind, outcome, created: task.createdAt, closed: now(), minutes: Math.round((Date.now() - Date.parse(task.createdAt)) / 60000), interventions: task.interventions.length, repairAttempts: Object.values(task.issues).reduce((total, issue) => total + issue.attempts, 0), unresolved: Object.entries(task.issues).filter(([, issue]) => !issue.resolved).map(([key]) => key), checksRun: checks.length, checksPassed: checks.filter((entry) => entry.result === 'pass').length, usage: task.usage ?? null };
    appendFileSync(ledger, `${JSON.stringify(line)}\n`);
    rmSync(file(id)); rmSync(join(evDir, id), { recursive: true, force: true });
    console.log(`closed: ${JSON.stringify(line)}`);
  },

  show([id]) { console.log(JSON.stringify(load(id), null, 2)); },

  status(args) {
    const tasks = all();
    const brief = args.includes('--brief');
    const branch = currentBranch(root);
    const ahead = git(['rev-list', '--count', `origin/${cfg.baseBranch}..HEAD`], root) || '?';
    const lines = [`Factory (${cfg.project}) on branch ${branch}, ${ahead} commit(s) ahead of ${cfg.baseBranch}${dirty() ? ', UNCOMMITTED changes' : ''}`];
    if (!tasks.length) lines.push('No open factory tasks.');
    for (const task of tasks) {
      const open = task.criteria.filter((criterion) => !criterion.done).length;
      const esc = Object.entries(task.issues).filter(([, issue]) => issue.escalated && !issue.resolved).map(([key]) => key);
      const failing = Object.entries(task.checks).filter(([, recorded]) => recorded.result === 'fail').map(([key]) => key);
      const flag = task.branch && task.branch !== branch ? ` [branch ${task.branch}]` : '';
      lines.push(`- ${task.id} [${task.status}] ${task.title}${flag} | criteria open ${open}/${task.criteria.length}${failing.length ? ` | failing: ${failing}` : ''}${esc.length ? ` | ESCALATED: ${esc}` : ''}`);
    }
    if (!brief) {
      const done = existsSync(ledger) ? readFileSync(ledger, 'utf8').trim().split('\n').filter(Boolean).map((row) => JSON.parse(row)) : [];
      lines.push(`Closed tasks on record: ${done.length}`);
      for (const entry of done.slice(-5)) lines.push(`  · ${entry.id} ${entry.outcome} (${entry.minutes} min, ${entry.interventions} interventions, ${entry.repairAttempts} repairs)`);
      lines.push(`Next: ${tasks.some((task) => task.status === 'blocked') ? 'a blocked task needs a human decision' : tasks.length ? 'resume the first open task (verify the repo state first, do not trust notes)' : 'ready for a new request'}`);
    }
    console.log(lines.join('\n'));
  },
};

const [cmd, ...args] = process.argv.slice(2);
try {
  if (!cmd || !sub[cmd]) die(`commands: ${Object.keys(sub).join(', ')}`);
  sub[cmd](args);
} catch (error) {
  if (!(error instanceof FactoryExit)) throw error;
  if (error.message) console.error(error.message);
  process.exitCode = error.code;
}
