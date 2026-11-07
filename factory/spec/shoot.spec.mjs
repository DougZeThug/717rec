import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { hostBlocked } from '../bin/lib.mjs';

const shoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'shoot.mjs');

test('shoot refuses to run with an empty preview.blockedHosts', () => {
  const repo = mkdtempSync(join(tmpdir(), 'shoot-'));
  try {
    mkdirSync(join(repo, '.factory'));
    for (const preview of [{ blockedHosts: [] }, {}]) {
      writeFileSync(join(repo, '.factory', 'config.json'), JSON.stringify({ preview }));
      const run = spawnSync('node', [shoot, '--out', join(repo, 'out')], { cwd: repo, encoding: 'utf8' });
      assert.equal(run.status, 2, run.stderr);
      assert.match(run.stderr, /blockedHosts/);
      // Nothing below the guard ran: no report on stdout and no output folder (it is made as soon as the browser is up).
      assert.equal(run.stdout, '');
      assert.equal(existsSync(join(repo, 'out')), false);
    }
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('hostBlocked matches host suffixes and treats a bad URL as blocked', () => {
  const list = ['supabase.co'];
  assert.equal(hostBlocked('https://abc.supabase.co/rest/v1/x', list), true);
  assert.equal(hostBlocked('http://127.0.0.1:8080/app.js', list), false);
  assert.equal(hostBlocked('data:text/plain,hi', list), false);
  assert.equal(hostBlocked('not a url', list), true);
});
