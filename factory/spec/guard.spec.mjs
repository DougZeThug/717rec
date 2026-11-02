import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, hostBlocked, scanDiff } from '../bin/lib.mjs';
import { addedLines, decide, hardenConfig } from '../hooks/guard.mjs';

const factoryDir = join(dirname(fileURLToPath(import.meta.url)), '..');
// Built from pieces, so no file in factory/ holds the whole fake key (the guard blocks a Write that does).
const FAKE_KEY = ['sk', 'ant', 'api03', 'abcdefghijklmnopqrstuvwx'].join('-');
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
// A backslash before a newline joins the two lines, so the shell reads one word. Built by concatenation: the test data must stay visible.
const BSNL = '\\\n';
test('a backslash-newline inside a word cannot hide a push to main or a protected path', () => {
  assert.ok(bash(['git push origin ma', 'in'].join(BSNL))?.block, 'mid-word split of the branch name');
  assert.ok(bash(['git push origin ma', 'in'].join('\\\r\n'))?.block, 'Windows line ending');
  assert.ok(bash(['rm -rf pub', 'lic'].join(BSNL))?.block, 'mid-word split of a protected path');
  assert.ok(bash(['echo x > .e', 'nv'].join(BSNL))?.block, 'mid-word split of a redirect target');
  assert.ok(bash(['git re', 'set --hard'].join(BSNL))?.block, 'mid-word split of a command word');
});
test('an escaped backslash before a newline is not a line join: the next line is its own command', () => {
  // `echo a\\` then a newline: the shell sees an escaped backslash, then a real newline, then `rm -rf public`.
  assert.ok(bash(['echo a', '\\\\', '\n', 'rm -rf public'].join(''))?.block, 'even run');
  assert.ok(bash(['echo a', '\\\\\\\\', '\n', 'rm -rf public'].join(''))?.block, 'four backslashes');
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
  assert.ok(edit('/r/src/a.ts', { content: `const k = "${FAKE_KEY}"` })?.block);
  assert.equal(edit('/r/src/a.ts', { content: 'ok' }), null);
});
test('no factory source file holds a whole credential, so the guard lets the factory write its own files', () => {
  const names = ['spec', 'hooks', 'bin'].flatMap((folder) => readdirSync(join(factoryDir, folder)).filter((file) => file.endsWith('.mjs')).map((file) => join(factoryDir, folder, file)));
  assert.ok(names.length >= 8, `expected the factory sources, found ${names.length}`);
  for (const name of names) assert.equal(decide({ tool_name: 'Write', tool_input: { file_path: '/r/src/copy.mjs', content: readFileSync(name, 'utf8') } }, cfg, 'factory/x'), null, name);
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
  const key = FAKE_KEY;
  const commit = (diff) => decide({ tool_name: 'Bash', tool_input: { command: 'git commit -m x', __stagedDiff: diff } }, cfg, 'factory/x');
  assert.equal(commit(`-const k = "${key}"\n+const k = process.env.K`), null, 'removing a key is fine');
  assert.equal(commit(` const k = "${key}"\n+const y = 1`), null, 'context lines are not new');
  assert.ok(commit(`+const k = "${key}"`)?.block);
  assert.equal(addedLines('+++ b/a\n+x\n-y\n z'), '+x');
});
test('a commit with -a, or add then commit, is scanned for secrets (real repo)', () => {
  const key = FAKE_KEY;
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

// ---- fail closed: a broken guard, config, input or git must never read as "allowed" ----
const GUARD = join(factoryDir, 'hooks', 'guard.mjs');
const spawnGuard = (input, { cwd = factoryDir, env = {}, text } = {}) => spawnSync('node', [GUARD], { cwd, encoding: 'utf8', input: text ?? JSON.stringify(input), env: { ...process.env, ...env } });
const withRepo = (config, body) => {
  const repo = mkdtempSync(join(tmpdir(), 'guard-cfg-'));
  try {
    execFileSync('git', ['init', '-q', '-b', 'factory/x'], { cwd: repo });
    if (config !== undefined) {
      mkdirSync(join(repo, '.factory'));
      writeFileSync(join(repo, '.factory', 'config.json'), config);
    }
    body(repo);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
};
const hookIn = (repo, tool_name, tool_input) => spawnGuard({ tool_name, cwd: repo, tool_input }, { cwd: repo });
const askedFor = (result) => JSON.parse(result.stdout).hookSpecificOutput.permissionDecision;

test('a config that cannot be read: Bash exits 2, every edit asks, .env stays blocked', () => {
  withRepo('{ not json', (repo) => {
    const plain = hookIn(repo, 'Edit', { file_path: join(repo, 'public', 'a.png') });
    assert.equal(plain.status, 0, plain.stderr);
    assert.equal(askedFor(plain), 'ask');
    assert.equal(askedFor(hookIn(repo, 'Write', { file_path: join(repo, 'src', 'a.ts'), content: 'ok' })), 'ask');
    for (const tool of ['Edit', 'Write']) {
      const env = hookIn(repo, tool, { file_path: join(repo, '.env'), content: 'x', new_string: 'x' });
      assert.equal(env.status, 2, `${tool} .env: ${env.stderr}`);
      assert.match(env.stderr, /FACTORY GUARD/);
    }
    const shell = hookIn(repo, 'Bash', { command: 'git status' });
    assert.equal(shell.status, 2, 'Bash must not run on a guard that cannot read its config');
    assert.match(shell.stderr, /FACTORY GUARD/);
  });
});
test('a valid but weak config cannot switch the built-in protection off', () => {
  for (const weak of [{ protectedPaths: [], protectedBranches: [], controlPlanePaths: [] }, { protectedPaths: 'public/', protectedBranches: 'none', appendOnlyPaths: 7 }]) {
    withRepo(JSON.stringify(weak), (repo) => {
      const env = hookIn(repo, 'Edit', { file_path: join(repo, '.env'), new_string: 'x' });
      assert.equal(env.status, 2, env.stderr);
      const push = hookIn(repo, 'Bash', { command: ['git', 'push', 'origin', 'main'].join(' ') });
      assert.equal(push.status, 2, push.stderr);
      assert.equal(askedFor(hookIn(repo, 'Edit', { file_path: join(repo, '.claude', 'settings.json'), new_string: 'x' })), 'ask');
      assert.equal(hookIn(repo, 'Bash', { command: 'git status' }).status, 0, 'ordinary commands still run');
    });
  }
});
test('hardenConfig adds the built-in rules to the project rules and drops bad entries', () => {
  const hard = hardenConfig({ protectedPaths: ['public/', 7, '.env'], protectedBranches: ['release'], appendOnlyPaths: 'x', blockedCommands: [{ pattern: 'a', reason: 'b' }] });
  assert.deepEqual(hard.protectedPaths, ['.env', '.env.*', 'public/']);
  assert.deepEqual(hard.protectedBranches, ['main', 'master', 'release']);
  assert.deepEqual(hard.appendOnlyPaths, []);
  assert.ok(hard.controlPlanePaths.includes('factory/hooks/'));
  assert.equal(hard.blockedCommands.length, 1);
});
test('unparsable or empty input exits 2, never 0 or 1', () => {
  for (const text of ['', '   \n', 'not json', '{"tool_name":', 'null', '[]', '"Bash"']) {
    const result = spawnGuard(undefined, { text });
    assert.equal(result.status, 2, `${JSON.stringify(text)} -> ${result.status} ${result.stderr}`);
    assert.match(result.stderr, /FACTORY GUARD/);
  }
});
test('a git failure while scanning a commit exits 2', () => {
  const holder = mkdtempSync(join(tmpdir(), 'guard-nogit-'));
  try {
    const noRepo = { cwd: holder, env: { GIT_DIR: join(holder, 'missing.git') } };
    const commit = spawnGuard({ tool_name: 'Bash', cwd: holder, tool_input: { command: 'git commit -m x' } }, noRepo);
    assert.equal(commit.status, 2, 'git cannot run, so the commit cannot be scanned');
    assert.match(commit.stderr, /FACTORY GUARD/);
    assert.equal(spawnGuard({ tool_name: 'Bash', cwd: holder, tool_input: { command: 'git status' } }, noRepo).status, 0, 'no commit, no scan');
  } finally {
    rmSync(holder, { recursive: true, force: true });
  }
});
// A pin, not a new rule: it passes on the old guard too. Failing closed on `git diff HEAD` must not block the first commit.
test('a repo with no commit yet can make its first commit, and a key in it is still caught', () => {
  withRepo(undefined, (repo) => {
    writeFileSync(join(repo, 'a.txt'), 'one\n');
    assert.equal(hookIn(repo, 'Bash', { command: 'git add -A && git commit -m init' }).status, 0, 'first commit of a fresh repo');
    writeFileSync(join(repo, 'b.txt'), `${FAKE_KEY}\n`);
    assert.equal(hookIn(repo, 'Bash', { command: 'git add -A && git commit -m init' }).status, 2, 'a key in a fresh repo is still caught');
  });
});
test('the hook command in both settings files fails closed when the guard cannot start', () => {
  const command = 'node "$CLAUDE_PROJECT_DIR/factory/hooks/guard.mjs" || exit 2';
  const root = join(factoryDir, '..');
  for (const file of [join(root, '.claude', 'settings.json'), join(factoryDir, 'settings.template.json')]) {
    const hook = JSON.parse(readFileSync(file, 'utf8')).hooks.PreToolUse[0].hooks[0];
    assert.equal(hook.command, command, file);
    const sh = (projectDir, input = '{}') => spawnSync('sh', ['-c', hook.command], { encoding: 'utf8', input, env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir } });
    const home = mkdtempSync(join(tmpdir(), 'guard-start-'));
    try {
      assert.equal(sh(home).status, 2, `${file}: guard file missing`);
      assert.equal(sh('').status, 2, `${file}: project dir unset`);
      mkdirSync(join(home, 'factory', 'hooks'), { recursive: true });
      writeFileSync(join(home, 'factory', 'hooks', 'guard.mjs'), 'export const = ;\n');
      assert.equal(sh(home).status, 2, `${file}: guard file has a syntax error`);
      const push = JSON.stringify({ tool_name: 'Bash', cwd: root, tool_input: { command: ['git', 'push', 'origin', 'main'].join(' ') } });
      assert.equal(sh(root, push).status, 2, `${file}: the real guard still blocks`);
      assert.equal(sh(root, JSON.stringify({ tool_name: 'Bash', cwd: root, tool_input: { command: 'git status' } })).status, 0, `${file}: the real guard still allows`);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  }
});
