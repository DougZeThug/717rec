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
  // extra-note is not configured. extra is configured but not required (an earlier test added it to the config).
  const refusals = [['extra-note', /not a configured check/], ['extra', /override is not supported/]];
  try {
    for (const [name, refusal] of refusals) {
      const run = factory('check', id, name, '--', `node -e "require('node:fs').writeFileSync('${marker}', 'x')"`);
      assert.notEqual(run.status, 0, name);
      assert.match(run.stderr, refusal, name);
      assert.equal(existsSync(marker), false, `${name}: the command must not run`);
      assert.equal(existsSync(join(repo, '.factory', 'evidence', id, `${name}.log`)), false, `${name}: no log file`);
      assert.equal(Object.hasOwn(JSON.parse(factory('show', id).stdout).checks, name), false, `${name}: no recorded result`);
    }
  } finally {
    rmSync(marker, { force: true });
  }
});
// DELIBERATE PRODUCT DECISION by Doug (task T-261104-factory-hardening-follow), not a weakened test.
// This test replaces one that proved a configured, not-required check ACCEPTED a "-- <cmd>" override.
// That old behaviour is removed on purpose: the allow rule for this CLI would run any such command with no prompt.
// The override is now refused for every name. The checks run their configured command only.
test('a configured check that is not required also refuses a "-- <cmd>" override', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  const configured = JSON.parse(readFileSync(join(repo, '.factory', 'config.json'), 'utf8')).verify;
  assert.ok(Object.hasOwn(configured.checks, 'extra'), 'extra must be configured by an earlier test');
  assert.ok(!configured.required.includes('extra'), 'extra must not be required');
  const marker = `${repo}-ran-extra`;
  try {
    const run = factory('check', id, 'extra', '--', `node -e "require('node:fs').writeFileSync('${marker}', 'x')"`);
    assert.notEqual(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stderr, /override is not supported/);
    assert.match(run.stderr, /configured command only/);
    assert.match(run.stderr, /\.factory\/config\.json verify\.checks/);
    assert.equal(existsSync(marker), false, 'the override command must not run');
    assert.equal(existsSync(join(repo, '.factory', 'evidence', id, 'extra.log')), false, 'no log file');
    assert.equal(Object.hasOwn(JSON.parse(factory('show', id).stdout).checks, 'extra'), false, 'no recorded result');
  } finally {
    rmSync(marker, { force: true });
  }
  // The refusal is only for the override. Without it, the configured command still runs.
  const plain = factory('check', id, 'extra');
  assert.equal(plain.status, 0, plain.stdout + plain.stderr);
  assert.equal(JSON.parse(factory('show', id).stdout).checks.extra.cmd, configured.checks.extra, 'the configured command ran');
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
test('a recorded CHANGES or REJECT code review blocks a trivial task too; plan reviews and missing or stale reviews do not', () => {
  const id = factory('new', 'Trivial review chain', '--kind', 'fix', '--trivial').stdout.trim();
  factory('criteria', id, 'add', 'works');
  factory('criteria', id, 'done', '1', 'shown');
  assert.equal(factory('check', id, 'unit').status, 0);
  assert.equal(factory('check', id, 'integrity').status, 0);
  const ready = (label) => {
    const run = factory('gate', id);
    assert.equal(run.status, 0, `${label}: ${run.stdout}${run.stderr}`);
    assert.match(run.stdout, /GATE: READY/, label);
  };
  const blocked = (label, problem) => {
    const run = factory('gate', id);
    assert.equal(run.status, 1, `${label}: ${run.stdout}${run.stderr}`);
    assert.match(run.stdout, /GATE: NOT READY/, label);
    assert.match(run.stdout, problem, label);
  };
  ready('a trivial task with no review is ready');
  assert.equal(factory('review', id, 'code', 'CHANGES', 'needs work').status, 0);
  blocked('CHANGES blocks a trivial task', /latest code review is CHANGES/);
  assert.equal(factory('review', id, 'code', 'APPROVE', 'fixed').status, 0);
  ready('a later APPROVE clears it');
  assert.equal(factory('review', id, 'code', 'REJECT', 'wrong approach').status, 0);
  blocked('REJECT blocks a trivial task', /latest code review is REJECT/);
  assert.equal(factory('review', id, 'code', 'APPROVE', 'redone').status, 0);
  assert.equal(factory('review', id, 'plan', 'REJECT', 'a plan review is not a code review').status, 0);
  ready('a plan review never counts, even after an APPROVE');
  // A stale APPROVE stays fine for a trivial task: pinned on purpose. Only a recorded CHANGES or REJECT blocks it.
  writeFileSync(join(repo, 'a.txt'), 'trivial change'); git('commit', '-qam', 'change after the review');
  assert.equal(factory('check', id, 'unit').status, 0);
  assert.equal(factory('check', id, 'integrity').status, 0);
  const lastCodeReview = JSON.parse(factory('show', id).stdout).reviews.findLast((entry) => entry.mode === 'code');
  assert.notEqual(lastCodeReview.sha, git('rev-parse', 'HEAD').trim(), 'the APPROVE must be stale for this check to mean anything');
  ready('a stale APPROVE is allowed for a trivial task');
  // The same task, not trivial, still gets the stale-review problem with the same text as before.
  assert.equal(factory('set', id, 'trivial', 'false').status, 0);
  blocked('a stale APPROVE blocks a task that is not trivial', /code review is stale: code changed after the review/);
});
