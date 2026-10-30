#!/usr/bin/env node
// SessionStart: print a short factory status so a new session can resume.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const r = spawnSync('node', [join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'factory.mjs'), 'status', '--brief'], { encoding: 'utf8' });
if (r.stdout) console.log(r.stdout.trim() + '\n(Verify against the real repo state before trusting any task note.)');
