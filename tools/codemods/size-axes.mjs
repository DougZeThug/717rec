#!/usr/bin/env node
// Replace `w-X` + `h-X` (matching prefix and value) within the same class string
// with a single `size-X`. Operates on string literals (", ', `) inside the file —
// classes commonly live inside className= and cn() calls.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'src');
const APPLY = process.argv.includes('--apply');

const VALUE_RE = /^(?:\d+(?:\.\d+)?|\d+\/\d+|full|screen|auto|min|max|fit|px|\[[^\]]+\])$/;

function processClassString(s) {
  // Split on whitespace but keep template-literal interpolations intact:
  // a token containing ${...} we leave alone.
  const tokens = s.split(/(\s+)/); // keep separators
  // Build map: key = `${prefix}::${value}` -> { wIdx, hIdx }
  const map = new Map();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || /\s/.test(t)) continue;
    if (t.includes('${')) continue;
    // Match optional prefix then w-VAL or h-VAL
    const m = t.match(/^((?:[a-z0-9-]+:)*)([wh])-(.+)$/);
    if (!m) continue;
    const [, prefix, axis, value] = m;
    if (!VALUE_RE.test(value)) continue;
    const key = `${prefix}::${value}`;
    const entry = map.get(key) || {};
    entry[axis] = i;
    entry.prefix = prefix;
    entry.value = value;
    map.set(key, entry);
  }
  let changed = false;
  let count = 0;
  for (const entry of map.values()) {
    if (entry.w == null || entry.h == null) continue;
    // Replace earlier index with size-, blank out later one
    const first = Math.min(entry.w, entry.h);
    const second = Math.max(entry.w, entry.h);
    tokens[first] = `${entry.prefix}size-${entry.value}`;
    tokens[second] = ''; // remove
    changed = true;
    count++;
  }
  if (!changed) return { out: s, count: 0 };
  // Collapse double whitespace caused by removals
  let joined = tokens.join('');
  joined = joined.replace(/[ \t]{2,}/g, ' ').replace(/^\s+|\s+$/g, (m, off) => off === 0 ? '' : '');
  // Preserve original leading/trailing whitespace
  const leading = s.match(/^\s*/)[0];
  const trailing = s.match(/\s*$/)[0];
  return { out: leading + joined.trim() + trailing, count };
}

// Find string literals: ", ', `
function transform(src) {
  let out = '';
  let i = 0;
  let count = 0;
  while (i < src.length) {
    const ch = src[i];
    // Only scan double-quoted and template strings — JSX text often contains
    // apostrophes (don't, you're) which would otherwise confuse the scanner.
    if (ch === '"' || ch === '`') {
      // Find matching close, accounting for escapes (template literals can have ${...} but we treat content as-is for class matching)
      const quote = ch;
      let j = i + 1;
      let buf = '';
      while (j < src.length) {
        const cj = src[j];
        if (cj === '\\') { buf += src[j] + (src[j+1] || ''); j += 2; continue; }
        if (cj === quote) break;
        buf += cj;
        j++;
      }
      // Heuristic: only process if this looks like a class string — contains `w-` and `h-` with matching value
      if (/(?:^|\s)(?:[a-z0-9-]+:)*w-[\w./\[\]-]+/.test(buf) && /(?:^|\s)(?:[a-z0-9-]+:)*h-[\w./\[\]-]+/.test(buf)) {
        const { out: rep, count: c } = processClassString(buf);
        out += quote + rep + quote;
        count += c;
      } else {
        out += quote + buf + quote;
      }
      i = j + 1;
    } else if (ch === '/' && src[i+1] === '/') {
      // line comment
      const nl = src.indexOf('\n', i);
      if (nl === -1) { out += src.slice(i); i = src.length; }
      else { out += src.slice(i, nl); i = nl; }
    } else if (ch === '/' && src[i+1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end === -1) { out += src.slice(i); i = src.length; }
      else { out += src.slice(i, end + 2); i = end + 2; }
    } else {
      out += ch;
      i++;
    }
  }
  return { out, count };
}

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git' || e.name === '__tests__') continue;
      walk(p, files);
    } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      files.push(p);
    }
  }
  return files;
}

const files = walk(ROOT);
let totalReplacements = 0;
const byDir = {};
const changedFiles = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const { out, count } = transform(src);
  if (count > 0) {
    totalReplacements += count;
    const dir = path.dirname(path.relative(process.cwd(), f));
    byDir[dir] = (byDir[dir] || 0) + count;
    changedFiles.push({ f, count });
    if (APPLY) fs.writeFileSync(f, out);
  }
}

console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — ${totalReplacements} replacements across ${changedFiles.length} files`);
console.log('\nTop directories:');
Object.entries(byDir).sort((a,b) => b[1]-a[1]).slice(0,25).forEach(([d,n]) => console.log(`  ${n.toString().padStart(4)}  ${d}`));
