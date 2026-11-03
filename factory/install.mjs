// Install or update the factory in another repository.
//   node factory/install.mjs /path/to/target-repo [--with-github] [--dry-run]
// Copies only the portable kit. Never copies this project's config, agents or docs.
import { execFileSync } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [targetArg, ...flags] = process.argv.slice(2);
const fail = (message) => {
  console.error(message);
  process.exitCode = 1;
};
const target = resolve(targetArg ?? '.');
const dry = flags.includes('--dry-run');
const problem = !targetArg
  ? 'usage: node factory/install.mjs <target-repo> [--with-github] [--dry-run]'
  : (!existsSync(join(target, '.git')) && `${target} is not a git repository root.`) || (target === src && 'Target is the kit itself.');
if (problem) fail(problem);

// Allow rules for the target's own commands (its verify.checks and preview.command).
// A wildcard goes only on a clearly safe prefix. When unsure, the rule is the exact command plus "*".
// A one-word command with no arguments stays exact, so "make" never becomes "make*".
const NPM_RUN = /^npm run ([\w:][\w:.-]*)(?:\s|$)/;
const LAUNCHERS = new Set(['node', 'nodejs', 'python', 'python3', 'ruby', 'perl', 'php', 'sh', 'bash', 'zsh', 'env', 'sudo', 'eval', 'exec', 'xargs', 'nohup', 'time', 'timeout']);
const NEEDS_ARGUMENT = new Set(['run', 'exec', 'x', 'dlx']);
const ruleForPiece = (piece) => {
  const script = NPM_RUN.exec(piece)?.[1];
  if (script) return { rule: `Bash(npm run ${script}*)`, script };
  const words = piece.split(/\s+/);
  let count = 0;
  while (count < words.length && /^[a-z][a-z0-9_:-]*$/.test(words[count])) count += 1;
  const prefix = words.slice(0, count);
  // "node --test x" has the one plain word "node": a bare interpreter rule would allow any script.
  // "npm run -s lint" has the prefix "npm run": that would allow any script or package, so it is not used either.
  const tooWide = prefix.length === 2 && NEEDS_ARGUMENT.has(prefix[1]);
  if (prefix.length >= 2 && !LAUNCHERS.has(prefix[0]) && !tooWide) return { rule: `Bash(${prefix.join(' ')}*)` };
  return { rule: words.length === 1 || (tooWide && words.length === 2) ? `Bash(${piece})` : `Bash(${piece}*)` };
};
const allowRulesFor = (command) => {
  const text = typeof command === 'string' ? command.trim() : '';
  if (!text) return [];
  // A chain with quotes cannot be split safely: use the exact command.
  if (/["'`$]/.test(text) && /&&|\|\||[;|\n]/.test(text)) return [{ rule: `Bash(${text}*)` }];
  // Each part of a chain is its own command. After a pipe only the first command counts, so the tail is never pre-approved.
  return text.split(/&&|\|\||[;\n]/).map((piece) => piece.split('|')[0].trim()).filter(Boolean).map(ruleForPiece);
};
const BLANKET_NPM_RUN = /^Bash\(npm run(?: \*|:\*|\*)\)$/;

const install = () => {
  const log = (message) => console.log(`${dry ? '[dry-run] ' : ''}${message}`);
  const copy = (rel) => {
    log(`copy ${rel}`);
    if (dry) return;
    mkdirSync(dirname(join(target, rel)), { recursive: true });
    cpSync(join(src, rel), join(target, rel), { recursive: true });
  };

  // 0. Read and parse every existing JSON file first. A bad file must stop the run before anything is written.
  const readJson = (file) => {
    if (!existsSync(file)) return {};
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      throw new Error(`${file} is not valid JSON (${error.message}). Fix it, then run the installer again. Nothing was written.`);
    }
  };
  const pkgFile = join(target, 'package.json');
  const setPath = join(target, '.claude/settings.json');
  const cfgPath = join(target, '.factory/config.json');
  let pkg = null;
  let cur = null;
  let projectCfg = null; // the config the allow rules come from: the existing one, or the one step 2 creates
  try {
    pkg = readJson(pkgFile);
    cur = readJson(setPath);
    projectCfg = readJson(cfgPath);
  } catch (error) {
    fail(error.message);
    return;
  }
  const tpl = JSON.parse(readFileSync(join(src, 'factory/settings.template.json'), 'utf8'));

  // 1. Portable files (the manifest).
  copy('factory');
  for (const skill of readdirSync(join(src, '.claude/skills'))) if (skill.startsWith('factory-')) copy(`.claude/skills/${skill}`);
  for (const agent of readdirSync(join(src, '.claude/agents'))) if (agent.startsWith('factory-')) copy(`.claude/agents/${agent}`);
  if (flags.includes('--with-github')) {
    if (existsSync(join(target, '.github/workflows/factory-issue.yml'))) log('skip .github/workflows/factory-issue.yml (already exists, not overwritten)');
    else copy('.github/workflows/factory-issue.yml');
  }

  // The integrity check diffs against baseBranch, so it must exist in the target.
  const detectBase = () => {
    const tryGit = (...args) => { try { return execFileSync('git', ['-C', target, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
    const remoteHead = tryGit('symbolic-ref', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, '');
    const found = remoteHead || ['main', 'master', 'develop', 'trunk'].find((name) => tryGit('rev-parse', '--verify', '--quiet', `refs/heads/${name}`));
    if (!found) console.warn('WARNING: could not detect the base branch. baseBranch is set to "main". Set it in .factory/config.json, or the integrity check will diff against a branch that does not exist.');
    return found || 'main';
  };

  // 2. Project config: created once, never overwritten.
  if (!existsSync(cfgPath)) {
    const scripts = pkg.scripts ?? {};
    const pick = (...names) => names.find((name) => scripts[name]);
    const found = { typecheck: pick('typecheck', 'check'), lint: pick('lint'), unit: pick('test:ci', 'test'), build: pick('build'), e2e: pick('e2e', 'test:e2e') };
    const checks = {};
    for (const [name, script] of Object.entries(found)) if (script) checks[name] = `npm run ${script}`;
    const required = ['typecheck', 'lint', 'unit'].filter((name) => checks[name]);
    if (required.length === 0) console.warn('WARNING: no typecheck, lint or test script was found. verify.required is EMPTY, so a task can reach "ready" with no test run. Add your checks to .factory/config.json (verify.checks and verify.required) before you use the factory.');
    checks.integrity = 'node factory/bin/factory.mjs integrity';
    const base = detectBase();
    const cfg = {
      project: pkg.name ?? 'new-project',
      baseBranch: base,
      protectedBranches: [...new Set([base, 'main', 'master'])],
      protectedPaths: ['.env', '.env.*'],
      appendOnlyPaths: [],
      controlPlanePaths: ['.claude/settings.json', '.claude/settings.local.json', '.factory/config.json', 'factory/hooks/', 'factory/bin/lib.mjs', '.github/workflows/'],
      blockedCommands: [],
      limits: { repairAttemptsPerIssue: 3, concurrentFeatures: 1 },
      verify: { required, checks },
      preview: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173', blockedHosts: [], routes: ['/'] },
      specialists: [],
      projectContext: ['CLAUDE.md'],
      productionBoundaries: ['TODO: list what must never change (live data, approved assets, deploy targets).'],
    };
    projectCfg = cfg;
    log('create .factory/config.json (EDIT IT: protectedPaths, preview, productionBoundaries)');
    if (!dry) {
      mkdirSync(dirname(cfgPath), { recursive: true });
      writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);
    }
  }

  // 3. Settings: merge, never replace. Existing rules stay.
  const union = (first = [], second = []) => [...new Set([...first, ...second])];
  cur.permissions = { ...cur.permissions };
  // Allow rules: the template's fixed rules (git, factory.mjs, shoot.mjs, ...), but never its npm run rules.
  // The npm run rules come from this project's own checks, plus the scripts those checks call.
  const scripts = pkg.scripts ?? {};
  const derived = new Set();
  const seen = new Set();
  const addScript = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    derived.add(`Bash(npm run ${name}*)`);
    for (const called of String(scripts[name] ?? '').matchAll(/\bnpm run ([\w:][\w:.-]*)/g)) if (scripts[called[1]] !== undefined) addScript(called[1]);
  };
  const checks = projectCfg?.verify?.checks;
  const commands = [...Object.values(checks && typeof checks === 'object' ? checks : {}), projectCfg?.preview?.command];
  for (const { rule, script } of commands.flatMap((command) => allowRulesFor(command))) {
    derived.add(rule);
    if (script) addScript(script);
  }
  log(`allow rules from this project's checks: ${[...derived].join(' ') || '(none)'}`);
  const fixed = tpl.permissions.allow.filter((rule) => !rule.startsWith('Bash(npm run '));
  // Never delete a rule the user already has, but say so when it lets every npm script run.
  for (const rule of (cur.permissions.allow ?? []).filter((item) => BLANKET_NPM_RUN.test(item)))
    console.warn(`WARNING: .claude/settings.json already has the rule "${rule}". It lets every npm script run without asking. The installer kept it. Remove it to be asked before scripts such as deploy.`);
  cur.permissions.allow = union(cur.permissions.allow, [...fixed, ...derived]);
  for (const kind of ['ask', 'deny']) cur.permissions[kind] = union(cur.permissions[kind], tpl.permissions[kind]);
  cur.hooks = { ...cur.hooks };
  for (const [ev, groups] of Object.entries(tpl.hooks)) {
    // Exact command match: a substring could skip a hook the target does not really have.
    const have = new Set((cur.hooks[ev] ?? []).flatMap((group) => (group.hooks ?? []).map((hook) => hook.command)));
    cur.hooks[ev] = [...(cur.hooks[ev] ?? []), ...groups.filter((group) => !group.hooks.every((hook) => have.has(hook.command)))];
  }
  log('merge .claude/settings.json');
  if (!dry) {
    mkdirSync(dirname(setPath), { recursive: true });
    writeFileSync(setPath, `${JSON.stringify(cur, null, 2)}\n`);
  }

  // 4. Small touches, both idempotent: .gitignore and a pointer in CLAUDE.md.
  const ign = join(target, '.gitignore');
  const ignored = existsSync(ign) && readFileSync(ign, 'utf8').split(/\r?\n/).some((line) => ['.factory/evidence/', '/.factory/evidence/', '.factory/evidence', '/.factory/evidence'].includes(line.trim()));
  if (!ignored) {
    log('append .gitignore');
    if (!dry) appendFileSync(ign, '\n# Factory evidence stays local\n.factory/evidence/\n');
  }
  const cm = join(target, 'CLAUDE.md');
  const marker = '<!-- factory -->';
  const note = `\n${marker}\n## Software factory\nUse \`/factory-build\`, \`/factory-fix\`, \`/factory-review\`, \`/factory-polish\`, \`/factory-status\`, \`/factory-maintain\`. Playbook: \`factory/PIPELINE.md\`. Project settings: \`.factory/config.json\`.\n`;
  if (!existsSync(cm) || !readFileSync(cm, 'utf8').includes(marker)) {
    log('append CLAUDE.md pointer');
    if (!dry) appendFileSync(cm, note);
  }

  console.log(`
  Done. Next:
   1. Edit ${join(target, '.factory/config.json')} (protected paths, preview URL, boundaries).
   2. Run in the target: node factory/bin/factory.mjs status
   3. Start a NEW Claude Code session there. Settings, agents and skills load at session start.
   4. Turn on GitHub branch protection for the base branch. Hooks help, but only GitHub can truly stop a merge.`);
};
if (!problem) install();
