#!/usr/bin/env node
// PreToolUse guard. Reads the tool call on stdin and blocks (exit 2) or asks.
// Layer 2 of 3: permission deny rules (settings.json) first, this hook second,
// GitHub branch protection last. Hooks are best-effort for Bash, so never the only layer.
import { readFileSync } from 'node:fs';
import { currentBranch, loadConfig, matchesAny, repoRoot } from '../bin/lib.mjs';

const SECRET = [/sk-ant-[A-Za-z0-9_-]{20,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/];

const BUILTIN_BLOCKED = [
  [/\bgh\s+pr\s+merge\b/, 'Merging needs the human. Leave the PR open.'],
  [/\bgh\s+(release|workflow\s+run)\b/, 'Releases and manual workflow runs need the human.'],
  [/\b(wrangler|npx\s+wrangler)\s+(deploy|publish)\b/, 'Production deploys need the human.'],
  [/\bvercel\b.*--prod\b/, 'Production deploys need the human.'],
  [/\bnpm\s+publish\b/, 'Publishing needs the human.'],
  [/\bsupabase\s+(db\s+(push|reset)|migration\s+up|functions\s+deploy|link)\b/, 'Production database and function changes need the human.'],
  [/\bpsql\b.*supabase\.(co|com)/, 'No direct SQL against the production database.'],
  [/curl\b.*-X\s*(POST|PUT|PATCH|DELETE)\b.*supabase\.(co|com)/i, 'No writes to the production API from the shell.'],
  [/git\s+push\b[^\n]*\s(--force\b|-f\b)(?![-\w])/, 'Plain force-push is blocked. Use --force-with-lease on your own branch.'],
  [/git\s+(reset\s+--hard\s+origin|clean\s+-[a-z]*f[a-z]*d)/, 'Destructive git cleanup is blocked.'],
  [/\bgit\s+(commit|push)\b[^\n]*--no-verify/, 'Do not skip git hooks.'],
];

export const decide = (input, cfg, branch) => {
  const tool = input.tool_name;
  const ti = input.tool_input ?? {};
  if (tool === 'Bash') {
    const cmd = String(ti.command ?? '');
    for (const [re, why] of BUILTIN_BLOCKED) if (re.test(cmd)) return { block: why };
    for (const rule of cfg.blockedCommands) if (new RegExp(rule.pattern).test(cmd)) return { block: rule.reason };
    const push = cmd.match(/git\s+push\b([^\n;&|]*)/);
    if (push) {
      const refs = push[1].split(/\s+/).filter((a) => a && !a.startsWith('-'));
      const targets = refs.slice(1).map((r) => r.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, ''));
      const hitsProtected = targets.some((t) => cfg.protectedBranches.includes(t)) || (targets.length === 0 && cfg.protectedBranches.includes(branch));
      if (hitsProtected) return { block: `Pushing to ${cfg.protectedBranches.join('/')} is blocked. Push a feature branch and open a PR.` };
    }
    if (/\bgit\s+(commit|merge|rebase)\b/.test(cmd) && cfg.protectedBranches.includes(branch)) return { block: `You are on protected branch "${branch}". Create a feature branch first.` };
    // Look only at real command words: drop heredoc bodies and quoted text first.
    const code = cmd.replace(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\s*\1\b/g, '').replace(/"[^"]*"|'[^']*'/g, '""');
    for (const seg of code.split(/&&|\|\||[;|\n]/)) {
      const words = seg.trim().split(/\s+/).map((t) => t.replace(/^\.\//, ''));
      const isGitRm = words[0] === 'git' && words[1] === 'rm';
      const removes = ['rm', 'mv', 'truncate', 'shred'].includes(words[0]) || isGitRm;
      const targets = [...(removes ? words.slice(1) : []), ...[...seg.matchAll(/(?:^|[^>])>{1,2}\s*([^\s<>|;&]+)/g)].map((m) => m[1].replace(/^\.\//, ''))];
      const hit = targets.find((t) => t && !t.startsWith('-') && (matchesAny(t, cfg.protectedPaths) || (removes && cfg.appendOnlyPaths.some((p) => t.startsWith(p)))));
      if (hit) return { block: `"${hit}" is protected (artwork, secrets or history). Ask the human.` };
    }
    if (/\bgit\s+commit\b/.test(cmd) && ti.__stagedDiff) {
      if (SECRET.some((re) => re.test(ti.__stagedDiff))) return { block: 'The staged changes look like they contain a credential. Remove it before committing.' };
    }
    return null;
  }
  if (['Edit', 'Write', 'NotebookEdit'].includes(tool)) {
    const path = String(ti.file_path ?? ti.notebook_path ?? '').replace(/\\/g, '/');
    if (matchesAny(path, cfg.protectedPaths)) return { block: `"${path}" is protected. Ask the human.` };
    if (cfg.appendOnlyPaths.some((p) => path.includes(p)) && ti.__exists) return { block: `"${path}" is history. Add a new file instead of editing an old one.` };
    if (matchesAny(path, cfg.controlPlanePaths)) return { ask: `"${path}" controls the factory's own safety rules. A human must approve this edit.` };
    const text = String(ti.content ?? ti.new_string ?? '');
    if (SECRET.some((re) => re.test(text))) return { block: 'This text looks like a credential. Use an environment variable instead.' };
  }
  return null;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const root = repoRoot(input.cwd);
  const ti = (input.tool_input ??= {});
  const { existsSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  if (ti.file_path) ti.__exists = existsSync(ti.file_path);
  if (input.tool_name === 'Bash' && /\bgit\s+commit\b/.test(String(ti.command))) {
    try { ti.__stagedDiff = execFileSync('git', ['diff', '--cached'], { cwd: root, encoding: 'utf8', maxBuffer: 32e6 }); } catch { /* no staged diff */ }
  }
  const d = decide(input, loadConfig(root), currentBranch(root));
  if (d?.block) { console.error(`FACTORY GUARD: ${d.block}`); process.exit(2); }
  if (d?.ask) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: d.ask } }));
}
