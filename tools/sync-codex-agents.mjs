// Builds .codex/agents/*.toml from .claude/agents/*.md so there is ONE source of truth.
// Edit the .md files. Then run:  node tools/sync-codex-agents.mjs
// Check for drift (CI or pre-commit):  node tools/sync-codex-agents.mjs --check
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, '.claude/agents');
const outDir = join(root, '.codex/agents');
const check = process.argv.includes('--check');

const parse = (text, file) => {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing frontmatter`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  for (const key of ['name', 'description', 'tools']) {
    if (!meta[key]) throw new Error(`${file}: frontmatter needs "${key}"`);
  }
  return { meta, body: m[2].trim() };
};

const basic = (s) => JSON.stringify(s); // JSON string is valid TOML basic string

const toToml = ({ meta, body }, file) => {
  if (body.includes("'''")) throw new Error(`${file}: body must not contain '''`);
  const tools = meta.tools.split(',').map((t) => t.trim());
  const canWrite = tools.includes('Edit') || tools.includes('Write');
  const canRun = tools.includes('Bash');
  // Reviewers: read-only. QA runs checks (needs temp writes). Implementer edits code.
  const sandbox = canWrite || canRun ? 'workspace-write' : 'read-only';
  return [
    '# GENERATED from .claude/agents/' + file + ' - do not edit. Run: node tools/sync-codex-agents.mjs',
    `name = ${basic(meta.name)}`,
    `description = ${basic(meta.description)}`,
    `sandbox_mode = ${basic(sandbox)}`,
    "developer_instructions = '''",
    body,
    "'''",
    '',
  ].join('\n');
};

const files = readdirSync(srcDir).filter((f) => f.endsWith('.md')).sort();
let drift = 0;
if (!check) mkdirSync(outDir, { recursive: true });
for (const file of files) {
  const out = join(outDir, file.replace(/\.md$/, '.toml'));
  const next = toToml(parse(readFileSync(join(srcDir, file), 'utf8'), file), file);
  const prev = existsSync(out) ? readFileSync(out, 'utf8') : null;
  if (prev !== next) {
    drift += 1;
    if (check) console.error(`DRIFT: ${out}`);
    else writeFileSync(out, next);
  }
}
const stale = existsSync(outDir)
  ? readdirSync(outDir).filter((f) => f.endsWith('.toml') && !files.includes(f.replace(/\.toml$/, '.md')))
  : [];
for (const f of stale) {
  drift += 1;
  console.error(`STALE (no .claude/agents source): .codex/agents/${f}`);
}
if (check && drift) process.exit(1);
console.log(check ? `OK: ${files.length} agents in sync` : `Wrote ${files.length} agents (${drift} changed)`);
