#!/usr/bin/env node
// Replace bare gray-* / slate-* / zinc-* Tailwind classes with semantic tokens.
// Conservative: only well-known mapped classes; skips arbitrary values, gradients,
// border-color modifiers without a clear semantic equivalent, etc.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'src');
const APPLY = process.argv.includes('--apply');

// Mapping: bare class -> semantic class. Whole-token replacement only.
// Apply same map to gray, slate, zinc (they're treated as neutral here).
const SHADES = {
  // backgrounds
  'bg-white': 'bg-background',
  'bg-{N}-50': 'bg-muted',
  'bg-{N}-100': 'bg-muted',
  'bg-{N}-800': 'bg-card',
  'bg-{N}-900': 'bg-background',
  'bg-{N}-950': 'bg-background',
  'hover:bg-{N}-50': 'hover:bg-muted',
  'hover:bg-{N}-100': 'hover:bg-accent',
  'hover:bg-{N}-800': 'hover:bg-accent',
  'dark:bg-{N}-800': 'dark:bg-card',
  'dark:bg-{N}-900': 'dark:bg-background',

  // text
  'text-white': null, // keep — white-on-colored is intentional
  'text-{N}-700': 'text-foreground',
  'text-{N}-800': 'text-foreground',
  'text-{N}-900': 'text-foreground',
  'text-{N}-400': 'text-muted-foreground',
  'text-{N}-500': 'text-muted-foreground',
  'text-{N}-600': 'text-muted-foreground',
  'dark:text-{N}-100': 'dark:text-foreground',
  'dark:text-{N}-200': 'dark:text-foreground',
  'dark:text-{N}-300': 'dark:text-muted-foreground',
  'dark:text-{N}-400': 'dark:text-muted-foreground',

  // borders
  'border-{N}-200': 'border-border',
  'border-{N}-300': 'border-border',
  'border-{N}-700': 'border-border',
  'border-{N}-800': 'border-border',
  'dark:border-{N}-700': 'dark:border-border',
  'dark:border-{N}-800': 'dark:border-border',
};

const NEUTRALS = ['gray', 'slate', 'zinc'];
// Build expanded map: realClass -> semantic
const MAP = new Map();
for (const [tpl, val] of Object.entries(SHADES)) {
  if (val === null) continue;
  if (tpl.includes('{N}')) {
    for (const n of NEUTRALS) MAP.set(tpl.replace('{N}', n), val);
  } else {
    MAP.set(tpl, val);
  }
}

// Build a single regex matching any of the keys, with word boundaries.
const escapeRe = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
const KEYS = [...MAP.keys()].sort((a,b) => b.length - a.length);
const RE = new RegExp(`(^|[\\s"'\`])(${KEYS.map(escapeRe).join('|')})(?=[\\s"'\`]|$)`, 'g');

function transform(src) {
  let count = 0;
  const replaceFn = (m, lead, cls) => { count++; return lead + MAP.get(cls); };
  // Only process content inside string literals to be safe-ish
  let out = '';
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"' || ch === '`') {
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
      const replaced = buf.replace(RE, replaceFn);
      out += quote + replaced + quote;
      i = j + 1;
    } else if (ch === '/' && src[i+1] === '/') {
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
      if (['node_modules','dist','.git','__tests__'].includes(e.name)) continue;
      walk(p, files);
    } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      // Skip files that intentionally encode brand color palettes
      const skip = [
        'design-system/semanticColors',
        'design-system/gradients',
        'design-system/blueAmber',
        'design-system/divisions',
        'utils/colors/',
        'utils/charts/',
        'utils/badgeConfig',
        'utils/divisionColors',
        'styles/bracket-styles',
      ];
      if (skip.some((s) => p.replace(/\\/g,'/').includes(s))) continue;
      files.push(p);
    }
  }
  return files;
}

const files = walk(ROOT);
let total = 0;
const byDir = {};
const changedFiles = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const { out, count } = transform(src);
  if (count > 0) {
    total += count;
    const d = path.dirname(path.relative(process.cwd(), f));
    byDir[d] = (byDir[d] || 0) + count;
    changedFiles.push({ f, count });
    if (APPLY) fs.writeFileSync(f, out);
  }
}
console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — ${total} replacements across ${changedFiles.length} files`);
console.log('\nTop dirs:');
Object.entries(byDir).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([d,n]) => console.log(`  ${n.toString().padStart(4)}  ${d}`));
console.log('\nTop files:');
changedFiles.sort((a,b)=>b.count-a.count).slice(0,15).forEach(({f,count}) => console.log(`  ${count.toString().padStart(4)}  ${f}`));
