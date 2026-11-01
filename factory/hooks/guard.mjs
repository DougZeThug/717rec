// PreToolUse guard. Reads the tool call on stdin and blocks (exit 2) or asks.
// Layer 2 of 3: permission deny rules (settings.json) first, this hook second,
// GitHub branch protection last. Hooks are best-effort for Bash, so never the only layer.
import { readFileSync, realpathSync } from 'node:fs';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
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
  [/\b(curl|wget|httpie)\b[^\n]*supabase\.(co|com)/i, 'No requests to the production API from the shell (any method, any path). Use mocks.'],
  [/git\s+push\b[^\n]*\s(--force\b|-f\b)(?![-\w])/, 'Plain force-push is blocked. Use --force-with-lease on your own branch.'],
  [/\bgit\s+reset\b[^\n;&|]*--hard\b/, 'git reset --hard is blocked. It throws away work.'],
  [/\bgit\s+clean\b[^\n;&|]*\s(-[a-zA-Z]*f[a-zA-Z]*|--force)(?![-\w])/, 'git clean with force is blocked. It deletes untracked files.'],
  [/\bgit\b[^\n;&|]*core\.hooksPath/, 'Do not redirect or skip git hooks.'],
  [/\bgit\s+(commit|push)\b[^\n]*--no-verify/, 'Do not skip git hooks.'],
  [/\bgit\s+push\b[^\n;&|]*\s--(all|mirror|prune)\b/, 'Bulk pushes (--all, --mirror, --prune) can reach protected branches. Push one named branch.'],
];

// Matches a heredoc. Group 1 is the opener line (redirects there are real); the body after it is data.
const HEREDOC = /((?<!<)<<(?!<)-?\s*['"]?(\w+)['"]?[^\n]*)\n[\s\S]*?\n\s*\2\b/g;

const unquote = (word) => word.replace(/^['"]+|['"]+$/g, '');

const checkPush = (cmd, cfg, branch) => {
  for (const push of cmd.matchAll(/git\s+push\b([^\n;&|]*)/g)) {
    const refs = push[1].split(/\s+/).map(unquote).filter((word) => word && !word.startsWith('-'));
    // A bare HEAD means "the branch I am on".
    const targets = refs.slice(1).map((ref) => ref.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, '')).map((target) => (target === 'HEAD' ? branch : target));
    const hitsProtected = targets.some((target) => cfg.protectedBranches.includes(target)) || (targets.length === 0 && cfg.protectedBranches.includes(branch));
    if (hitsProtected) return { block: `Pushing to ${cfg.protectedBranches.join('/')} is blocked. Push a feature branch and open a PR.` };
  }
  return null;
};

// The short form of the hook-skip flag. Look at flag words only: quoted text is neutralised first.
const checkCommitFlags = (cmd) => {
  const code = neutralise(cmd);
  return /\bgit\s+commit\b[^\n;&|]*\s-[a-zA-Z]*n[a-zA-Z]*(?=\s|$)/.test(code) ? { block: 'Do not skip git hooks (short flag).' } : null;
};

const checkBlockedCommands = (cmd, cfg) => {
  const builtin = BUILTIN_BLOCKED.find(([pattern]) => pattern.test(cmd));
  if (builtin) return { block: builtin[1] };
  const custom = cfg.blockedCommands.find((rule) => new RegExp(rule.pattern).test(cmd));
  return custom ? { block: custom.reason } : null;
};

// Quoted text becomes one inert word: its spaces and shell operators turn into a filler character.
// Quoted paths stay visible, so `rm -rf "public/x"` is still caught.
const neutralise = (cmd) => cmd.replace(HEREDOC, '$1').replace(/"([^"]*)"|'([^']*)'/g, (_match, double, single) => (double ?? single).replace(/[\s<>|;&]/g, '\u0001'));

// Bodies of $( ) and backtick substitutions. They run even inside double quotes; single quotes make them inert.
const substitutions = (cmd) => {
  const bodies = [];
  let single = false;
  for (let at = 0; at < cmd.length; at++) {
    const ch = cmd[at];
    if (ch === "'") single = !single;
    else if (!single && ch === '\\') at++;
    else if (!single && ch === '$' && cmd[at + 1] === '(') {
      let depth = 1;
      let end = at + 2;
      for (; end < cmd.length && depth > 0; end++) depth += cmd[end] === '(' ? 1 : cmd[end] === ')' ? -1 : 0;
      bodies.push(cmd.slice(at + 2, end - 1));
    } else if (!single && ch === '`') {
      const end = cmd.indexOf('`', at + 1);
      if (end < 0) break;
      bodies.push(cmd.slice(at + 1, end));
      at = end;
    }
  }
  return bodies;
};

// Find the first path that a rm/mv/truncate/shred/git rm/git checkout/git restore or a redirect would touch.
// `cwd` is the directory set by an earlier `cd` in the same command ('' means the repo root).
const protectedTarget = (segment, cfg, cwd = '') => {
  const words = segment.trim().replace(/^[({\s]+/, '').replace(/[)}\s]+$/, '').split(/\s+/);
  const isGit = words[0] === 'git';
  const removes = ['rm', 'mv', 'truncate', 'shred'].includes(words[0]) || (isGit && words[1] === 'rm');
  const restores = isGit && ['checkout', 'restore'].includes(words[1]) && !(words.includes('--staged') && !words.includes('--worktree'));
  const redirects = [...segment.matchAll(/(?:^|[^>])>{1,2}\s*([^\s<>|;&]+)/g)].map((found) => found[1]);
  const rawTargets = [...(removes ? words.slice(1) : restores ? words.slice(2) : []), ...redirects].filter((target) => target && !target.startsWith('-'));
  const targets = rawTargets.map((target) => posix.normalize(cwd && !target.startsWith('/') ? posix.join(cwd, target) : target));
  // Also test the directory form, so `rm -rf public` matches the rule `public/`.
  const asDir = (target) => `${target.replace(/\/+$/, '')}/`;
  const hit = targets.find((target) => matchesAny(target, cfg.protectedPaths) || matchesAny(asDir(target), cfg.protectedPaths) || (removes && cfg.appendOnlyPaths.some((prefix) => asDir(target).includes(prefix))));
  if (hit) return hit;
  // `rm -rf .` or `rm -rf ..` (maybe after `cd public`) reaches the protected paths below it.
  return (removes || restores) ? targets.find((target) => /^(\.|\.\.(\/\.\.)*)\/?$/.test(target)) : undefined;
};

// Follow a leading `cd <dir>` so later relative targets carry that directory.
const nextCwd = (segment, cwd) => {
  const words = segment.trim().replace(/^[({\s]+/, '').replace(/[)}\s]+$/, '').split(/\s+/);
  if (words[0] !== 'cd' || !words[1]) return cwd;
  return words[1].startsWith('/') || words[1].startsWith('~') ? posix.normalize(words[1]) : posix.normalize(posix.join(cwd || '.', words[1]));
};

const checkProtectedTargets = (cmd, cfg, depth = 0) => {
  // Look only at real command words: drop heredoc bodies and quoted text first.
  let cwd = '';
  for (const segment of neutralise(cmd).split(/&&|\|\||[;|\n]/)) {
    const hit = protectedTarget(segment, cfg, cwd === '.' ? '' : cwd);
    if (hit) return { block: `"${hit.replace(/\u0001/g, ' ')}" is protected (artwork, secrets or history). Ask the human.` };
    cwd = nextCwd(segment, cwd);
  }
  // Substitutions run even inside double quotes, so check each body as a command of its own.
  if (depth < 4) {
    for (const body of substitutions(cmd.replace(HEREDOC, '$1'))) {
      const inner = checkProtectedTargets(body, cfg, depth + 1);
      if (inner) return inner;
    }
  }
  return null;
};

const checkCommit = (cmd, cfg, branch) => {
  if (/\bgit\s+(commit|merge|rebase)\b/.test(cmd) && cfg.protectedBranches.includes(branch)) return { block: `You are on protected branch "${branch}". Create a feature branch first.` };
  return null;
};

// Only lines the commit ADDS count. Removing a leaked key must not be blocked.
export const addedLines = (diff) => diff.split('\n').filter((line) => line.startsWith('+') && !line.startsWith('+++')).join('\n');

const checkStagedSecrets = (cmd, toolInput) => {
  if (/\bgit\s+commit\b/.test(cmd) && toolInput.__stagedDiff && SECRET.some((pattern) => pattern.test(addedLines(toolInput.__stagedDiff)))) return { block: 'The staged changes look like they contain a credential. Remove it before committing.' };
  return null;
};

// What the coming commit will contain. `git commit -a` and `git add ... && git commit` take working-tree
// changes too, so look at those (and new files) as well as the index.
const commitContent = (cmd, root, execFileSync) => {
  const run = (args) => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32e6 }); } catch { return ''; } };
  let diff = run(['diff', '--cached']);
  const takesAll = /\bgit\s+commit\b[^\n;&|]*\s(-[a-zA-Z]*a[a-zA-Z]*|--all)(?=\s|$)/.test(cmd);
  const adds = /\bgit\s+add\b/.test(cmd);
  if (takesAll || adds) diff += run(['diff', 'HEAD']);
  if (adds) {
    for (const file of run(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean)) {
      try {
        const text = readFileSync(join(root, file), 'utf8');
        if (text.length < 2e6) diff += text.split('\n').map((line) => `+${line}`).join('\n') + '\n';
      } catch { /* unreadable or binary */ }
    }
  }
  return diff;
};

const decideBash = (toolInput, cfg, branch) => {
  const raw = String(toolInput.command ?? '');
  // The block lists scan the RAW command: `bash <<EOF` and `bash -c "..."` run their text.
  // Only the protected-path scan skips heredoc bodies and quotes, because a file body that
  // merely mentions "rm public/" is data, not a delete.
  return checkBlockedCommands(raw, cfg)
    ?? checkPush(raw, cfg, branch)
    ?? checkCommitFlags(raw)
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

// import.meta.url is a percent-encoded URL. A raw `file://` + path breaks on spaces, #, % and non-ASCII,
// and the guard would then do nothing and exit 0. Compare real file URLs instead.
const isMain = () => {
  if (!process.argv[1]) return false;
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return import.meta.url === pathToFileURL(process.argv[1]).href; }
};
if (isMain()) {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const root = repoRoot(input.cwd);
  const toolInput = (input.tool_input ??= {});
  const { existsSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  if (toolInput.file_path) toolInput.__exists = existsSync(toolInput.file_path);
  if (input.tool_name === 'Bash' && /\bgit\s+commit\b/.test(String(toolInput.command))) {
    toolInput.__stagedDiff = commitContent(String(toolInput.command), root, execFileSync);
  }
  const decision = decide(input, loadConfig(root), currentBranch(root));
  if (decision?.block) { console.error(`FACTORY GUARD: ${decision.block}`); process.exitCode = 2; }
  else if (decision?.ask) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: decision.ask } }));
}
