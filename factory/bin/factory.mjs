#!/usr/bin/env node
// Factory task ledger. Durable task records + evidence gates. Zero dependencies.
// Usage: node factory/bin/factory.mjs <command> ...   (run with no args for help)
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { currentBranch, git, loadConfig, repoRoot, scanDiff } from './lib.mjs';

const root = repoRoot();
const cfg = loadConfig(root);
const dir = join(root, '.factory');
const tasksDir = join(dir, 'tasks');
const evDir = join(dir, 'evidence');
const ledger = join(dir, 'ledger.jsonl');
const ACTIVE = ['intake', 'planned', 'building', 'verifying', 'reviewing', 'repairing'];
const BUILD_KINDS = ['build', 'polish'];
const now = () => new Date().toISOString();
const die = (msg, code = 1) => (console.error(msg), process.exit(code));
// Evidence is tied to the last commit that changed real code. Commits that only touch .factory/ (task records) do not make evidence stale.
const head = () => git(['log', '-1', '--format=%H', '--', '.', ':!.factory'], root) || git(['rev-parse', 'HEAD'], root);
const dirty = () => git(['status', '--porcelain', '--', '.', ':!.factory'], root) !== '';

const file = (id) => join(tasksDir, `${id}.json`);
const load = (id) => (existsSync(file(id)) ? JSON.parse(readFileSync(file(id), 'utf8')) : die(`No task "${id}".`));
const save = (t) => (mkdirSync(tasksDir, { recursive: true }), (t.updatedAt = now()), writeFileSync(file(t.id), JSON.stringify(t, null, 2) + '\n'));
const all = () => (existsSync(tasksDir) ? readdirSync(tasksDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(tasksDir, f), 'utf8'))) : []);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);

const runIntegrity = () => {
  // A task scans only its own changes: `check` passes the commit the task started from.
  const base = process.env.FACTORY_TASK_BASE || (git(['rev-parse', '--verify', `origin/${cfg.baseBranch}`], root) ? `origin/${cfg.baseBranch}` : cfg.baseBranch);
  const diff = git(['diff', `${base}...HEAD`, '--', '.', ':!.factory'], root) + '\n' + git(['diff', 'HEAD', '--', '.', ':!.factory'], root);
  const findings = scanDiff(diff);
  console.log(findings.length ? findings.join('\n') : 'integrity: no weakened tests or suppressed checks found');
  return findings.length ? 1 : 0;
};

const sub = {
  init() { mkdirSync(tasksDir, { recursive: true }); mkdirSync(evDir, { recursive: true }); console.log('ok'); },

  new([title, ...rest]) {
    if (!title) die('usage: new "<title>" [--kind build|fix|polish|review|maintain] [--request "<text>"] [--trivial]');
    const opt = (n, d) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : d; };
    const kind = opt('kind', 'build');
    if (BUILD_KINDS.includes(kind)) {
      const busy = all().filter((t) => BUILD_KINDS.includes(t.kind) && ACTIVE.includes(t.status));
      if (busy.length >= cfg.limits.concurrentFeatures)
        die(`Concurrency ceiling reached (${cfg.limits.concurrentFeatures}). Active: ${busy.map((t) => t.id).join(', ')}. Finish or block one first.`, 4);
    }
    const id = `T-${now().slice(2, 10).replace(/-/g, '')}-${slug(title)}`;
    if (existsSync(file(id))) die(`Task ${id} exists.`);
    save({ id, title, kind, status: 'intake', request: opt('request', title), trivial: rest.includes('--trivial'), branch: currentBranch(root), baseSha: head(), createdAt: now(), criteria: [], checks: {}, reviews: [], issues: {}, interventions: [], notes: [], waivers: [] });
    console.log(id);
  },

  set([id, field, ...v]) {
    const t = load(id);
    if (field === 'status' && !(ACTIVE.concat(['ready', 'blocked']).includes(v[0]))) die('status must be one of: ' + ACTIVE.concat(['ready', 'blocked']).join(', '));
    if (field === 'status' && v[0] === 'ready') die('use "gate" to reach ready');
    if (field === 'status' && BUILD_KINDS.includes(t.kind) && ACTIVE.includes(v[0]) && !ACTIVE.includes(t.status)) {
      const busy = all().filter((x) => x.id !== id && BUILD_KINDS.includes(x.kind) && ACTIVE.includes(x.status));
      if (busy.length >= cfg.limits.concurrentFeatures) die('Concurrency ceiling reached.', 4);
    }
    t[field] = v.join(' ');
    save(t);
  },

  note([id, ...text]) { const t = load(id); t.notes.push({ at: now(), text: text.join(' ') }); save(t); },

  criteria([id, action, ...rest]) {
    const t = load(id);
    if (action === 'add') t.criteria.push({ text: rest.join(' '), done: false });
    else if (action === 'done') {
      const c = t.criteria[Number(rest[0]) - 1] ?? die('no such criterion');
      if (rest.length < 2) die('evidence required: criteria <id> done <n> "<how it was shown>"');
      c.done = true; c.evidence = rest.slice(1).join(' ');
    } else die('criteria <id> add "<text>" | done <n> "<evidence>"');
    save(t);
  },

  // Runs a command and records the result against the current commit.
  check([id, name, ...rest]) {
    const t = load(id);
    const sep = rest.indexOf('--');
    const cmd = sep >= 0 ? rest.slice(sep + 1).join(' ') : cfg.verify.checks[name];
    if (!cmd) die(`No command for check "${name}". Add it to .factory/config.json verify.checks or pass: -- <cmd>`);
    mkdirSync(join(evDir, id), { recursive: true });
    const started = Date.now();
    const r = spawnSync(cmd, { shell: true, cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, FACTORY_TASK_BASE: t.baseSha || '' } });
    const log = join('.factory', 'evidence', id, `${name}.log`);
    writeFileSync(join(root, log), `$ ${cmd}\n${r.stdout ?? ''}\n${r.stderr ?? ''}\nexit ${r.status}\n`);
    t.checks[name] = { result: r.status === 0 ? 'pass' : 'fail', exit: r.status, sha: head(), dirty: dirty(), at: now(), seconds: Math.round((Date.now() - started) / 1000), cmd, log };
    save(t);
    console.log(`${name}: ${t.checks[name].result.toUpperCase()} (${t.checks[name].seconds}s) log: ${log}`);
    if (r.status !== 0) console.log(((r.stdout ?? '') + (r.stderr ?? '')).trim().split('\n').slice(-15).join('\n'));
    process.exit(r.status === 0 ? 0 : 1);
  },

  integrity() { process.exit(runIntegrity()); },

  waive([id, name, ...reason]) {
    if (!reason.length) die('waive <id> <check> "<reason>"');
    const t = load(id); t.waivers.push({ check: name, reason: reason.join(' '), at: now() }); save(t);
  },

  // Counts repair attempts per issue. Stops the loop at the ceiling.
  repair([id, key, ...summary]) {
    const t = load(id);
    const i = (t.issues[key] ??= { attempts: 0, history: [], escalated: false });
    const prev = i.history.at(-1);
    if (prev && summary.join(' ') === prev.summary) { i.escalated = true; save(t); die(`ESCALATE: same fix attempted twice for "${key}". Stop and report.`, 3); }
    i.attempts++; i.history.push({ at: now(), summary: summary.join(' ') });
    if (i.attempts > cfg.limits.repairAttemptsPerIssue) { i.escalated = true; t.status = 'blocked'; save(t); die(`ESCALATE: "${key}" failed ${cfg.limits.repairAttemptsPerIssue} repair attempts. Task blocked. Report to the human.`, 3); }
    t.status = 'repairing'; save(t);
    console.log(`repair ${i.attempts}/${cfg.limits.repairAttemptsPerIssue} for "${key}"`);
  },

  resolve([id, key, ...how]) { const t = load(id); const i = t.issues[key] ?? die('no such issue'); i.resolved = how.join(' ') || 'fixed'; i.escalated = false; save(t); },

  review([id, mode, verdict, ...summary]) {
    if (!['plan', 'code'].includes(mode) || !['APPROVE', 'CHANGES', 'REJECT'].includes(verdict)) die('review <id> plan|code APPROVE|CHANGES|REJECT "<summary>"');
    const t = load(id); t.reviews.push({ mode, verdict, sha: head(), at: now(), summary: summary.join(' ') }); save(t);
  },

  intervention([id, ...why]) { const t = load(id); t.interventions.push({ at: now(), why: why.join(' ') }); save(t); },

  // Delivery gate. Reads evidence, not claims.
  gate([id]) {
    const t = load(id);
    const sha = head();
    const problems = [];
    if (t.criteria.length === 0) problems.push('no acceptance criteria recorded');
    t.criteria.forEach((c, n) => !c.done && problems.push(`criterion ${n + 1} not shown: ${c.text}`));
    const required = [...new Set([...cfg.verify.required, 'integrity'])];
    for (const name of required) {
      const c = t.checks[name];
      const waived = t.waivers.some((w) => w.check === name);
      if (waived) continue;
      if (!c) problems.push(`check "${name}" never ran`);
      else if (c.result !== 'pass') problems.push(`check "${name}" failed`);
      else if (c.sha !== sha || c.dirty) problems.push(`check "${name}" is stale (ran on ${c.sha.slice(0, 7)}${c.dirty ? '+uncommitted' : ''}, HEAD is ${sha.slice(0, 7)}). Commit, then rerun.`);
    }
    if (!t.trivial) {
      const r = [...t.reviews].reverse().find((x) => x.mode === 'code');
      if (!r) problems.push('no independent code review recorded');
      else if (r.verdict !== 'APPROVE') problems.push(`latest code review is ${r.verdict}`);
      else if (r.sha !== sha) problems.push('code review is stale: code changed after the review');
    }
    for (const [k, i] of Object.entries(t.issues)) if (i.escalated && !i.resolved) problems.push(`issue "${k}" is escalated and unresolved`);
    if (dirty()) problems.push('uncommitted changes in the working tree');
    if (problems.length) { console.log('GATE: NOT READY\n- ' + problems.join('\n- ')); process.exit(1); }
    t.status = 'ready'; t.readySha = sha; t.readyAt = now(); save(t);
    console.log('GATE: READY at ' + sha.slice(0, 7));
  },

  // After the human approves: archive a metrics line, drop the task file.
  close([id, outcome = 'approved']) {
    const t = load(id);
    if (t.status !== 'ready' && outcome === 'approved') die('Only a task that passed "gate" can be closed as approved.');
    const checks = Object.values(t.checks);
    const line = { id, title: t.title, kind: t.kind, outcome, created: t.createdAt, closed: now(), minutes: Math.round((Date.now() - Date.parse(t.createdAt)) / 60000), interventions: t.interventions.length, repairAttempts: Object.values(t.issues).reduce((n, i) => n + i.attempts, 0), unresolved: Object.entries(t.issues).filter(([, i]) => !i.resolved).map(([k]) => k), checksRun: checks.length, checksPassed: checks.filter((c) => c.result === 'pass').length, usage: t.usage ?? null };
    appendFileSync(ledger, JSON.stringify(line) + '\n');
    rmSync(file(id)); rmSync(join(evDir, id), { recursive: true, force: true });
    console.log('closed: ' + JSON.stringify(line));
  },

  show([id]) { console.log(JSON.stringify(load(id), null, 2)); },

  status(args) {
    const tasks = all();
    const brief = args.includes('--brief');
    const br = currentBranch(root);
    const ahead = git(['rev-list', '--count', `origin/${cfg.baseBranch}..HEAD`], root) || '?';
    const lines = [`Factory (${cfg.project}) on branch ${br}, ${ahead} commit(s) ahead of ${cfg.baseBranch}${dirty() ? ', UNCOMMITTED changes' : ''}`];
    if (!tasks.length) lines.push('No open factory tasks.');
    for (const t of tasks) {
      const open = t.criteria.filter((c) => !c.done).length;
      const esc = Object.entries(t.issues).filter(([, i]) => i.escalated && !i.resolved).map(([k]) => k);
      const failing = Object.entries(t.checks).filter(([, c]) => c.result === 'fail').map(([k]) => k);
      const flag = t.branch && t.branch !== br ? ` [branch ${t.branch}]` : '';
      lines.push(`- ${t.id} [${t.status}] ${t.title}${flag} | criteria open ${open}/${t.criteria.length}${failing.length ? ` | failing: ${failing}` : ''}${esc.length ? ` | ESCALATED: ${esc}` : ''}`);
    }
    if (!brief) {
      const done = existsSync(ledger) ? readFileSync(ledger, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
      lines.push(`Closed tasks on record: ${done.length}`);
      for (const d of done.slice(-5)) lines.push(`  · ${d.id} ${d.outcome} (${d.minutes} min, ${d.interventions} interventions, ${d.repairAttempts} repairs)`);
      lines.push('Next: ' + (tasks.some((t) => t.status === 'blocked') ? 'a blocked task needs a human decision' : tasks.length ? 'resume the first open task (verify the repo state first, do not trust notes)' : 'ready for a new request'));
    }
    console.log(lines.join('\n'));
  },
};

const [cmd, ...args] = process.argv.slice(2);
if (!cmd || !sub[cmd]) die('commands: ' + Object.keys(sub).join(', '));
sub[cmd](args);
