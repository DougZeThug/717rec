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
