// Shared helpers for the factory CLI and hooks. Zero dependencies (Node 20+).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const repoRoot = (cwd = process.cwd()) => {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
  } catch {
    return resolve(cwd);
  }
};

export const DEFAULT_CONFIG = {
  project: 'unnamed',
  baseBranch: 'main',
  protectedBranches: ['main', 'master'],
  protectedPaths: ['.env', '.env.*'],
  appendOnlyPaths: [],
  controlPlanePaths: ['.claude/settings.json', '.claude/settings.local.json', '.factory/config.json', 'factory/hooks/'],
  blockedCommands: [],
  limits: { repairAttemptsPerIssue: 3, concurrentFeatures: 1 },
  verify: { required: [], checks: {} },
};

export const loadConfig = (root = repoRoot()) => {
  const file = join(root, '.factory', 'config.json');
  const user = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  return {
    ...DEFAULT_CONFIG,
    ...user,
    limits: { ...DEFAULT_CONFIG.limits, ...user.limits },
    verify: { ...DEFAULT_CONFIG.verify, ...user.verify },
  };
};

export const git = (args, cwd = repoRoot()) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

export const currentBranch = (cwd) => git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);

// Turn a glob-ish path rule into a RegExp. "dir/" matches everything below it,
// "*" matches within one path segment, "**" crosses segments.
export const pathRule = (rule) => {
  if (rule.endsWith('/')) return new RegExp(`(^|/)${esc(rule)}`);
  const body = esc(rule).replace(/\\\*\\\*/g, '.*').replace(/\\\*/g, '[^/]*');
  return new RegExp(`(^|/)${body}$`);
};
const esc = (s) => s.replace(/[.+^${}()|[\]\\*?]/g, '\\$&');
export const matchesAny = (path, rules) => rules.some((r) => pathRule(r).test(path));

// ---- integrity scan: catches "made the test pass by weakening it" ----
const SUSPECT = /(\.skip\(|\bxit\(|\bxdescribe\(|\.todo\(|\.only\(|eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck)/;
export const scanDiff = (diff) => {
  const findings = [];
  let fileName = '';
  let removedAsserts = 0;
  let addedAsserts = 0;
  const flushAsserts = () => {
    if (/(\.test\.|\.spec\.|__tests__|\/tests?\/)/.test(fileName) && removedAsserts > addedAsserts)
      findings.push(`${fileName}: ${removedAsserts - addedAsserts} fewer assertions than before`);
    removedAsserts = addedAsserts = 0;
  };
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) { flushAsserts(); fileName = line.slice(6); continue; }
    if (line.startsWith('+') && SUSPECT.test(line)) findings.push(`${fileName}: added "${line.slice(1).trim().slice(0, 80)}"`);
    if (line.startsWith('-') && !line.startsWith('---') && /\b(expect|assert)\w*\(/.test(line)) removedAsserts++;
    if (line.startsWith('+') && !line.startsWith('+++') && /\b(expect|assert)\w*\(/.test(line)) addedAsserts++;
  }
  flushAsserts();
  return findings;
};

