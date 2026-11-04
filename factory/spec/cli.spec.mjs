// End-to-end test of the task ledger gates inside a throwaway git repo.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'factory.mjs');
let repo = '';
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
const factory = (...args) => spawnSync('node', [cli, ...args], { cwd: repo, encoding: 'utf8' });

before(() => {
  repo = mkdtempSync(join(tmpdir(), 'factory-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
  mkdirSync(join(repo, '.factory'));
  writeFileSync(join(repo, '.factory', 'config.json'), JSON.stringify({ verify: { required: ['unit'], checks: { unit: 'node -e "process.exit(0)"', bad: 'node -e "process.exit(1)"' } } }));
  writeFileSync(join(repo, 'a.txt'), '1');
  git('add', 'a.txt', '.factory/config.json'); git('commit', '-qm', 'init');
  git('checkout', '-qb', 'factory/t');
});

after(() => rmSync(repo, { recursive: true, force: true }));

test('concurrency ceiling blocks a second feature', () => {
  const first = factory('new', 'First thing');
  assert.equal(first.status, 0);
  const second = factory('new', 'Second thing');
  assert.equal(second.status, 4);
  assert.match(second.stderr, /ceiling/);
});
test('fix tasks are not limited by the feature ceiling', () => assert.equal(factory('new', 'A bug', '--kind', 'fix').status, 0));

test('gate refuses without evidence, passes with fresh evidence and review', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  assert.equal(factory('gate', id).status, 1);
  factory('criteria', id, 'add', 'a.txt exists');
  factory('criteria', id, 'done', '1', 'ls shows it');
  assert.equal(factory('check', id, 'unit').status, 0);
  assert.equal(factory('check', id, 'integrity').status, 0);
  factory('review', id, 'code', 'APPROVE', 'looks right');
  const ok = factory('gate', id);
  assert.equal(ok.status, 0, ok.stdout);
  // changing code after the evidence makes it stale
  writeFileSync(join(repo, 'a.txt'), '2'); git('commit', '-qam', 'change');
  const stale = factory('gate', id);
  assert.equal(stale.status, 1);
  assert.match(stale.stdout, /stale/);
});
test('committing only task records does not make evidence stale', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  git('add', '-A'); git('commit', '-qm', 'task state');
  assert.equal(factory('check', id, 'unit').status, 0);
  assert.equal(factory('check', id, 'integrity').status, 0);
  assert.equal(factory('review', id, 'code', 'APPROVE', 'ok').status, 0);
  git('commit', '-q', '--allow-empty', '-m', 'noop');
  mkdirSync(join(repo, '.factory'), { recursive: true });
  writeFileSync(join(repo, '.factory', 'ledger.jsonl'), '{"id":"x","outcome":"approved","minutes":1,"interventions":0,"repairAttempts":0}\n');
  git('add', '-A'); git('commit', '-qm', 'only factory files');
  const bookkeepingOnly = factory('gate', id);
  assert.doesNotMatch(bookkeepingOnly.stdout, /stale/, bookkeepingOnly.stdout);
  assert.equal(bookkeepingOnly.status, 0, bookkeepingOnly.stdout);
  assert.match(bookkeepingOnly.stdout, /GATE: READY/, bookkeepingOnly.stdout);
  // but a change to the check definitions is real code: evidence goes stale
  writeFileSync(join(repo, '.factory', 'config.json'), JSON.stringify({ verify: { required: ['unit'], checks: { unit: 'node -e "process.exit(0)"', extra: 'true', bad: 'node -e "process.exit(1)"' } } }));
  git('add', '-A'); git('commit', '-qm', 'change check config');
  const afterConfigChange = factory('gate', id);
  assert.match(afterConfigChange.stdout, /stale/, afterConfigChange.stdout);
  assert.equal(afterConfigChange.status, 1, afterConfigChange.stdout);
  assert.match(afterConfigChange.stdout, /GATE: NOT READY/, afterConfigChange.stdout);
});
test('integrity scans only the task own changes, and catches a skipped test', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  writeFileSync(join(repo, 'old.test.js'), `${['it', 'skip'].join('.')}("x", () => {})\n`); git('add', '-A'); git('commit', '-qm', 'pre-existing skip');
  const task = JSON.parse(execFileSync('node', [cli, 'show', id], { cwd: repo, encoding: 'utf8' }));
  assert.equal(factory('check', id, 'integrity').status, 1, 'baseSha predates the skip, so it is found');
  const moved = factory('set', id, 'baseSha', git('rev-parse', 'HEAD').trim());
  assert.equal(moved.status, 1, 'an agent cannot move the integrity baseline');
  assert.match(moved.stderr, /set can change only: status, branch, title, request, trivial/);
  const taskFile = join(repo, '.factory', 'tasks', `${id}.json`);
  writeFileSync(taskFile, JSON.stringify({ ...task, baseSha: git('rev-parse', 'HEAD').trim() }));
  assert.equal(factory('check', id, 'integrity').status, 0, 'a skip from before the task is not blamed on it');
  assert.ok(task.baseSha);
});
test('a failing check is recorded as failing', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  assert.equal(factory('check', id, 'bad').status, 1);
  assert.match(factory('status').stdout, /failing: bad/);
});
test('repair loop stops at the ceiling and on a repeated fix', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  for (const summary of ['one', 'two', 'three']) assert.equal(factory('repair', id, 'k1', summary).status, 0);
  const over = factory('repair', id, 'k1', 'four');
  assert.equal(over.status, 3);
  assert.match(over.stderr, /ESCALATE/);
  factory('repair', id, 'k2', 'same');
  assert.equal(factory('repair', id, 'k2', 'same').status, 3);
});
test('close refuses an unready task', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  assert.notEqual(factory('close', id).status, 0);
});

test('a required check and an unconfigured name both refuse a substitute command', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  for (const name of ['unit', 'integrity']) {
    const run = factory('check', id, name, '--', 'node -e "0"');
    assert.notEqual(run.status, 0, name);
    assert.match(run.stderr, /required check/);
  }
  const unknown = factory('check', id, 'extra-note', '--', 'node -e "0"');
  assert.notEqual(unknown.status, 0, 'a name that is not configured may not run a custom command');
  assert.match(unknown.stderr, /not a configured check/);
});
test('a refused "-- <cmd>" override runs nothing and leaves no trace', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  const marker = `${repo}-ran`;
  try {
    const run = factory('check', id, 'extra-note', '--', `node -e "require('node:fs').writeFileSync('${marker}', 'x')"`);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /not a configured check/);
    assert.equal(existsSync(marker), false, 'the command must not run');
    assert.equal(existsSync(join(repo, '.factory', 'evidence', id, 'extra-note.log')), false, 'no log file');
    assert.equal(Object.hasOwn(JSON.parse(factory('show', id).stdout).checks, 'extra-note'), false, 'no recorded result');
  } finally {
    rmSync(marker, { force: true });
  }
});
test('a configured check that is not required still accepts a "-- <cmd>" override', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  const configured = JSON.parse(readFileSync(join(repo, '.factory', 'config.json'), 'utf8')).verify;
  assert.ok(Object.hasOwn(configured.checks, 'extra'), 'extra must be configured by an earlier test');
  assert.ok(!configured.required.includes('extra'), 'extra must not be required');
  const run = factory('check', id, 'extra', '--', 'node -e "0"');
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(JSON.parse(factory('show', id).stdout).checks.extra.cmd, 'node -e "0"', 'the override ran, not the configured command');
});
test('names that exist only on Object.prototype never count as configured', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  for (const name of ['__proto__', 'constructor']) {
    const run = factory('check', id, name, '--', 'node -e "0"');
    assert.notEqual(run.status, 0, name);
    assert.match(run.stderr, /not a configured check/, name);
  }
});
test('a check name that exists only on Object.prototype ends in the plain "No command" error, not a crash', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  const taskFile = join(repo, '.factory', 'tasks', `${id}.json`);
  const recordedBefore = Object.keys(JSON.parse(readFileSync(taskFile, 'utf8')).checks);
  for (const name of ['constructor', '__proto__', 'toString']) {
    const run = factory('check', id, name);
    assert.equal(run.status, 1, `${name}: ${run.stdout}${run.stderr}`);
    assert.match(run.stderr, /No command for check/, name);
    assert.doesNotMatch(run.stdout + run.stderr, /TypeError/, name);
    assert.equal(existsSync(join(repo, '.factory', 'evidence', id, `${name}.log`)), false, `${name}: no log file`);
    assert.equal(Object.hasOwn(JSON.parse(factory('show', id).stdout).checks, name), false, `${name}: no recorded result`);
    assert.doesNotMatch(readFileSync(taskFile, 'utf8'), new RegExp(`"${name}"\\s*:`), `${name}: the task file has no such key`);
  }
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(taskFile, 'utf8')).checks), recordedBefore, 'no check record was added');
});
test('integrity fails when the base diff cannot be read', () => {
  const run = spawnSync('node', [cli, 'integrity'], { cwd: repo, encoding: 'utf8', env: { ...process.env, FACTORY_TASK_BASE: 'no-such-commit-0000' } });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /could not read the diff/);
});
test('set accepts only known fields and reads trivial as a boolean', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  const task = () => JSON.parse(factory('show', id).stdout);
  assert.notEqual(factory('set', id, 'checks', 'x').status, 0);
  assert.notEqual(factory('set', id, 'readySha', 'abc').status, 0);
  assert.notEqual(factory('set', id, 'trivial', 'maybe').status, 0);
  assert.equal(factory('set', id, 'trivial', 'true').status, 0);
  assert.strictEqual(task().trivial, true);
  assert.equal(factory('set', id, 'trivial', 'false').status, 0);
  assert.strictEqual(task().trivial, false);
});
test('close as approved re-checks the gate', () => {
  const made = factory('new', 'Closer', '--kind', 'fix', '--trivial');
  const id = made.stdout.trim();
  factory('criteria', id, 'add', 'works');
  factory('criteria', id, 'done', '1', 'shown');
  assert.equal(factory('check', id, 'unit').status, 0);
  assert.equal(factory('check', id, 'integrity').status, 0);
  assert.equal(factory('gate', id).status, 0);
  writeFileSync(join(repo, 'dirty.txt'), 'x');
  const refused = factory('close', id);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /gate no longer passes/);
  rmSync(join(repo, 'dirty.txt'));
  assert.equal(factory('close', id).status, 0);
});
