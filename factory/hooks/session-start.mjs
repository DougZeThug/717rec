// SessionStart: print a short factory status so a new session can resume.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const status = spawnSync('node', [join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'factory.mjs'), 'status', '--brief'], { encoding: 'utf8' });
if (status.error || status.status !== 0) {
  // Do not lose the failure: a new session must know the status is missing.
  console.log(`WARNING: factory status failed (${status.error?.message ?? `exit ${status.status}`}). ${String(status.stderr ?? '').trim().slice(0, 300)}\nRun \`node factory/bin/factory.mjs status\` by hand before you trust the factory state.`);
} else if (status.stdout) console.log(`${status.stdout.trim()}\n(Verify against the real repo state before trusting any task note.)`);
