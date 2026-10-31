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
  [/\bgit\s+push\b[^\n;&|]*\s--(all|mirror|prune)\b/, 'Bulk pushes (--all, --mirror, --prune) can reach protected branches. Push one named branch.'],
];

// Matches a heredoc. Group 1 is the opener line (redirects there are real); the body after it is data.
const HEREDOC = /(<<-?\s*['"]?(\w+)['"]?[^\n]*)\n[\s\S]*?\n\s*\2\b/g;

const checkPush = (cmd, cfg, branch) => {
  const push = cmd.match(/git\s+push\b([^\n;&|]*)/);
  if (!push) return null;
  const refs = push[1].split(/\s+/).filter((word) => word && !word.startsWith('-'));
  const targets = refs.slice(1).map((ref) => ref.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, ''));
  const hitsProtected = targets.some((target) => cfg.protectedBranches.includes(target)) || (targets.length === 0 && cfg.protectedBranches.includes(branch));
  return hitsProtected ? { block: `Pushing to ${cfg.protectedBranches.join('/')} is blocked. Push a feature branch and open a PR.` } : null;
};

const checkBlockedCommands = (cmd, cfg) => {
  const builtin = BUILTIN_BLOCKED.find(([pattern]) => pattern.test(cmd));
  if (builtin) return { block: builtin[1] };
  const custom = cfg.blockedCommands.find((rule) => new RegExp(rule.pattern).test(cmd));
  return custom ? { block: custom.reason } : null;
};

// Find the first path that a rm/mv/truncate/shred/git rm or a redirect would touch.
const protectedTarget = (segment, cfg) => {
  const words = segment.trim().split(/\s+/).map((word) => word.replace(/^\.\//, ''));
  const isGitRm = words[0] === 'git' && words[1] === 'rm';
  const removes = ['rm', 'mv', 'truncate', 'shred'].includes(words[0]) || isGitRm;
  const redirects = [...segment.matchAll(/(?:^|[^>])>{1,2}\s*([^\s<>|;&]+)/g)].map((found) => found[1].replace(/^\.\//, ''));
  const targets = [...(removes ? words.slice(1) : []), ...redirects];
  return targets.find((target) => target && !target.startsWith('-') && (matchesAny(target, cfg.protectedPaths) || (removes && cfg.appendOnlyPaths.some((prefix) => target.startsWith(prefix)))));
};

const checkProtectedTargets = (cmd, cfg) => {
  // Look only at real command words: drop heredoc bodies and quoted text first.
  const code = cmd.replace(HEREDOC, '$1').replace(/"[^"]*"|'[^']*'/g, '""');
  for (const segment of code.split(/&&|\|\||[;|\n]/)) {
    const hit = protectedTarget(segment, cfg);
    if (hit) return { block: `"${hit}" is protected (artwork, secrets or history). Ask the human.` };
  }
  return null;
};

const checkCommit = (cmd, cfg, branch) => {
  if (/\bgit\s+(commit|merge|rebase)\b/.test(cmd) && cfg.protectedBranches.includes(branch)) return { block: `You are on protected branch "${branch}". Create a feature branch first.` };
  return null;
};

const checkStagedSecrets = (cmd, toolInput) => {
  if (/\bgit\s+commit\b/.test(cmd) && toolInput.__stagedDiff && SECRET.some((pattern) => pattern.test(toolInput.__stagedDiff))) return { block: 'The staged changes look like they contain a credential. Remove it before committing.' };
  return null;
};

const decideBash = (toolInput, cfg, branch) => {
  const raw = String(toolInput.command ?? '');
  // The block lists scan the RAW command: `bash <<EOF` and `bash -c "..."` run their text.
  // Only the protected-path scan skips heredoc bodies and quotes, because a file body that
  // merely mentions "rm public/" is data, not a delete.
  return checkBlockedCommands(raw, cfg)
    ?? checkPush(raw, cfg, branch)
    ?? checkCommit(raw, cfg, branch)
    ?? checkProtectedTargets(raw, cfg)
    ?? checkStagedSecrets(raw, toolInput);
};

const decideEdit = (toolInput, cfg) => {
  const path = String(toolInput.file_path ?? toolInput.notebook_path ?? '').replace(/\\/g, '/');
  if (matchesAny(path, cfg.protectedPaths)) return { block: `"${path}" is protected. Ask the human.` };
  if (cfg.appendOnlyPaths.some((prefix) => path.includes(prefix)) && toolInput.__exists) return { block: `"${path}" is history. Add a new file instead of editing an old one.` };
  if (matchesAny(path, cfg.controlPlanePaths)) return { ask: `"${path}" controls the factory's own safety rules. A human must approve this edit.` };
  const text = String(toolInput.content ?? toolInput.new_string ?? '');
  if (SECRET.some((pattern) => pattern.test(text))) return { block: 'This text looks like a credential. Use an environment variable instead.' };
  return null;
};

export const decide = (input, cfg, branch) => {
  const toolInput = input.tool_input ?? {};
  if (input.tool_name === 'Bash') return decideBash(toolInput, cfg, branch);
  if (['Edit', 'Write', 'NotebookEdit'].includes(input.tool_name)) return decideEdit(toolInput, cfg);
  return null;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const root = repoRoot(input.cwd);
  const toolInput = (input.tool_input ??= {});
  const { existsSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  if (toolInput.file_path) toolInput.__exists = existsSync(toolInput.file_path);
  if (input.tool_name === 'Bash' && /\bgit\s+commit\b/.test(String(toolInput.command))) {
    try { toolInput.__stagedDiff = execFileSync('git', ['diff', '--cached'], { cwd: root, encoding: 'utf8', maxBuffer: 32e6 }); } catch { /* no staged diff */ }
  }
  const decision = decide(input, loadConfig(root), currentBranch(root));
  if (decision?.block) { console.error(`FACTORY GUARD: ${decision.block}`); process.exitCode = 2; }
  else if (decision?.ask) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: decision.ask } }));
}
