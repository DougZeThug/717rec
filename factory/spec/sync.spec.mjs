// The Codex agent generator must reject a sandbox value it does not understand.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const tool = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tools', 'sync-codex-agents.mjs');
const root = mkdtempSync(join(tmpdir(), 'factory-sync-'));
after(() => rmSync(root, { recursive: true, force: true }));

const agent = (sandbox) => `---\nname: x\ndescription: d\ntools: Read, Bash\n${sandbox ? `sandbox: ${sandbox}\n` : ''}---\nbody\n`;
const run = (sandbox) => {
  mkdirSync(join(root, 'tools'), { recursive: true });
  mkdirSync(join(root, '.claude', 'agents'), { recursive: true });
  cpSync(tool, join(root, 'tools', 'sync-codex-agents.mjs'));
  writeFileSync(join(root, '.claude', 'agents', 'x.md'), agent(sandbox));
  return spawnSync('node', [join(root, 'tools', 'sync-codex-agents.mjs')], { encoding: 'utf8' });
};

test('an unknown sandbox value fails loudly', () => {
  const bad = run('read-onyl');
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /sandbox must be "read-only"/);
});
test('read-only and no sandbox key both work', () => {
  assert.equal(run('read-only').status, 0);
  assert.equal(run('').status, 0);
});
