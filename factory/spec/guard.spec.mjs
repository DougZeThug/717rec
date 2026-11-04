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
// The shell does not always join a backslash-newline pair. A comment ends at the newline. A quoted heredoc keeps the pair as plain text.
// So the guard checks the text before the join and after it. Lines are joined with '\n' so that a line may end in a backslash.
test('the guard checks the written text and the joined text, so a join cannot hide a command in either reading', () => {
  const rm = 'rm -rf public';
  assert.ok(bash(['echo hi # note\\', rm].join('\n'))?.block, 'a comment that ends in a backslash ends at the newline');
  assert.ok(bash(["cat <<'EOF'", 'foo\\', 'EOF', rm, 'EOF'].join('\n'))?.block, 'a quoted heredoc ends at its first EOF, and the line after it is a command');
  assert.ok(bash(['git push origin ma\\', 'in'].join('\n'))?.block, 'a split branch name is still joined and blocked');
  assert.ok(bash(['rm -rf pub\\', 'lic'].join('\n'))?.block, 'a split protected path is still joined and blocked');
  assert.ok(bash(['echo a', '\\\\', '\n', rm].join(''))?.block, 'an even run of backslashes is still not a join');
  assert.equal(bash(['echo a \\', 'b'].join('\n')), null, 'a harmless line join stays allowed');
});
test('a block found in either text wins over an ask found in the other', () => {
  const ctl = 'echo x > .claude/settings.json';
  const rm = 'rm -rf public';
  const before = bash(['echo hi # note\\', rm, 'echo x > .claude/set\\', 'tings.json'].join('\n'));
  assert.ok(before?.block, 'a block in the text before the join, an ask only in the joined text');
  assert.equal(before.ask, undefined);
  const after = bash([ctl, 'git push origin ma\\', 'in'].join('\n'));
  assert.ok(after?.block, 'an ask in the text before the join, a block only in the joined text');
  assert.equal(after.ask, undefined);
  const kept = bash(["cat <<'EOF'", 'foo\\', 'EOF', ctl, 'EOF'].join('\n'));
  assert.ok(kept?.ask, 'an ask found only in the text before the join is kept');
  assert.equal(kept.block, undefined);
});
test('an ask that shows only after the backslash-newline join is kept', () => {
  // Written, the target is `.claude/set\` and the next line is `tings.json`: no control file. Joined, it is `.claude/settings.json`.
  for (const command of [['echo x > .claude/set\\', 'tings.json'].join('\n'), ['cp x factory/hoo\\', 'ks/guard.mjs'].join('\n')]) {
    const decision = bash(command);
    assert.ok(decision?.ask, `${JSON.stringify(command)} should ask`);
    assert.equal(decision.block, undefined, `${JSON.stringify(command)} should ask, not block`);
  }
});
// String.raw keeps the backslashes exactly as the shell would read them. Each command below is real shell text.
test('an escaped quote does not open a quoted string that hides a command', () => {
  assert.ok(bash(String.raw`echo \"; rm -rf public; echo \"`)?.block, 'escaped double quotes');
  assert.ok(bash(String.raw`echo \'; rm -rf public; echo \'`)?.block, 'escaped single quotes');
  assert.ok(bash(String.raw`echo "\""; rm -rf public; echo "\""`)?.block, 'escaped quote inside double quotes');
  assert.ok(bash(String.raw`echo $'\''; rm -rf public; echo $'\''`)?.block, 'ANSI-C quote that holds an escaped quote');
});
test('command substitution is found after an escaped quote, an ANSI-C quote or an apostrophe in double quotes', () => {
  assert.ok(bash(String.raw`echo $'\'' "$(rm -rf public)"`)?.block, 'ANSI-C quote, then a substitution');
  assert.ok(bash(String.raw`echo $'a\'b' $(rm -rf public)`)?.block, 'ANSI-C quote with text around the escaped quote');
  assert.ok(bash(String.raw`echo "it's" "$(rm -rf public)"`)?.block, 'an apostrophe inside double quotes does not make the rest inert');
  assert.ok(bash(String.raw`echo "it's" "$(echo $(rm .env))"`)?.block, 'nested substitution after an apostrophe');
  assert.equal(bash(String.raw`echo '$(rm -rf public)' $'$(rm -rf public)'`), null, 'single and ANSI-C quotes still make it inert');
});
test('a closing paren inside quotes does not end a substitution early and hide the next one', () => {
  // The paren count does not know about quotes, so the first body ends early. The text after it must still be read in the right quote state.
  assert.ok(bash(String.raw`echo $(grep ')' f) "$(rm -rf public)"`)?.block, 'a quoted paren, then a second substitution');
  assert.ok(bash(String.raw`echo $(grep ")" f) "$(rm -rf public)"`)?.block, 'the same with double quotes');
  assert.equal(bash(String.raw`echo $(grep ')' f) '$(rm -rf public)'`), null, 'a later substitution in single quotes is still inert');
});
// A deep nest of substitutions must not make the guard slow. Each distinct body is checked once, not once per way to reach it.
// The bound is generous on purpose: the check takes a few milliseconds, and a slow machine still has a wide margin.
const nested = (depth, inner) => `echo ${'$('.repeat(depth)}${inner}${')'.repeat(depth)}`;
test('deeply nested substitutions are checked fast', () => {
  const depth = 60;
  const started = performance.now();
  assert.equal(bash(nested(depth, 'echo hi')), null, 'a harmless nest is allowed');
  assert.ok(bash(nested(depth, 'rm -rf public'))?.block, 'a delete at the bottom of the nest is blocked');
  assert.ok(bash(nested(depth, 'echo x > .claude/settings.json'))?.ask, 'a control-file write at the bottom of the nest asks');
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 3000, `three commands nested ${depth} deep took ${Math.round(elapsed)} ms`);
});
test('a nested attack is still found at a shallow depth and after a quoted paren', () => {
  assert.ok(bash(nested(3, 'rm -rf public'))?.block, 'three deep, delete');
  assert.ok(bash(nested(3, 'echo x > .claude/settings.json'))?.ask, 'three deep, control-file write');
  assert.ok(bash(nested(8, 'rm -rf public'))?.block, 'eight deep, past the depth limit of the second look');
  assert.ok(bash(String.raw`echo $(grep ')' f) "$(echo $(rm -rf public))"`)?.block, 'a quoted paren, then a nested substitution');
});
// ---- A fail-closed cap on deep or wide nesting. Past 64 levels of parens, or past 300 `$(`, the command is blocked unread. ----
// The checks cost more with every level and every sibling. A very deep or very wide command could run the hook past its time limit,
// and nobody knows what a timeout does. So the guard refuses such a command with a plain reason.
const BT = '`';
const NEST_REASON = /nests substitutions too deeply/;
const siblings = (count) => Array.from({ length: count }, (_, at) => `$(echo ${at})`).join(' ');
// `levels` deep, and each level also holds `width` substitutions of its own.
const wide = (levels, width) => (levels === 0 ? 'echo hi' : `echo ${siblings(width)} $(${wide(levels - 1, width)})`);
const timed = (command) => {
  const started = performance.now();
  const decision = bash(command);
  return { decision, elapsed: Math.round(performance.now() - started) };
};
test('a nest of 64 is allowed and a nest of 65 is blocked with a plain reason', () => {
  assert.equal(bash(nested(64, 'echo hi')), null, 'depth 64 is allowed');
  const decision = bash(nested(65, 'echo hi'));
  assert.ok(decision?.block, 'depth 65 is blocked');
  assert.match(decision.block, NEST_REASON);
  assert.match(decision.block, /Split it into smaller commands/);
});
test('a very deep nest is blocked at once instead of being checked slowly', () => {
  const { decision, elapsed } = timed(nested(400, 'echo hi'));
  assert.ok(decision?.block, 'depth 400 is blocked');
  assert.match(decision.block, NEST_REASON);
  // Without the cap this command takes about 2 s. The block plus this bound prove the cap runs first.
  assert.ok(elapsed < 500, `took ${elapsed} ms`);
});
test('many substitutions are blocked at once, even when no level is deeper than 64', () => {
  // 64 levels with 10 siblings each: 704 `$(` in all, and the deepest paren is level 64. The count rule blocks it, not the depth rule.
  const { decision, elapsed } = timed(wide(64, 10));
  assert.ok(decision?.block, '64 levels with 10 siblings each is blocked');
  assert.match(decision.block, NEST_REASON);
  assert.ok(elapsed < 500, `took ${elapsed} ms`);
  assert.equal(bash(`echo ${siblings(300)}`), null, '300 side by side are allowed');
  assert.match(bash(`echo ${siblings(301)}`)?.block ?? '', NEST_REASON, '301 side by side are blocked');
});
test('a line continuation cannot hide a wide nest from the count', () => {
  // The shell joins a dollar sign, a backslash, a newline and an open paren into `$(`. The count must read the joined text as well.
  const hidden = '$\\\n(echo hi)';
  const decision = bash(`echo ${Array.from({ length: 301 }, () => hidden).join(' ')}`);
  assert.ok(decision?.block, '301 hidden substitutions are blocked');
  assert.match(decision.block, NEST_REASON);
});
test('the cap does not hide a real finding: a protected delete at depth 60 is blocked for the right reason', () => {
  const decision = bash(nested(60, ['rm', '-rf', 'public'].join(' ')));
  assert.ok(decision?.block, 'the delete is blocked');
  assert.match(decision.block, /is protected/);
  assert.doesNotMatch(decision.block, NEST_REASON);
});
test('ordinary parentheses are not a nest', () => {
  assert.equal(bash('git commit -m "fix (a) and (b) (see (c))"'), null, 'parentheses in a commit message');
  assert.equal(bash('echo $(( 1 + 2 ))'), null, 'arithmetic');
});
// Two pins on the memory of bodies already checked (firstVisit). Each fails if that memory is changed the wrong way.
test('a body first seen where the depth limit stops the look is still checked where it is shallow', () => {
  // The body `echo $(rm .env) tail` is met twice: deep inside the quoted nest, where the depth limit hides its inner `$( )`,
  // and again as a top-level backtick. The memory must key on the depth too. Keyed on the body alone, the deep visit
  // would mark it as seen and the shallow visit would be skipped, so the delete would be allowed.
  const body = `echo $(${['rm', '.env'].join(' ')}) tail`;
  const command = `"echo $(echo $(echo $(${BT}${body}${BT}) tail) tail) tail" ; ${BT}${body}${BT}`;
  assert.ok(bash(command)?.block, 'the delete in the shallow visit is found');
});
test('one harmless command nested 64 deep is checked in well under a second', () => {
  // Without the memory this takes about 4.5 s. With it, a few milliseconds.
  const { decision, elapsed } = timed(nested(64, 'echo hi'));
  assert.equal(decision, null, 'a harmless nest of 64 is allowed');
  assert.ok(elapsed < 500, `took ${elapsed} ms`);
});
test('escape handling keeps working for the allowed and the already-blocked forms', () => {
  // Built by concatenation: a String.raw literal cannot end in a backslash. Shell text: echo \\"; rm -rf public; echo "
  assert.equal(bash(['echo \\\\', '"; rm -rf public; echo "'].join('')), null, 'an escaped backslash, then a real quoted string: inert');
  assert.ok(bash(['echo "x\\\\', '"; rm -rf public'].join(''))?.block, 'the quote after an escaped backslash closes the string');
  assert.equal(bash(String.raw`git commit -m "docs: say \"rm public\" and > .env"`), null, 'quoted prose with escaped quotes');
  assert.equal(bash(String.raw`echo "a \$(rm -rf public) b"`), null, 'an escaped dollar sign runs nothing');
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
test('quote marks inside a branch name do not hide a push to a protected branch', () => {
  // The shell removes the quote marks and reads each of these as the word main.
  for (const name of ['ma""in', "ma''in", 'm"a"in', 'm\'a\'i"n"', '"ma"in', "ma'in'", '+ma""in', 'HEAD:ma""in', 'refs/heads/m"a"in']) assert.ok(bash(push(`origin ${name}`))?.block, push(`origin ${name}`));
  assert.equal(bash(push('origin fe""at')), null, 'quote marks inside a feature branch name stay allowed');
  assert.equal(bash(push('origin "fe"at')), null);
});
test('a force flag cannot hide in a short flag group or a plus-prefixed ref', () => {
  for (const rest of ['-fu origin factory/x', '-uf origin factory/x', 'origin factory/x -fu', 'origin +factory/x', 'origin "+factory/x"']) {
    const decision = bash(push(rest));
    assert.ok(decision?.block, push(rest));
    assert.match(decision.block, /--force-with-lease/, `${push(rest)}: the reason says what to do instead`);
  }
});
test('the force-flag check stays fast on a very long flag word', () => {
  // A flag word of many f letters that ends in a character no flag may hold. A backtracking pattern takes a long time on it.
  const long = 'f'.repeat(50000);
  const started = performance.now();
  bash(push(`-${long}! origin factory/x`));
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 500, `took ${Math.round(elapsed)} ms`);
  assert.ok(bash(push(`-${long} origin factory/x`))?.block, 'a long group of only f letters is still a force flag');
});
test('safe push forms stay allowed next to the force rules', () => {
  const allowed = [push('-u origin factory/x'), push('--force-with-lease -u origin factory/x'), `${push('origin factory/x')} && rm -rf dist`, push('--follow-tags origin factory/x'), push('--set-upstream origin factory/x'), push('-o ci.skip origin factory/x')];
  for (const command of allowed) assert.equal(bash(command), null, command);
});
// ---- A push to a protected branch inside a construct, or with a redirect glued to the last word ----
// The shell reads a closing paren, a backtick or a redirect as its own token. The push check must not see it glued to a name.
// Each helper returns the labels that were NOT blocked, so one failing run lists every form that got through.
const notBlocked = (cases, branch = 'factory/x') => Object.entries(cases).filter(([, command]) => !bash(command, branch)?.block).map(([label]) => label);
const notAllowed = (cases, branch = 'factory/x') => Object.entries(cases).filter(([, command]) => bash(command, branch) !== null).map(([label]) => label);
test('a push to a protected branch is blocked inside a substitution, a subshell or a process substitution', () => {
  const main = push('origin main');
  assert.deepEqual(notBlocked({
    'dollar-paren': `echo $(${main})`,
    backticks: `echo ${BT}${main}${BT}`,
    'process substitution in': `cat <(${main})`,
    'process substitution out': `tee >(${main})`,
    'subshell with no space': `(${main})`,
    'inside double quotes': `echo "$(${main})"`,
    'two substitutions deep': `echo $(echo $(${main}))`,
    'single-quoted name': `echo $(${push("origin 'main'")})`,
    'double-quoted name inside double quotes': `echo "$(${push('origin "main"')})"`,
    'text glued after the paren': `echo $(${main})x`,
    'redirect glued after the paren': `(${main})2>&1`,
    'redirect after the paren': `(${main}) 2>&1`,
    'two substitutions side by side': `echo $(${main})$(date)`,
    'text glued after the backtick': `echo ${BT}${main}${BT}x`,
    'parameter default': `echo \${x:-$(${main})}`,
    'array index': `a[$(${main})]=1`,
    'full ref name': `echo $(${push('origin HEAD:refs/heads/main')})`,
  }), []);
});
test('a push to a protected branch is blocked with a redirect glued to it', () => {
  assert.deepEqual(notBlocked({
    'redirect glued to the name': `${push('origin main')}>/dev/null`,
    'redirect after a space': `${push('origin main')} >log.txt`,
    'error redirect': `${push('origin main')} 2>/dev/null`,
    'comment after the name': `${push('origin main')} #note`,
    'tab between the words': ['git', 'push', 'origin', 'main'].join('\t'),
    'a second ref after the name': push('origin main extra'),
  }), []);
});
test('a bare push or a HEAD push on a protected branch is blocked inside a construct or beside a redirect', () => {
  assert.deepEqual(notBlocked({
    'HEAD in a substitution': `echo $(${push('origin HEAD')})`,
    'bare push in a substitution': `echo $(${['git', 'push'].join(' ')})`,
    'bare push, error redirect': push('2>/dev/null'),
    'bare push, flag and error redirect': push('-q 2>/dev/null'),
    'remote only, error redirect': push('origin 2>/dev/null'),
    'HEAD, error redirect': push('origin HEAD 2>/dev/null'),
    'bare push, file redirect': push('>log.txt'),
  }, 'main'), []);
});
test('a closing paren inside quotes does not hide a protected branch after it', () => {
  assert.ok(bash(push('origin "x)" main'))?.block);
  assert.ok(bash(push("origin 'x)' main"))?.block);
});
// Only a number written right before a redirect sign (2>/dev/null) is a file descriptor. A remote named with digits is a word of its own,
// and a filter that dropped every all-digit word would hide the branch after it.
test('a remote named with digits does not hide a protected branch after it', () => {
  assert.ok(bash(push('1 main'))?.block);
  assert.ok(bash(push('-u 2 main'))?.block);
  assert.ok(bash(`echo $(${push('3 main')})`)?.block);
});
test('safe pushes stay allowed inside constructs and beside redirects', () => {
  assert.deepEqual(notAllowed({
    'feature branch in a substitution': `echo $(${push('origin factory/x')})`,
    'plain feature push': push('-u origin factory/x'),
    'merged error output': `${push('-u origin factory/x')} 2>&1`,
    'output to a file': `${push('-u origin factory/x')} > out.txt`,
    'output to a file named like main.log': `${push('-u origin factory/x')} > main.log`,
    'inside an if': `if ${push('origin factory/x')}; then echo ok; fi`,
    'commit message with parens and a redirect sign, then a push': `git commit -m "fix (a) > b" && ${push('origin factory/x')}`,
    'commit message with a closing paren and a redirect sign, then a push': `git commit -m "x) > y" && ${push('-u origin factory/x')}`,
    'HEAD in a substitution, off the protected branch': `echo $(${push('origin HEAD')})`,
  }), []);
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

// ---- a shell write into the factory's own control files asks the human. Reads stay silent. A block still wins. ----
const gitLine = (rest) => ['git', rest].join(' ');
const GUARD_FILE = 'factory/hooks/guard.mjs';
const asks = (command) => {
  const decision = bash(command);
  assert.ok(decision?.ask, `${JSON.stringify(command)} should ask`);
  assert.equal(decision.block, undefined, `${JSON.stringify(command)} should ask, not block`);
};
const stays = (command) => assert.equal(bash(command), null, `${JSON.stringify(command)} should stay silent`);

test('part A: redirects, tee, sed -i, cp, mv, install, ln, rsync, dd, truncate, rm, curl and wget that write a control file ask', () => {
  for (const command of [
    'echo x > .claude/settings.json', 'echo x >> .claude/settings.json', 'echo x &> .claude/settings.json', 'echo x >| .claude/settings.json', 'echo x 2> .claude/settings.json',
    'echo x > .claude/settings.local.json', 'echo x > .factory/config.json', 'echo x > factory/bin/lib.mjs', `echo x > ${GUARD_FILE}`,
    'cat <<EOF > .claude/settings.json\n{}\nEOF',
    'echo x | tee -a .claude/settings.json', `echo x | tee ${GUARD_FILE}`,
    "sed -i 's/a/b/' .claude/settings.json", 'sed -i.bak s/a/b/ .claude/settings.json', 'sed -ni s/a/b/p .claude/settings.json', 'sed --in-place s/a/b/ .claude/settings.json', 'perl -pi s/a/b/ .claude/settings.json',
    `cp x ${GUARD_FILE}`, `mv x ${GUARD_FILE}`, `install -m 644 x ${GUARD_FILE}`, `ln -sf x ${GUARD_FILE}`, `rsync -a x ${GUARD_FILE}`,
    'cp x factory/hooks', 'cp -r x factory/hooks/', 'cp -t factory/hooks x', 'cp --target-directory=factory/hooks x', 'cp --target-directory factory/hooks x', 'install -t factory/hooks x',
    `dd if=x of=${GUARD_FILE}`, `dd if=x of=${GUARD_FILE} bs=1`,
    `truncate -s 0 ${GUARD_FILE}`, `shred -u ${GUARD_FILE}`, `unlink ${GUARD_FILE}`,
    `rm ${GUARD_FILE}`, `rm -f ${GUARD_FILE}`, 'rm -rf .claude', 'rm -rf factory', 'rm -rf factory/', 'rm -rf .factory', 'rm -rf factory/hooks', 'rm -rf factory/bin',
    gitLine(`rm ${GUARD_FILE}`), gitLine(`mv ${GUARD_FILE} x`), gitLine('rm -r factory'),
    `curl -o ${GUARD_FILE} https://example.com/x`, `curl -sSLo ${GUARD_FILE} https://example.com/x`, `curl --output ${GUARD_FILE} https://example.com/x`, `curl --output=${GUARD_FILE} https://example.com/x`,
    `wget -O ${GUARD_FILE} https://example.com/x`, `wget -qO ${GUARD_FILE} https://example.com/x`, `wget --output-document ${GUARD_FILE} https://example.com/x`, `wget --output-document=${GUARD_FILE} https://example.com/x`,
  ]) asks(command);
});
test('part A: a control file is found after cd, in a quoted path, in a group and inside a substitution', () => {
  for (const command of [
    'cd factory/hooks && echo x > guard.mjs', '(cd factory/hooks && echo x > guard.mjs)', 'cd factory; cd hooks; cp x guard.mjs', 'cd factory && rm -rf hooks', 'cd src && echo x > ../.claude/settings.json', 'cd .claude && rm settings.json',
    'echo x > "./.claude/settings.json"', "echo x > './factory/../.claude/settings.json'", 'echo x > ./.claude//settings.json', 'echo ok && echo x > .claude/settings.json && echo done',
    'echo "$(echo x > .claude/settings.json)"', 'echo "`echo x > .claude/settings.json`"', 'echo $(cp x factory/hooks/guard.mjs)', 'echo $(echo $(rm -rf .claude))',
    'cp x factory/hooks/guard.mjs &', '(echo x > .claude/settings.json) 2>&1',
  ]) asks(command);
});
test('part A: the reason names the control file', () => {
  assert.match(bash('echo x > .claude/settings.json').ask, /^"\.claude\/settings\.json" controls the factory's own safety rules\. A human must approve this shell command\.$/);
  assert.match(bash('cd factory/hooks && echo x > guard.mjs').ask, /"factory\/hooks\/guard\.mjs" controls/, 'the path after cd');
});
test('part A: reads and writes outside the control files stay silent', () => {
  for (const command of [
    `git add ${GUARD_FILE}`, gitLine('checkout -b factory/T-1'), gitLine('checkout factory/T-1'), gitLine('diff main...HEAD -- factory/hooks/'), gitLine('diff .claude/settings.json'), gitLine('show HEAD:.claude/settings.json'), gitLine('log -p -- factory/hooks/'),
    'node --test factory/spec/*.spec.mjs', 'node factory/bin/factory.mjs check T-1 unit',
    `cp ${GUARD_FILE} /tmp/x`, 'cp -r factory/hooks /tmp/backup', 'rsync -a factory/hooks/ /tmp/b/', 'cp -t /tmp/b factory/hooks/guard.mjs', 'ln -s factory/hooks/guard.mjs',
    'rm -rf /tmp/w/factory', 'rm -rf .factory/evidence/T-1', 'rm -rf dist', 'rm .claude/../dist/a.txt',
    `cat ${GUARD_FILE}`, 'ls -la factory/hooks .claude', `diff ${GUARD_FILE} /tmp/x`, `sed -n 1,5p ${GUARD_FILE}`, 'grep -n x .claude/settings.json', 'head -3 .claude/settings.json | tee /tmp/h.txt',
    'echo hi > /tmp/out.txt', 'echo hi 2>/dev/null', 'echo hi > /dev/null 2>&1', 'echo x > notes.txt', 'echo x > .claude/agents/new.md', 'echo x > .factory/evidence/T-1/unit.json', 'cd src && echo x > a.txt', 'cd factory/spec && echo x > a.txt',
    `echo "cp x ${GUARD_FILE}" > /tmp/note.txt`, `echo 'rm -rf .claude' && echo ok`, `cat > /tmp/n.md <<EOF\ncp x ${GUARD_FILE}\necho x > .claude/settings.json\nEOF`,
    `curl -o /tmp/x https://example.com/x`, 'wget -O /tmp/x https://example.com/x', 'curl -s http://127.0.0.1:8080/',
    ['git commit -m "$(cat <<\'EOF\'', `Guard: ${GUARD_FILE} now asks`, '', 'Also .claude/settings.json, "cp x factory/hooks/" and node -e in prose.', 'EOF', ')"'].join('\n'),
  ]) stays(command);
});
test('part A: the control list comes from the config, and a folder that holds a control path asks too', () => {
  const wide = { ...cfg, controlPlanePaths: [...cfg.controlPlanePaths, '.github/workflows/'] };
  const run = (command) => decide({ tool_name: 'Bash', tool_input: { command } }, wide, 'factory/x');
  assert.ok(run('echo x > .github/workflows/ci.yml')?.ask);
  assert.ok(run('rm -rf .github')?.ask);
  assert.equal(run('echo x > .github/CODEOWNERS'), null);
  assert.equal(bash('echo x > .github/workflows/ci.yml'), null, 'the plain test config does not list workflows');
});
test('part A: a relative path is read from the directory the command starts in (root passed to decide)', () => {
  const run = (command, cwd, root = '/r') => decide({ tool_name: 'Bash', cwd, tool_input: { command } }, cfg, 'factory/x', root);
  for (const [command, cwd] of [['echo x > guard.mjs', '/r/factory/hooks'], ['echo x > hooks/guard.mjs', '/r/factory'], ['echo x > ../factory/hooks/guard.mjs', '/r/src'], ['echo x > /r/factory/hooks/guard.mjs', '/r'], ['cd .. && echo x > guard.mjs', '/r/factory/hooks/sub'], ['echo x > factory/hooks/guard.mjs', '/r'], ['echo x > factory/hooks/guard.mjs', undefined]])
    assert.ok(run(command, cwd)?.ask, `${command} from ${cwd}`);
  for (const [command, cwd] of [['echo x > guard.mjs', '/r/src'], ['echo x > guard.mjs', '/r'], ['echo x > /other/factory/hooks/guard.mjs', '/r'], ['echo x > ../../factory/hooks/guard.mjs', '/r/src'], ['echo x > guard.mjs', '/elsewhere/factory/hooks'], ['echo x > ~/factory/hooks/guard.mjs', '/r'], ['cd ~/factory/hooks && echo x > guard.mjs', '/r']])
    assert.equal(run(command, cwd), null, `${command} from ${cwd}`);
  assert.equal(decide({ tool_name: 'Bash', cwd: '/r/factory/hooks', tool_input: { command: 'echo x > guard.mjs' } }, cfg, 'factory/x'), null, 'no root: the old three-argument call has no starting directory');
});
test('part A: a block always wins over an ask', () => {
  for (const command of [`echo x > .claude/settings.json && ${push('origin main')}`, `${push('origin main')}; echo x > .claude/settings.json`, 'echo x > .claude/settings.json && rm -rf public', 'cp x .claude/settings.json && echo y > .env']) {
    const decision = bash(command);
    assert.ok(decision?.block, command);
    assert.equal(decision.ask, undefined, command);
  }
});
test('part A: the real hook asks (exit 0, ask on stdout) for a redirect into a control file', () => {
  const root = join(factoryDir, '..');
  const result = spawnGuard({ tool_name: 'Bash', cwd: root, tool_input: { command: `echo x > ${GUARD_FILE}` } }, { cwd: root });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"permissionDecision":"ask"/);
  assert.equal(spawnGuard({ tool_name: 'Bash', cwd: root, tool_input: { command: `cat ${GUARD_FILE}` } }, { cwd: root }).stdout, '', 'a read stays silent');
});

// ---- part B: git checkout -- <path>, git restore, git apply, patch, git am and inline interpreters ----
test('part B: git checkout <ref> -- <path>, git restore, git apply, git am and patch that can rewrite a control file ask', () => {
  for (const command of [
    gitLine('checkout main -- factory'), gitLine('checkout -- .claude/settings.json'), gitLine(`checkout HEAD~1 -- ${GUARD_FILE}`), gitLine('checkout main -- src/a.ts factory/hooks'),
    gitLine('restore .factory/config.json'), gitLine(`restore --source=HEAD~1 ${GUARD_FILE}`), gitLine('restore --worktree --staged .claude/settings.json'), gitLine('restore -s HEAD .claude'),
    gitLine('apply fix.patch'), gitLine('apply --index fix.patch'), gitLine('apply --reverse fix.patch'), gitLine('am 0001.patch'), 'patch -p1 < fix.patch', 'patch -p1 -i fix.patch', 'cd src && git apply ../fix.patch',
  ]) asks(command);
  assert.match(bash(gitLine('apply fix.patch')).ask, /git apply/, 'the reason names the command');
  assert.match(bash(gitLine('am 0001.patch')).ask, /git am/, 'the reason names the command');
  assert.match(bash('patch -p1 < fix.patch').ask, /patch/, 'the reason names the command');
  assert.match(bash(gitLine('checkout main -- factory')).ask, /"factory" controls the factory's own safety rules/, 'the reason names the path');
});
test('part B: python, node, ruby, perl, bash and sh one-liners and heredocs that name a control file ask', () => {
  for (const command of [
    `python3 -c "open('${GUARD_FILE}', 'w').write('x')"`, `python -c "open('${GUARD_FILE}', 'w').write('x')"`, `python3 -c 'import shutil; shutil.rmtree("factory/hooks")'`,
    `node -e "require('fs').writeFileSync('${GUARD_FILE}', 'x')"`, `node -p "require('fs').rmSync('.claude/settings.json')"`, `ruby -e "File.write('${GUARD_FILE}', 'x')"`, `perl -e "unlink '${GUARD_FILE}'"`,
    `bash -c "echo x > ${GUARD_FILE}"`, `sh -c 'cp x factory/hooks/guard.mjs'`, `cd src && node -e "require('fs').rmSync('../.claude/settings.json')"`,
    `bash <<EOF\necho x > ${GUARD_FILE}\nEOF`, `sh <<'EOF'\nrm -f .claude/settings.json\nEOF`, `bash <<-EOF\n\tcp x ${GUARD_FILE}\nEOF`,
  ]) asks(command);
});
test('part B: look-alike commands stay silent', () => {
  for (const command of [
    gitLine('checkout -b factory/T-1'), gitLine('checkout factory/T-1'), gitLine('checkout main'), gitLine('switch main'), gitLine('switch -c factory/T-2'), gitLine('checkout -- src/a.ts'), gitLine('checkout main -- src/a.ts'),
    gitLine('restore --staged .claude/settings.json'), gitLine('restore src/a.ts'), gitLine('restore -s HEAD src/a.ts'),
    gitLine('apply --check fix.patch'), gitLine('apply --stat fix.patch'), gitLine('apply --numstat fix.patch'), gitLine('apply --summary fix.patch'), gitLine('apply --check --verbose fix.patch'),
    'python3 -c "print(1)"', 'node -e "console.log(1)"', 'bash -c "echo hi"', 'bash <<EOF\necho hi\nEOF', `python3 script.py ${GUARD_FILE}`, `node ${GUARD_FILE}`, `node --check ${GUARD_FILE}`, 'python3 -m pytest factory/spec', `bash factory/bin/run.sh .claude/settings.json`,
    `echo "python3 -c ${GUARD_FILE}"`, `echo 'node -e .claude/settings.json'`, `grep -n "node -e" ${GUARD_FILE}`, `cat > /tmp/n.md <<EOF\nnode -e ${GUARD_FILE}\nbash <<X\nEOF`,
    ['git commit -m "$(cat <<\'EOF\'', `fix: python3 -c and node -e now ask when they name ${GUARD_FILE}`, 'EOF', ')"'].join('\n'),
  ]) stays(command);
});
test('part B: a block still wins over an ask', () => {
  for (const command of [`${gitLine('apply fix.patch')} && ${push('origin main')}`, `python3 -c "open('${GUARD_FILE}')" && ${push('origin main')}`, `${gitLine('checkout main -- factory')} && rm -rf public`, `${gitLine('restore .claude/settings.json')}; echo x > .env`]) {
    const decision = bash(command);
    assert.ok(decision?.block, command);
    assert.equal(decision.ask, undefined, command);
  }
});
