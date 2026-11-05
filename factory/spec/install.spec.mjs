// Tests for the installer, run against throwaway target repos.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const installer = join(dirname(fileURLToPath(import.meta.url)), '..', 'install.mjs');
const made = [];
const target = (branch = 'main') => {
  const dir = mkdtempSync(join(tmpdir(), 'factory-inst-'));
  made.push(dir);
  execFileSync('git', ['init', '-q', '-b', branch], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init'], { cwd: dir });
  return dir;
};
const install = (dir, ...flags) => spawnSync('node', [installer, dir, ...flags], { encoding: 'utf8' });
after(() => { for (const dir of made) rmSync(dir, { recursive: true, force: true }); });

test('a malformed settings file stops the install before anything is written', () => {
  const dir = target();
  mkdirSync(join(dir, '.claude'));
  writeFileSync(join(dir, '.claude', 'settings.json'), '{ not json');
  const run = install(dir);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /not valid JSON/);
  assert.equal(existsSync(join(dir, 'factory')), false, 'nothing was copied');
});
test('a malformed package.json stops the install too', () => {
  const dir = target();
  writeFileSync(join(dir, 'package.json'), '{');
  const run = install(dir);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /package\.json is not valid JSON/);
});
test('hooks are compared by exact command, and a rerun adds nothing', () => {
  const dir = target();
  mkdirSync(join(dir, '.claude'));
  // A command that merely CONTAINS the template command must not count as installed.
  const tpl = JSON.parse(readFileSync(join(dirname(installer), 'settings.template.json'), 'utf8'));
  const first = Object.entries(tpl.hooks)[0];
  const lookalike = { hooks: { [first[0]]: [{ hooks: [{ type: 'command', command: `${first[1][0].hooks[0].command} --other` }] }] } };
  writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify(lookalike));
  assert.equal(install(dir).status, 0);
  const once = JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'));
  assert.equal(once.hooks[first[0]].length, 1 + first[1].length, 'lookalike kept, real hook added');
  assert.equal(install(dir).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8')), once, 'second run changes nothing');
});
test('an existing workflow file is not overwritten', () => {
  const dir = target();
  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
  writeFileSync(join(dir, '.github', 'workflows', 'factory-issue.yml'), 'mine\n');
  assert.equal(install(dir, '--with-github').status, 0);
  assert.equal(readFileSync(join(dir, '.github', 'workflows', 'factory-issue.yml'), 'utf8'), 'mine\n');
});
test('a comment that mentions the evidence folder does not stop the ignore rule', () => {
  const dir = target();
  writeFileSync(join(dir, '.gitignore'), '# do not ignore .factory/evidence/ yet\nnode_modules\n');
  assert.equal(install(dir).status, 0);
  assert.ok(readFileSync(join(dir, '.gitignore'), 'utf8').split('\n').includes('.factory/evidence/'));
});
test('the base branch is detected, and a missing test setup is a loud warning', () => {
  const dir = target('master');
  const run = install(dir);
  assert.equal(run.status, 0);
  const cfg = JSON.parse(readFileSync(join(dir, '.factory', 'config.json'), 'utf8'));
  assert.equal(cfg.baseBranch, 'master');
  assert.deepEqual(cfg.verify.required, []);
  assert.match(run.stderr, /verify\.required is EMPTY/);
  assert.ok(cfg.controlPlanePaths.includes('factory/bin/lib.mjs'));
});
test('an unknown base branch triggers a warning', () => {
  const dir = target('weird-name');
  assert.match(install(dir).stderr, /could not detect the base branch/);
});

// ---- allow rules come from the target's own checks, never a blanket npm run rule ----
const put = (dir, rel, content) => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), typeof content === 'string' ? content : JSON.stringify(content));
};
const allowOf = (dir) => JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8')).permissions.allow;
const npmRunRules = (allow) => allow.filter((rule) => rule.startsWith('Bash(npm run ')).sort();

test('allow rules follow the target checks: test and build are allowed, deploy is not', () => {
  const dir = target();
  put(dir, 'package.json', { scripts: { test: 'vitest run', build: 'vite build', deploy: 'wrangler deploy' } });
  put(dir, '.factory/config.json', { verify: { required: ['unit'], checks: { unit: 'npm run test', build: 'npm run build' } } });
  const run = install(dir);
  assert.equal(run.status, 0, run.stderr);
  const allow = allowOf(dir);
  assert.deepEqual(npmRunRules(allow), ['Bash(npm run build*)', 'Bash(npm run test*)']);
  assert.deepEqual(allow.filter((rule) => rule.includes('deploy')), []);
  assert.ok(!allow.includes('Bash(npm run *)'), 'no blanket rule');
  for (const fixed of ['Bash(git status*)', 'Bash(git commit*)', 'Bash(node factory/bin/factory.mjs*)', 'Bash(node factory/bin/shoot.mjs*)'])
    assert.ok(allow.includes(fixed), `the kit rule stays: ${fixed}`);
  assert.ok(!allow.includes('Bash(node factory/*)'), 'no whole-folder node rule');
  assert.doesNotMatch(run.stderr, /every npm script/);
});
test('a config the installer creates gives rules for its own scripts and the preview command only', () => {
  const dir = target();
  put(dir, 'package.json', { name: 'demo', scripts: { test: 'vitest run', build: 'vite build', deploy: 'wrangler deploy' } });
  assert.equal(install(dir).status, 0);
  assert.deepEqual(npmRunRules(allowOf(dir)), ['Bash(npm run build*)', 'Bash(npm run dev*)', 'Bash(npm run test*)']);
});
test('a script that a check calls is allowed too, and one it does not call is not', () => {
  const dir = target();
  put(dir, 'package.json', { scripts: { verify: 'npm run lint && npm run test', lint: 'eslint .', test: 'vitest run', deploy: 'wrangler deploy' } });
  put(dir, '.factory/config.json', { verify: { required: ['verify'], checks: { verify: 'npm run verify' } } });
  assert.equal(install(dir).status, 0);
  assert.deepEqual(npmRunRules(allowOf(dir)), ['Bash(npm run lint*)', 'Bash(npm run test*)', 'Bash(npm run verify*)']);
});
test('other check commands get a safe prefix or the exact command, never a bare interpreter or blanket rule', () => {
  const dir = target();
  put(dir, '.factory/config.json', {
    verify: { required: [], checks: { rust: 'cargo test', specs: 'node --test spec/*.spec.mjs', quiet: 'npm run -s lint', single: 'make', bare: 'npm run', runner: 'npx vitest run', chain: 'npm run typecheck && npm run unit | tee out.txt' } },
    preview: { command: 'npm run -s dev -- --host 127.0.0.1' },
  });
  assert.equal(install(dir).status, 0);
  const allow = allowOf(dir);
  for (const rule of ['Bash(cargo test*)', 'Bash(node --test spec/*.spec.mjs*)', 'Bash(npm run -s lint*)', 'Bash(make)', 'Bash(npm run)', 'Bash(npx vitest run*)', 'Bash(npm run typecheck*)', 'Bash(npm run unit*)', 'Bash(npm run -s dev -- --host 127.0.0.1*)'])
    assert.ok(allow.includes(rule), `expected ${rule}`);
  for (const wide of ['Bash(node*)', 'Bash(node *)', 'Bash(make*)', 'Bash(npm run*)', 'Bash(npm run *)', 'Bash(npm*)', 'Bash(npm run -s*)', 'Bash(tee out.txt*)', 'Bash(tee*)'])
    assert.ok(!allow.includes(wide), `must not add ${wide}`);
});
test('an existing blanket npm run rule is kept, and the installer warns about it', () => {
  const dir = target();
  put(dir, '.claude/settings.json', { permissions: { allow: ['Bash(npm run *)', 'Bash(my own rule)'] } });
  put(dir, '.factory/config.json', { verify: { required: [], checks: { unit: 'npm run test' } } });
  const run = install(dir);
  assert.equal(run.status, 0, run.stderr);
  const allow = allowOf(dir);
  assert.ok(allow.includes('Bash(npm run *)'), 'the user rule is never deleted');
  assert.ok(allow.includes('Bash(my own rule)'));
  assert.ok(allow.includes('Bash(npm run test*)'));
  const warnings = run.stderr.split('\n').filter((line) => line.includes('every npm script'));
  assert.equal(warnings.length, 1, 'one warning line');
  assert.match(warnings[0], /^WARNING: .*"Bash\(npm run \*\)".*lets every npm script run without asking/);
});
test('a rerun adds no duplicate allow rules', () => {
  const dir = target();
  put(dir, 'package.json', { scripts: { test: 'vitest run', build: 'vite build' } });
  assert.equal(install(dir).status, 0);
  const once = allowOf(dir);
  assert.equal(new Set(once).size, once.length, 'no duplicates after the first run');
  assert.equal(install(dir).status, 0);
  assert.deepEqual(allowOf(dir), once, 'second run changes nothing');
});
