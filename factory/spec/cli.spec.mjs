// End-to-end test of the task ledger gates inside a throwaway git repo.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'factory.mjs');
let repo;
const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' });
const f = (...a) => spawnSync('node', [cli, ...a], { cwd: repo, encoding: 'utf8' });

before(() => {
  repo = mkdtempSync(join(tmpdir(), 'factory-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
  mkdirSync(join(repo, '.factory'));
  writeFileSync(join(repo, '.factory', 'config.json'), JSON.stringify({ verify: { required: ['unit'], checks: { unit: 'node -e "process.exit(0)"', bad: 'node -e "process.exit(1)"' } } }));
  writeFileSync(join(repo, 'a.txt'), '1');
  git('add', '-A', ':!.factory'); git('commit', '-qm', 'init');
  git('checkout', '-qb', 'factory/t');
});

test('concurrency ceiling blocks a second feature', () => {
  const a = f('new', 'First thing');
  assert.equal(a.status, 0);
  const b = f('new', 'Second thing');
  assert.equal(b.status, 4);
  assert.match(b.stderr, /ceiling/);
});
test('fix tasks are not limited by the feature ceiling', () => assert.equal(f('new', 'A bug', '--kind', 'fix').status, 0));

test('gate refuses without evidence, passes with fresh evidence and review', () => {
  const id = f('status').stdout.match(/T-\d+-first-thing/)[0];
  assert.equal(f('gate', id).status, 1);
  f('criteria', id, 'add', 'a.txt exists');
  f('criteria', id, 'done', '1', 'ls shows it');
  assert.equal(f('check', id, 'unit').status, 0);
  assert.equal(f('check', id, 'integrity', '--', 'node -e "0"').status, 0);
  f('review', id, 'code', 'APPROVE', 'looks right');
  const ok = f('gate', id);
  assert.equal(ok.status, 0, ok.stdout);
  // changing code after the evidence makes it stale
  writeFileSync(join(repo, 'a.txt'), '2'); git('commit', '-qam', 'change');
  const stale = f('gate', id);
  assert.equal(stale.status, 1);
  assert.match(stale.stdout, /stale/);
});
test('a failing check is recorded as failing', () => {
  const id = f('status').stdout.match(/T-\d+-first-thing/)[0];
  assert.equal(f('check', id, 'bad').status, 1);
  assert.match(f('status').stdout, /failing: bad/);
});
test('repair loop stops at the ceiling and on a repeated fix', () => {
  const id = f('status').stdout.match(/T-\d+-first-thing/)[0];
  for (const s of ['one', 'two', 'three']) assert.equal(f('repair', id, 'k1', s).status, 0);
  const over = f('repair', id, 'k1', 'four');
  assert.equal(over.status, 3);
  assert.match(over.stderr, /ESCALATE/);
  f('repair', id, 'k2', 'same');
  assert.equal(f('repair', id, 'k2', 'same').status, 3);
});
test('close refuses an unready task', () => {
  const id = f('status').stdout.match(/T-\d+-first-thing/)[0];
  assert.notEqual(f('close', id).status, 0);
});
