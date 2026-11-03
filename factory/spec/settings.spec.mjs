// The allow list must stay exact: every check this project runs is covered, and no wide glob lets a stray command through.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const settings = readJson('.claude/settings.json');
const template = readJson('factory/settings.template.json');
const config = readJson('.factory/config.json');

// A tiny matcher for the rules written as Bash(<pattern>). "*" matches any characters.
// The pattern is anchored at the start; a pattern without "*" must match the whole command.
const bashPatterns = (rules) => rules.map((rule) => /^Bash\((.*)\)$/s.exec(rule)?.[1]).filter((pattern) => pattern !== undefined);
const matches = (pattern, command) => new RegExp(`^${pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\S]*')}$`).test(command);
const allowed = (rules, command) => bashPatterns(rules).some((pattern) => matches(pattern, command));

test('the matcher: a pattern without a star matches the whole command only', () => {
  assert.equal(matches('npm run e2e', 'npm run e2e'), true);
  assert.equal(matches('npm run e2e', 'npm run e2e --headed'), false);
  assert.equal(matches('npm run e2e *', 'npm run e2e --headed'), true);
  assert.equal(matches('npm run lint*', 'npm run lint:fix'), true);
  assert.equal(matches('npm run lint*', 'npx npm run lint'), false, 'anchored at the start');
  assert.equal(matches('node --test*', 'node --test factory/spec/*.spec.mjs'), true);
  assert.equal(matches('git add*', 'git add (x)'), true, 'regex characters in a pattern are plain text');
});

test('every check and the preview command are covered by an allow rule in .claude/settings.json', () => {
  const commands = [...Object.values(config.verify.checks), config.preview.command];
  assert.ok(commands.length >= 8, 'the config lists its checks');
  for (const command of commands) assert.ok(allowed(settings.permissions.allow, command), `no allow rule covers: ${command}`);
});

test('stray commands are not covered by .claude/settings.json', () => {
  for (const command of ['npm run deploy', 'npm run publish-site', 'node tools/other.mjs', 'node factory/hooks/guard.mjs', 'node factory/bin/../../evil.mjs', 'npx playwright codegen', 'npx playwright show-report'])
    assert.equal(allowed(settings.permissions.allow, command), false, command);
});

for (const [file, rules] of [['.claude/settings.json', settings.permissions.allow], ['factory/settings.template.json', template.permissions.allow]]) {
  test(`${file}: no blanket npm run rule`, () => {
    const blanket = rules.filter((rule) => /^Bash\(npm(?: run)?(?: \*|:\*|\*)?\)$/.test(rule));
    assert.deepEqual(blanket, [], `${file} lets every npm script run without asking`);
  });
  test(`${file}: node rules name one script, never a folder`, () => {
    // "node factory/*" or "node tools/*" would run any file in the folder. A rule must name the .mjs file before its first "*".
    const wide = bashPatterns(rules).filter((pattern) => /^node (factory|tools)\//.test(pattern) && !pattern.split('*')[0].endsWith('.mjs'));
    assert.deepEqual(wide, [], `${file} has a node rule that covers a whole folder`);
  });
}
