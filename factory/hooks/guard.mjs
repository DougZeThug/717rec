// PreToolUse guard. Reads the tool call on stdin and blocks (exit 2) or asks.
// Layer 2 of 3: permission deny rules (settings.json) first, this hook second,
// GitHub branch protection last. Hooks are best-effort for Bash, so never the only layer.
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, posix, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_CONFIG, currentBranch, loadConfig, matchesAny, repoRoot } from '../bin/lib.mjs';

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

// The shell removes every quote mark of a word: ma""in, ma''in and m"a"in are all the word main.
const unquote = (word) => word.replace(/['"]/g, '');

const checkPush = (cmd, cfg, branch) => {
  for (const push of cmd.matchAll(/git\s+push\b([^\n;&|]*)/g)) {
    const words = push[1].split(/\s+/).map(unquote).filter(Boolean);
    const refs = words.filter((word) => !word.startsWith('-'));
    // Line 20 sees only a lone -f. A short flag group that holds f (-fu, -uf) and a +ref also force. A -- flag never matches.
    // Two plain tests, not one pattern with two open-ended parts: that pattern is slow on a very long word.
    if (words.some((word) => /^-[a-zA-Z]+$/.test(word) && word.includes('f')) ||refs.some((ref) => ref.startsWith('+'))) return { block: 'A force push (-f in a flag group, or a +ref) is blocked: use --force-with-lease on your own branch, and the human pushes to a protected branch.' };
    // A bare HEAD means "the branch I am on".
    const targets = refs.slice(1).map((ref) => ref.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, '')).map((target) => (target === 'HEAD' ? branch : target));
    const hitsProtected = targets.some((target) => cfg.protectedBranches.includes(target)) || (targets.length === 0 && cfg.protectedBranches.includes(branch));
    if (hitsProtected) return { block: `Pushing to ${cfg.protectedBranches.join('/')} is blocked. Push a feature branch and open a PR.` };
  }
  return null;
};

// Quoted text becomes one inert word: its spaces and shell operators turn into a filler character.
// Quoted paths stay visible, so `rm -rf "public/x"` is still caught.
const FILLER = String.fromCharCode(1);
// An escaped character (`\"`, `\'`) is skipped first, so it cannot open a quoted string. `$'...'` may hold `\'`.
const neutralise = (cmd) => cmd.replace(HEREDOC, '$1').replace(/\\[\s\S]|"((?:[^"\\]|\\[\s\S])*)"|\$'((?:[^'\\]|\\[\s\S])*)'|'([^']*)'/g, (match, double, ansi, single) => {
  const text = double ?? ansi ?? single;
  return text === undefined ? match : text.replace(/[\s<>|;&]/g, FILLER);
});

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

// Bodies of $( ) and backtick substitutions. They run even inside double quotes; single and ANSI-C ($'...') quotes make them inert.
// A backslash skips the next character. An apostrophe inside double quotes is plain text. The caller checks each body again as a command of its own.
// The scan does NOT jump over a $( ) body: the paren count does not know about quotes, so a `)` inside quotes ends the body early,
// and the text after it must still be read with the right quote state.
const substitutions = (cmd) => {
  const bodies = [];
  let quote = ''; // '' = none, '"' = double quotes, "'" = single quotes, "$'" = ANSI-C quotes
  for (let at = 0; at < cmd.length; at++) {
    const ch = cmd[at];
    if (quote === "'") {
      if (ch === "'") quote = '';
    } else if (ch === '\\') at++;
    else if (quote === "$'") {
      if (ch === "'") quote = '';
    } else if (ch === '"') quote = quote === '"' ? '' : '"';
    else if (ch === "'" && !quote) quote = "'";
    else if (ch === '$' && cmd[at + 1] === "'" && !quote) {
      quote = "$'";
      at++;
    } else if (ch === '$' && cmd[at + 1] === '(') {
      let depth = 1;
      let end = at + 2;
      for (; end < cmd.length && depth > 0; end++) depth += cmd[end] === '(' ? 1 : cmd[end] === ')' ? -1 : 0;
      bodies.push(cmd.slice(at + 2, end - 1));
    } else if (ch === '`') {
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
    if (hit) return { block: `"${hit.replaceAll(FILLER, ' ')}" is protected (artwork, secrets or history). Ask the human.` };
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

// ---- Control-plane writes. A shell command that rewrites the factory's own safety files must ask the human. ----
// Reads stay silent. Like checkProtectedTargets this reads command words only: a path built by a variable,
// a glob or xargs is not seen. It is the last check, so a block always wins over this ask.

const realPath = (path) => { try { return realpathSync(path); } catch { return resolve(path); } };

// Where the shell starts, as a path under the repo root: '' is the root itself. null means outside the repo.
const startDirOf = (cwd, root) => {
  if (typeof cwd !== 'string' || !cwd || !root) return '';
  const inside = relative(realPath(root), realPath(cwd)).replace(/\\/g, '/');
  return inside === '..' || inside.startsWith('../') || isAbsolute(inside) ? null : inside;
};

// A shell path as a path under the repo root ('.' is the root). undefined = not in this repo: absolute and
// elsewhere, `~`, or `..` out of the root. `cwd` is the directory set by `cd` ('' is the root).
const repoPath = (target, cwd, base) => {
  if (!target || target.startsWith('~')) return undefined;
  const joined = target.startsWith('/') || !cwd ? target : posix.join(cwd, target);
  if (joined.startsWith('~')) return undefined;
  let path = posix.normalize(joined);
  if (path.startsWith('/')) {
    if (!base || (path !== base && !path.startsWith(`${base}/`))) return undefined;
    path = path.slice(base.length).replace(/^\/+/, '') || '.';
  }
  return path === '..' || path.startsWith('../') ? undefined : path;
};

const nonFlags = (words) => words.filter((word) => word && !word.startsWith('-'));
// The values of one flag: `-o f`, `--output f` and `--output=f`.
const flagValues = (words, short, long) => words.flatMap((word, at) => {
  if (short.test(word) || word === long) return words[at + 1] ? [words[at + 1]] : [];
  return word.startsWith(`${long}=`) ? [word.slice(long.length + 1)] : [];
});

// The paths one command segment would write, change or remove. `clean` has no ( ) { } around it.
const writeTargets = (clean) => {
  const words = clean.split(/\s+/);
  const [name, sub] = words;
  const args = words.slice(1);
  const plain = nonFlags(args);
  const redirects = [...clean.matchAll(/(?:^|[^>])>{1,2}\s*([^\s<>|;&]+)/g)].map((found) => found[1]);
  let targets = [];
  if (['cp', 'install', 'ln', 'rsync'].includes(name)) {
    // Only the destination is written. `-t dir` makes every other word a source.
    const into = name === 'rsync' ? [] : flagValues(args, /^-[a-zA-Z]*t$/, '--target-directory');
    targets = into.length ? into : plain.length > 1 ? plain.slice(-1) : [];
  } else if (['mv', 'tee', 'rm', 'shred', 'truncate', 'unlink'].includes(name)) targets = plain;
  else if (['sed', 'perl'].includes(name) && args.some((word) => /^-[a-zA-Z]*i/.test(word) || /^--in-place(=|$)/.test(word))) targets = plain;
  else if (name === 'dd') targets = args.filter((word) => word.startsWith('of=')).map((word) => word.slice(3));
  else if (name === 'curl') targets = flagValues(args, /^-[a-zA-Z]*o$/, '--output');
  else if (name === 'wget') targets = flagValues(args, /^-[a-zA-Z]*O$/, '--output-document');
  else if (name === 'git' && ['rm', 'mv'].includes(sub)) targets = nonFlags(words.slice(2));
  // `git checkout x` and `git checkout -b x` name a branch. Only the words after a lone `--` are paths.
  else if (name === 'git' && sub === 'checkout') targets = words.includes('--') ? words.slice(words.indexOf('--') + 1).filter(Boolean) : [];
  // `git restore --staged` only unstages, so it writes no file (the same rule as `restores` in protectedTarget).
  else if (name === 'git' && sub === 'restore' && !(words.includes('--staged') && !words.includes('--worktree'))) targets = nonFlags(words.slice(2));
  return [...redirects, ...targets].map((target) => target.replace(/[)}]+$/, ''));
};

const controlAsk = (path) => ({ ask: `"${path.replaceAll(FILLER, ' ')}" controls the factory's own safety rules. A human must approve this shell command.` });

// `git apply` without these flags writes. The flags only report.
const APPLY_READ_ONLY = ['--check', '--stat', '--numstat', '--summary'];
const INTERPRETERS = ['python3', 'python', 'node', 'ruby', 'perl', 'bash', 'sh'];

// Commands that can rewrite any file, with no path to look at. `raw` is the whole command before neutralising:
// quoted code is only visible there. An interpreter counts only as the FIRST word of a segment (so the usual
// `git commit -m "$(cat <<'EOF' ... EOF)"` never asks) and only when its code is inline (-c, -e, -p, or a
// bash/sh heredoc) and the raw text names a control path.
const writesAnywhere = (clean, raw, rules) => {
  const [name, ...args] = clean.split(/\s+/);
  const sub = args[0];
  if (name === 'patch' || (name === 'git' && sub === 'am') || (name === 'git' && sub === 'apply' && !args.some((word) => APPLY_READ_ONLY.includes(word)))) {
    return { ask: `"${name === 'patch' ? 'patch' : `git ${sub}`}" can rewrite any file, including the factory's own safety rules. A human must approve this shell command.` };
  }
  if (!INTERPRETERS.includes(name)) return null;
  const inline = args.some((word) => ['-c', '-e', '-p'].includes(word)) || (['bash', 'sh'].includes(name) && clean.includes('<<'));
  // A control folder also counts without its trailing slash: `shutil.rmtree('factory/hooks')`.
  const named = inline ? rules.find((rule) => raw.includes(rule) || raw.includes(rule.replace(/\/+$/, ''))) : undefined;
  return named ? controlAsk(named) : null;
};

const checkControlPlaneWrites = (cmd, cfg, startDir, root) => {
  if (startDir === null) return null;
  const rules = cfg.controlPlanePaths;
  const base = root ? realPath(root).replace(/\\/g, '/').replace(/\/+$/, '') : undefined;
  const asDir = (path) => `${path.replace(/\/+$/, '')}/`;
  // A control path itself, a path inside a control folder, or a folder that holds a control path (`rm -rf .claude`).
  const controls = (path) => path === '.' || matchesAny(path, rules) || matchesAny(asDir(path), rules) || rules.some((rule) => rule.startsWith(asDir(path)));
  const scan = (text, dir, depth) => {
    let cwd = dir;
    for (const segment of neutralise(text).replace(/>\|/g, '>').split(/&&|\|\||[;|\n]/)) {
      // A trailing `&` (run in the background) is not a word of the command.
      const clean = segment.trim().replace(/^[({\s]+/, '').replace(/[)}&\s]+$/, '');
      for (const target of writeTargets(clean)) {
        const path = repoPath(target, cwd, base);
        if (path !== undefined && controls(path)) return controlAsk(path);
      }
      const anywhere = writesAnywhere(clean, cmd, rules);
      if (anywhere) return anywhere;
      cwd = nextCwd(segment, cwd);
    }
    // Substitutions run even inside double quotes, so check each body as a command of its own.
    if (depth < 4) {
      for (const body of substitutions(text.replace(HEREDOC, '$1'))) {
        const inner = scan(body, dir, depth + 1);
        if (inner) return inner;
      }
    }
    return null;
  };
  return scan(cmd, startDir, 0);
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
  // A git failure must not read as "nothing to scan" (that would let a key through): it throws, and the guard exits 2.
  const run = (args, input) => {
    try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32e6, stdio: ['pipe', 'pipe', 'pipe'], input }); } catch (error) { throw new Error(`git ${args[0]} failed, so the commit cannot be scanned: ${String(error.stderr || error.message).trim().split('\n')[0]}`); }
  };
  // A repo with no commit yet has no HEAD: compare with the empty tree. Any other failure throws.
  const hasHead = () => { try { execFileSync('git', ['rev-parse', '--verify', '--quiet', 'HEAD'], { cwd: root, stdio: 'ignore' }); return true; } catch (error) { if (error.status === 1) return false; throw new Error(`git rev-parse failed, so the commit cannot be scanned: ${error.message}`); } };
  let diff = run(['diff', '--cached']);
  const takesAll = /\bgit\s+commit\b[^\n;&|]*\s(-[a-zA-Z]*a[a-zA-Z]*|--all)(?=\s|$)/.test(cmd);
  const adds = /\bgit\s+add\b/.test(cmd);
  if (takesAll || adds) diff += run(['diff', hasHead() ? 'HEAD' : run(['hash-object', '-t', 'tree', '--stdin'], '').trim()]);
  if (adds) {
    for (const file of run(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean)) {
      try {
        const text = readFileSync(join(root, file), 'utf8');
        if (text.length < 2e6) diff += `${text.split('\n').map((line) => `+${line}`).join('\n')}\n`;
      } catch { /* unreadable or binary */ }
    }
  }
  return diff;
};

// Join backslash-newline pairs the way the shell does: `ma\<newline>in` is the one word `main`. Join with
// NOTHING, not a space. An even run of backslashes is escaped backslashes, so the newline after it is real
// and stays a command separator. (?<!\\) plus pairs means only an odd run, whose last backslash escapes the newline.
const joinContinuations = (command) => command.replace(/(?<!\\)((?:\\\\)*)\\\r?\n/g, '$1');

// All the Bash checks, in order, on one text. The order lives here and nowhere else.
// The block lists scan the RAW command: `bash <<EOF` and `bash -c "..."` run their text.
// Only the protected-path scan skips heredoc bodies and quotes, because a file body that
// merely mentions "rm public/" is data, not a delete.
// The control-plane check is LAST: it only asks, so every block above it wins.
const bashChecks = (text, toolInput, cfg, branch, root, startDir) => checkBlockedCommands(text, cfg)
  ?? checkPush(text, cfg, branch)
  ?? checkCommitFlags(text)
  ?? checkCommit(text, cfg, branch)
  ?? checkProtectedTargets(text, cfg)
  ?? checkStagedSecrets(text, toolInput)
  ?? checkControlPlaneWrites(text, cfg, startDir, root);

// The shell does not always join a backslash-newline pair: a comment ends at the newline, and a quoted
// heredoc body keeps the pair as plain text. A join can therefore hide a command that really runs.
// So check the text as written AND the joined text. Any block wins. An ask from either text is kept.
const decideBash = (toolInput, cfg, branch, root, startDir) => {
  const written = String(toolInput.command ?? '');
  const first = bashChecks(written, toolInput, cfg, branch, root, startDir);
  if (first?.block) return first;
  const joined = joinContinuations(written);
  if (joined === written) return first;
  const second = bashChecks(joined, toolInput, cfg, branch, root, startDir);
  return second?.block ? second : first ?? second;
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

const EDIT_TOOLS = ['Edit', 'Write', 'NotebookEdit'];

// `root` is the repo root. Only the control-plane shell check uses it, to read relative paths from `input.cwd`.
export const decide = (input, cfg, branch, root) => {
  const toolInput = input.tool_input ?? {};
  if (input.tool_name === 'Bash') return decideBash(toolInput, cfg, branch, root, startDirOf(input.cwd, root));
  if (EDIT_TOOLS.includes(input.tool_name)) return decideEdit(toolInput, cfg);
  return null;
};

// The project config can only ADD protection. The built-in paths and branches always stay on, and a
// wrong type (a string where a list belongs) becomes an empty list instead of crashing or switching a rule off.
const strings = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);
const union = (...lists) => [...new Set(lists.flat())];
export const hardenConfig = (cfg) => ({
  ...cfg,
  protectedBranches: union(DEFAULT_CONFIG.protectedBranches, strings(cfg.protectedBranches)),
  protectedPaths: union(DEFAULT_CONFIG.protectedPaths, strings(cfg.protectedPaths)),
  appendOnlyPaths: strings(cfg.appendOnlyPaths),
  controlPlanePaths: union(DEFAULT_CONFIG.controlPlanePaths, strings(cfg.controlPlanePaths)),
  blockedCommands: Array.isArray(cfg.blockedCommands) ? cfg.blockedCommands : [],
});

// import.meta.url is a percent-encoded URL. A raw `file://` + path breaks on spaces, #, % and non-ASCII,
// and the guard would then do nothing and exit 0. Compare real file URLs instead.
const isMain = () => {
  if (!process.argv[1]) return false;
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return import.meta.url === pathToFileURL(process.argv[1]).href; }
};
// Fail closed. Empty, unparsable or odd input, an unreadable config (for Bash) and any internal error end in exit 2.
// Exit 1 would let the tool call run. A crash that happens before this code runs (a syntax error in this file,
// a missing file, no node) is caught by `|| exit 2` in the hook command in settings.json.
const readInput = () => {
  const text = readFileSync(0, 'utf8');
  if (!text.trim()) throw new Error('the tool call on stdin was empty');
  const input = JSON.parse(text);
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new Error('the tool call on stdin was not a JSON object');
  return input;
};

const guard = async () => {
  const input = readInput();
  const root = repoRoot(input.cwd);
  const toolInput = (input.tool_input ??= {});
  // An unreadable config: an edit falls back to the built-in rules and asks the human. Bash throws (exit 2).
  let cfg;
  let configBroken = false;
  try {
    cfg = hardenConfig(loadConfig(root));
  } catch (error) {
    if (!EDIT_TOOLS.includes(input.tool_name)) throw new Error(`the factory config (.factory/config.json) cannot be read: ${error.message}`);
    cfg = hardenConfig(DEFAULT_CONFIG);
    configBroken = true;
  }
  const { existsSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  if (toolInput.file_path) toolInput.__exists = existsSync(toolInput.file_path);
  if (input.tool_name === 'Bash' && /\bgit\s+commit\b/.test(String(toolInput.command))) {
    toolInput.__stagedDiff = commitContent(String(toolInput.command), root, execFileSync);
  }
  let decision = decide(input, cfg, currentBranch(root), root);
  if (configBroken && !decision?.block) decision = { ask: 'The factory config (.factory/config.json) cannot be read, so only the built-in rules apply. A human must approve this edit.' };
  if (decision?.block) { console.error(`FACTORY GUARD: ${decision.block}`); process.exitCode = 2; }
  else if (decision?.ask) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: decision.ask } }));
};

if (isMain()) {
  try {
    await guard();
  } catch (error) {
    console.error(`FACTORY GUARD: the guard could not finish (${error?.message ?? error}). Blocking to be safe.`);
    process.exitCode = 2;
  }
}
