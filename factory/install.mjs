// Install or update the factory in another repository.
//   node factory/install.mjs /path/to/target-repo [--with-github] [--dry-run]
// Copies only the portable kit. Never copies this project's config, agents or docs.
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

const install = () => {
  const log = (message) => console.log(`${dry ? '[dry-run] ' : ''}${message}`);
  const copy = (rel) => {
    log(`copy ${rel}`);
    if (dry) return;
    mkdirSync(dirname(join(target, rel)), { recursive: true });
    cpSync(join(src, rel), join(target, rel), { recursive: true });
  };

  // 1. Portable files (the manifest).
  copy('factory');
  for (const skill of readdirSync(join(src, '.claude/skills'))) if (skill.startsWith('factory-')) copy(`.claude/skills/${skill}`);
  for (const agent of readdirSync(join(src, '.claude/agents'))) if (agent.startsWith('factory-')) copy(`.claude/agents/${agent}`);
  if (flags.includes('--with-github')) copy('.github/workflows/factory-issue.yml');

  // 2. Project config: created once, never overwritten.
  const cfgPath = join(target, '.factory/config.json');
  if (!existsSync(cfgPath)) {
    const pkgFile = join(target, 'package.json');
    const pkg = existsSync(pkgFile) ? JSON.parse(readFileSync(pkgFile, 'utf8')) : {};
    const scripts = pkg.scripts ?? {};
    const pick = (...names) => names.find((name) => scripts[name]);
    const found = { typecheck: pick('typecheck', 'check'), lint: pick('lint'), unit: pick('test:ci', 'test'), build: pick('build'), e2e: pick('e2e', 'test:e2e') };
    const checks = {};
    for (const [name, script] of Object.entries(found)) if (script) checks[name] = `npm run ${script}`;
    const required = ['typecheck', 'lint', 'unit'].filter((name) => checks[name]);
    checks.integrity = 'node factory/bin/factory.mjs integrity';
    const cfg = {
      project: pkg.name ?? 'new-project',
      baseBranch: 'main',
      protectedBranches: ['main', 'master'],
      protectedPaths: ['.env', '.env.*'],
      appendOnlyPaths: [],
      controlPlanePaths: ['.claude/settings.json', '.claude/settings.local.json', '.factory/config.json', 'factory/hooks/', '.github/workflows/'],
      blockedCommands: [],
      limits: { repairAttemptsPerIssue: 3, concurrentFeatures: 1 },
      verify: { required, checks },
      preview: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173', blockedHosts: [], routes: ['/'] },
      specialists: [],
      projectContext: ['CLAUDE.md'],
      productionBoundaries: ['TODO: list what must never change (live data, approved assets, deploy targets).'],
    };
    log('create .factory/config.json (EDIT IT: protectedPaths, preview, productionBoundaries)');
    if (!dry) {
      mkdirSync(dirname(cfgPath), { recursive: true });
      writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);
    }
  }

  // 3. Settings: merge, never replace. Existing rules stay.
  const tpl = JSON.parse(readFileSync(join(src, 'factory/settings.template.json'), 'utf8'));
  const setPath = join(target, '.claude/settings.json');
  const cur = existsSync(setPath) ? JSON.parse(readFileSync(setPath, 'utf8')) : {};
  const union = (first = [], second = []) => [...new Set([...first, ...second])];
  cur.permissions = { ...cur.permissions };
  for (const kind of ['allow', 'ask', 'deny']) cur.permissions[kind] = union(cur.permissions[kind], tpl.permissions[kind]);
  cur.hooks = { ...cur.hooks };
  for (const [ev, groups] of Object.entries(tpl.hooks)) {
    const have = JSON.stringify(cur.hooks[ev] ?? []);
    cur.hooks[ev] = [...(cur.hooks[ev] ?? []), ...groups.filter((group) => !have.includes(JSON.stringify(group.hooks[0].command).slice(1, -1)))];
  }
  log('merge .claude/settings.json');
  if (!dry) {
    mkdirSync(dirname(setPath), { recursive: true });
    writeFileSync(setPath, `${JSON.stringify(cur, null, 2)}\n`);
  }

  // 4. Small touches, both idempotent: .gitignore and a pointer in CLAUDE.md.
  const ign = join(target, '.gitignore');
  if (!existsSync(ign) || !readFileSync(ign, 'utf8').includes('.factory/evidence/')) {
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
