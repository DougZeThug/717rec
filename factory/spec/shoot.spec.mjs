import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
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

// Runs a real browser (Chromium through Playwright). Where the installed browser does not match the Playwright
// version, set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, which shoot.mjs reads.
test('a mock init runs in the page before the app code, and nothing runs without one', { timeout: 60_000 }, async () => {
  const repo = mkdtempSync(join(tmpdir(), 'shoot-init-'));
  // The page reports what it found in localStorage by calling a blocked host; the tool records that request's path.
  const page = "<!doctype html><link rel=icon href='data:,'><script>fetch('https://api.blocked.test/seen/' + (localStorage.getItem('fake-session') ?? 'none'))</script>";
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(page);
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const url = `http://127.0.0.1:${server.address().port}`;
  // The server answers in this process, so the tool must run without blocking it (spawn, not spawnSync).
  const run = (args) => new Promise((done) => {
    const child = spawn('node', [shoot, ...args], { cwd: repo });
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (status) => done({ status, stderr }));
  });
  try {
    mkdirSync(join(repo, '.factory'));
    writeFileSync(join(repo, '.factory', 'config.json'), JSON.stringify({ preview: { blockedHosts: ['blocked.test'] } }));
    writeFileSync(join(repo, 'with-init.mjs'), "export default async () => false;\nexport const init = (value) => window.localStorage.setItem('fake-session', value);\nexport const initArg = 'seeded';\n");
    writeFileSync(join(repo, 'no-init.mjs'), 'export default async () => false;\n');
    for (const [mock, seen] of [['with-init.mjs', 'seeded'], ['no-init.mjs', 'none']]) {
      const out = join(repo, `out-${seen}`);
      const result = await run(['--out', out, '--url', url, '--routes', '/', '--mock', join(repo, mock), '--settle', '0']);
      assert.equal(result.status, 0, result.stderr);
      const report = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8'));
      assert.deepEqual(report.blockedRequests, [`GET api.blocked.test/seen/${seen}`]);
    }
  } finally {
    server.close();
    rmSync(repo, { recursive: true, force: true });
  }
});
