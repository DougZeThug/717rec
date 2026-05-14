#!/usr/bin/env node
// Replace adjacent `w-X h-X` (or `h-X w-X`) class pairs with `size-X`.
// Only collapses when:
//   - both tokens are bare (no responsive/state prefix), OR both share the SAME prefix
//   - values are identical
//   - value is a recognized size literal (number, fraction, full/screen/auto/px, or arbitrary [..])
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'src');
const APPLY = process.argv.includes('--apply');

const VALUE = String.raw`(?:\d+(?:\.\d+)?|\d+\/\d+|full|screen|auto|min|max|fit|px|\[[^\]\s]+\])`;
// Optional matching prefixes like "md:" "hover:" "dark:md:". We require both sides share the same prefix block.
const PREFIX = String.raw`(?:[a-z0-9-]+:)*`;

// Two patterns: w then h, h then w. Capture prefix once and require match.
const RE_WH = new RegExp(String.raw`(^|\s)(${PREFIX})w-(${VALUE})\s+\2h-\3(?=\s|$|"|'|\`)`, 'g');
const RE_HW = new RegExp(String.raw`(^|\s)(${PREFIX})h-(${VALUE})\s+\2w-\3(?=\s|$|"|'|\`)`, 'g');

function transform(src) {
  let out = src;
  let count = 0;
  const repl = (m, lead, prefix, val) => { count++; return `${lead}${prefix}size-${val}`; };
  out = out.replace(RE_WH, repl);
  out = out.replace(RE_HW, repl);
  return { out, count };
}

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
      walk(p, files);
    } else if (/\.(tsx?|jsx?|css|html|mdx?)$/.test(e.name)) {
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
Object.entries(byDir).sort((a,b) => b[1]-a[1]).slice(0,20).forEach(([d,n]) => console.log(`  ${n.toString().padStart(4)}  ${d}`));
