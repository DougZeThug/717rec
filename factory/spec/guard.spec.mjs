import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, scanDiff } from '../bin/lib.mjs';
import { decide } from '../hooks/guard.mjs';

const factoryDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = { ...DEFAULT_CONFIG, protectedPaths: ['.env', '.env.*', 'src/integrations/supabase/types.ts', 'public/'], appendOnlyPaths: ['supabase/migrations/'], blockedCommands: [{ pattern: 'supabase\\.co/rest', reason: 'live api' }] };
const bash = (command, branch = 'factory/x') => decide({ tool_name: 'Bash', tool_input: { command } }, cfg, branch);
const edit = (file_path, extra = {}) => decide({ tool_name: 'Edit', tool_input: { file_path, ...extra } }, cfg, 'factory/x');

test('allows ordinary development commands', () => {
  for (const command of ['npm run test:file -- a.test.ts', 'git commit -m x', 'git push -u origin factory/x', 'git push -u origin claude/abc', 'git status', 'rm -rf dist', 'git push --force-with-lease origin factory/x'])
    assert.equal(bash(command), null, command);
});
test('blocks pushes and commits that touch main', () => {
  for (const command of ['git push origin main', 'git push -u origin HEAD:main', 'git push origin +main', 'git push origin refs/heads/main']) assert.ok(bash(command)?.block, command);
  assert.ok(bash('git push', 'main')?.block);
  assert.ok(bash('git commit -m x', 'main')?.block);
});
test('blocks merge, deploy, migration and live-API commands', () => {
  for (const command of ['gh pr merge 5 --squash', 'npx wrangler deploy', 'supabase db push', 'supabase migration up --linked', 'npm publish', 'psql postgres://x.supabase.co/db', 'curl -X POST https://a.supabase.co/rest/v1/matches', 'git push --force origin factory/x', 'git commit --no-verify -m x', 'git push origin --all', 'git push --mirror origin', 'git push --prune origin'])
    assert.ok(bash(command)?.block, command);
});
test('does not misread heredoc bodies or quoted text as commands', () => {
  assert.equal(bash("cat > x.mjs <<'EOF'\nprotectedPaths: ['.env', '.env.*']\nrm public/a\nEOF"), null);
  assert.equal(bash('git commit -m "docs: rm public note > .env"'), null);
});
test('a blocked command cannot hide next to or inside a heredoc', () => {
  assert.ok(bash('cat <<EOF && git push -f origin feat\nx\nEOF')?.block);
  assert.ok(bash('bash <<EOF\ngh pr merge 5\nEOF')?.block);
  assert.ok(bash('cat <<EOF\nx\nEOF\ngit push origin main')?.block);
});
test('a write into a protected path on the heredoc opener line is blocked', () => {
  assert.ok(bash('cat <<EOF > public/a.txt\nhello\nEOF')?.block);
  assert.equal(bash('cat <<EOF > notes.txt\nrm public/a.txt\nEOF'), null);
});
test('blocks deleting protected assets', () => {
  assert.ok(bash('rm -rf public/images')?.block);
  assert.ok(bash('git rm supabase/migrations/2026_a.sql')?.block);
  assert.ok(bash('echo x > .env')?.block);
});
test('quoted paths are still protected, quoted prose is not', () => {
  assert.ok(bash('rm -rf "public/images"')?.block);
  assert.ok(bash("rm -rf 'public/images'")?.block);
  assert.ok(bash('echo x > ".env"')?.block);
  assert.ok(bash('rm "public/my file.png"')?.block);
  assert.equal(bash('git commit -m "docs: rm public/a note > .env"'), null);
  assert.equal(bash('echo "rm public/a; rm .env" > notes.txt'), null);
});
test('a here-string is not a heredoc', () => {
  assert.ok(bash('cat <<<EOF\nrm -rf public/\nEOF')?.block);
});
test('a directory without a trailing slash, and absolute history paths, are protected', () => {
  assert.ok(bash('rm -rf public')?.block);
  assert.ok(bash('rm -rf ./public/')?.block);
  assert.ok(bash('rm /repo/supabase/migrations/a.sql')?.block);
  assert.ok(bash('rm -rf supabase/migrations')?.block);
  assert.equal(bash('rm -rf publication'), null);
});
test('the guard still blocks when its own path has a space, #, % or non-ASCII', () => {
  const holder = mkdtempSync(join(tmpdir(), 'guard '));
  try {
    for (const name of ['my repo', 'a#b%c', 'café']) {
      const home = join(holder, name);
      mkdirSync(join(home, 'factory'), { recursive: true });
      cpSync(join(factoryDir, 'hooks'), join(home, 'factory', 'hooks'), { recursive: true });
      cpSync(join(factoryDir, 'bin'), join(home, 'factory', 'bin'), { recursive: true });
      const push = ['git', 'push', 'origin', 'main'].join(' ');
      const run = spawnSync('node', [join(home, 'factory', 'hooks', 'guard.mjs')], { cwd: home, encoding: 'utf8', input: JSON.stringify({ tool_name: 'Bash', cwd: home, tool_input: { command: push } }) });
      assert.equal(run.status, 2, `${name}: ${run.stderr}`);
      assert.match(run.stderr, /FACTORY GUARD/);
    }
  } finally {
    rmSync(holder, { recursive: true, force: true });
  }
});
test('edit guard: protected, append-only, control plane, secrets', () => {
  assert.ok(edit('/r/.env')?.block);
  assert.ok(edit('/r/src/integrations/supabase/types.ts')?.block);
  assert.ok(edit('/r/supabase/migrations/old.sql', { __exists: true })?.block);
  assert.equal(edit('/r/supabase/migrations/new.sql', { __exists: false }), null);
  assert.ok(edit('/r/.claude/settings.json')?.ask);
  assert.ok(edit('/r/src/a.ts', { content: 'const k = "sk-ant-api03-abcdefghijklmnopqrstuvwx"' })?.block);
  assert.equal(edit('/r/src/a.ts', { content: 'ok' }), null);
});
test('integrity scan sees assertions removed by deleting a test file', () => {
  const diff = ['--- a/src/a.test.ts', '+++ /dev/null', '-  expect(a).toBe(1);'].join('\n');
  assert.equal(scanDiff(diff).length, 1);
});
test('integrity scan flags weakened tests', () => {
  const diff = ['+++ b/src/a.test.ts', '-  expect(a).toBe(1);', '-  expect(b).toBe(2);', '+  expect(a).toBe(1);', '+  it.skip("x", () => {})'].join('\n');
  const findings = scanDiff(diff);
  assert.equal(findings.length, 2);
  assert.deepEqual(scanDiff('+++ b/src/a.ts\n+const x = 1;'), []);
});
