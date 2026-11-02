import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, hostBlocked, scanDiff } from '../bin/lib.mjs';
import { addedLines, decide } from '../hooks/guard.mjs';

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
const push = (rest) => ['git', 'push', rest].join(' ');
test('every git push in a command is checked, quoted names and bare HEAD included', () => {
  assert.ok(bash(`${push('origin feat')} && ${push('origin main')}`)?.block);
  assert.ok(bash(`${push('origin feat')}; ${push('-u origin HEAD:main')}`)?.block);
  assert.ok(bash(push('origin "main"'))?.block);
  assert.ok(bash(push("origin 'main'"))?.block);
  assert.ok(bash(push('origin HEAD'), 'main')?.block);
  assert.equal(bash(push('origin HEAD'), 'factory/x'), null);
  assert.equal(bash(`${push('origin feat')} && ${push('origin feat2')}`), null);
});
test('hard resets, forced cleans and the short hook-skip flag are blocked', () => {
  const gitCmd = (rest) => ['git', rest].join(' ');
  for (const command of [gitCmd('reset --hard HEAD'), gitCmd('reset --hard'), gitCmd('reset --hard origin/main'), gitCmd('clean -df public/'), gitCmd('clean -fd'), gitCmd('clean -f'), gitCmd('clean -xdf'), gitCmd('clean --force -d'), gitCmd('commit -n -m x'), gitCmd('commit -nm x'), gitCmd('commit -anm x'), gitCmd('-c core.hooksPath=/dev/null commit -m x')])
    assert.ok(bash(command)?.block, command);
  for (const command of [gitCmd('reset --soft HEAD~1'), gitCmd('clean -n'), gitCmd('clean -dn'), gitCmd('commit -m "fix -n flag"'), gitCmd('commit --amend -m x'), gitCmd('commit -am x')])
    assert.equal(bash(command), null, command);
});
test('checkout and restore cannot discard protected paths', () => {
  const gitCmd = (rest) => ['git', rest].join(' ');
  for (const command of [gitCmd('checkout -- public/logo.png'), gitCmd('restore public/logo.png'), gitCmd('checkout HEAD -- public'), gitCmd('restore --source=HEAD~1 public/a.png'), gitCmd('checkout .'), gitCmd('restore .')])
    assert.ok(bash(command)?.block, command);
  assert.equal(bash(gitCmd('checkout -b factory/y')), null);
  assert.equal(bash(gitCmd('checkout -- src/a.ts')), null);
  assert.equal(bash(gitCmd('restore --staged .')), null);
});
test('command substitution inside quotes is still inspected', () => {
  assert.ok(bash('echo "$(rm -rf public/image.png)"')?.block);
  assert.ok(bash('echo "`rm -rf public/image.png`"')?.block);
  assert.ok(bash('echo $(rm -rf public/image.png)')?.block);
  assert.ok(bash('echo "a $(echo $(rm .env)) b"')?.block);
  assert.equal(bash("echo '$(rm -rf public/image.png)'"), null, 'single quotes make it inert');
  assert.equal(bash('echo "$(date)"'), null);
});
test('a leading cd gives relative targets their directory; dot targets are blocked', () => {
  assert.ok(bash('cd public && rm -rf .')?.block);
  assert.ok(bash('cd public; rm -rf ./')?.block);
  assert.ok(bash('cd public && rm logo.png')?.block);
  assert.ok(bash('cd src && rm -rf ../public')?.block);
  assert.ok(bash('(cd supabase && rm -r migrations)')?.block);
  assert.ok(bash('cd public/img && rm -rf ..')?.block);
  assert.ok(bash('rm -rf .')?.block);
  assert.ok(bash('rm -rf ..')?.block);
  assert.equal(bash('cd dist && rm -rf .'), null);
  assert.equal(bash('cd src && rm -f a.ts'), null);
  assert.equal(bash('cd src && cd .. && rm -f a.ts'), null);
});
test('the live API is blocked for any curl, and a trailing-dot host is blocked', () => {
  assert.ok(bash('curl -s https://a.supabase.co/functions/v1/pageview')?.block);
  assert.ok(bash('curl --data x https://a.supabase.co/functions/v1/pageview')?.block);
  assert.ok(bash('wget https://a.supabase.co/anything')?.block);
  assert.equal(bash('curl -s http://127.0.0.1:8080/'), null);
});
test('hostBlocked ignores a trailing dot and case', () => {
  assert.equal(hostBlocked('https://a.supabase.co./rest/v1/x', ['supabase.co']), true);
  assert.equal(hostBlocked('https://A.Supabase.CO/rest', ['supabase.co']), true);
  assert.equal(hostBlocked('http://127.0.0.1:8080/', ['supabase.co']), false);
  assert.equal(hostBlocked('not a url', ['supabase.co']), true);
});
test('the secret scan counts only added lines', () => {
  const key = ['sk', 'ant', 'api03', 'abcdefghijklmnopqrstuvwx'].join('-');
  const commit = (diff) => decide({ tool_name: 'Bash', tool_input: { command: 'git commit -m x', __stagedDiff: diff } }, cfg, 'factory/x');
  assert.equal(commit(`-const k = "${key}"\n+const k = process.env.K`), null, 'removing a key is fine');
  assert.equal(commit(` const k = "${key}"\n+const y = 1`), null, 'context lines are not new');
  assert.ok(commit(`+const k = "${key}"`)?.block);
  assert.equal(addedLines('+++ b/a\n+x\n-y\n z'), '+x');
});
test('a commit with -a, or add then commit, is scanned for secrets (real repo)', () => {
  const key = ['sk', 'ant', 'api03', 'abcdefghijklmnopqrstuvwx'].join('-');
  const repo = mkdtempSync(join(tmpdir(), 'guard-repo-'));
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
  const hook = (command) => spawnSync('node', [join(factoryDir, 'hooks', 'guard.mjs')], { cwd: repo, encoding: 'utf8', input: JSON.stringify({ tool_name: 'Bash', cwd: repo, tool_input: { command } }) });
  try {
    git('init', '-q', '-b', 'factory/x'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
    writeFileSync(join(repo, 'a.txt'), 'one\n'); git('add', 'a.txt'); git('commit', '-qm', 'init');
    assert.equal(hook('git commit -m x').status, 0, 'nothing staged');
    writeFileSync(join(repo, 'a.txt'), `one\n${key}\n`);
    assert.equal(hook('git commit -m x').status, 0, 'not staged and no -a: the commit would be empty');
    assert.equal(hook('git commit -am x').status, 2, 'commit -a takes tracked changes');
    writeFileSync(join(repo, 'a.txt'), 'one\n'); writeFileSync(join(repo, 'new.txt'), `${key}\n`);
    assert.equal(hook('git add -A && git commit -m x').status, 2, 'add then commit takes new files');
    git('add', 'new.txt');
    assert.equal(hook('git commit -m x').status, 2, 'staged file');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
test('integrity scan sees assertions removed by deleting a test file', () => {
  const diff = ['--- a/src/a.test.ts', '+++ /dev/null', '-  expect(a).toBe(1);'].join('\n');
  assert.equal(scanDiff(diff).length, 1);
});
test('integrity scan flags weakened tests', () => {
  const diff = ['+++ b/src/a.test.ts', '-  expect(a).toBe(1);', '-  expect(b).toBe(2);', '+  expect(a).toBe(1);', `+  ${['it', 'skip'].join('.')}("x", () => {})`].join('\n');
  const findings = scanDiff(diff);
  assert.equal(findings.length, 2);
  assert.deepEqual(scanDiff('+++ b/src/a.ts\n+const x = 1;'), []);
});
