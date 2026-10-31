// End-to-end test of the task ledger gates inside a throwaway git repo.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { before, test } from 'node:test';
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
  assert.equal(factory('check', id, 'integrity', '--', 'node -e "0"').status, 0);
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
  factory('check', id, 'integrity', '--', 'node -e "0"');
  factory('review', id, 'code', 'APPROVE', 'ok');
  git('commit', '-q', '--allow-empty', '-m', 'noop');
  mkdirSync(join(repo, '.factory'), { recursive: true });
  writeFileSync(join(repo, '.factory', 'ledger.jsonl'), '{"id":"x","outcome":"approved","minutes":1,"interventions":0,"repairAttempts":0}\n');
  git('add', '-A'); git('commit', '-qm', 'only factory files');
  assert.doesNotMatch(factory('gate', id).stdout, /stale/);
  // but a change to the check definitions is real code: evidence goes stale
  writeFileSync(join(repo, '.factory', 'config.json'), JSON.stringify({ verify: { required: ['unit'], checks: { unit: 'node -e "process.exit(0)"', extra: 'true', bad: 'node -e "process.exit(1)"' } } }));
  git('add', '-A'); git('commit', '-qm', 'change check config');
  assert.match(factory('gate', id).stdout, /stale/);
});
test('integrity scans only the task own changes, and catches a skipped test', () => {
  const id = factory('status').stdout.match(/T-\d+-first-thing/)[0];
  const integrity = `node ${cli} integrity`;
  writeFileSync(join(repo, 'old.test.js'), 'it.skip("x", () => {})\n'); git('add', '-A'); git('commit', '-qm', 'pre-existing skip');
  const task = JSON.parse(execFileSync('node', [cli, 'show', id], { cwd: repo, encoding: 'utf8' }));
  assert.equal(factory('check', id, 'integrity', '--', integrity).status, 1, 'baseSha predates the skip, so it is found');
  factory('set', id, 'baseSha', git('rev-parse', 'HEAD').trim());
  assert.equal(factory('check', id, 'integrity', '--', integrity).status, 0, 'a skip from before the task is not blamed on it');
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
