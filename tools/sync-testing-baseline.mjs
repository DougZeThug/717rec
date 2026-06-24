import { readFile, writeFile } from 'node:fs/promises';

const COVERAGE_SUMMARY_PATH = 'coverage/coverage-summary.json';
const TESTING_DOC_PATH = 'TESTING.md';

const BASELINE_START = '## Current baseline';
const BASELINE_END = '## Coverage threshold policy';

const METRICS = [
  ['Lines', 'lines'],
  ['Statements', 'statements'],
  ['Functions', 'functions'],
  ['Branches', 'branches'],
];

const formatPercent = (value) => `${Number(value).toFixed(2)}%`;

const isoDate = new Date().toISOString().slice(0, 10);

const summaryRaw = await readFile(COVERAGE_SUMMARY_PATH, 'utf8');
const summary = JSON.parse(summaryRaw);
const total = summary?.total;

if (!total) {
  throw new Error(`Missing total section in ${COVERAGE_SUMMARY_PATH}`);
}

for (const [, key] of METRICS) {
  if (!Number.isFinite(total?.[key]?.pct)) {
    throw new Error(`Missing valid total.${key}.pct in ${COVERAGE_SUMMARY_PATH}`);
  }
}

const testingRaw = await readFile(TESTING_DOC_PATH, 'utf8');

const startIndex = testingRaw.indexOf(BASELINE_START);
const endIndex = testingRaw.indexOf(BASELINE_END);

if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
  throw new Error(`Could not locate baseline section markers in ${TESTING_DOC_PATH}`);
}

const before = testingRaw.slice(0, startIndex);
const baselineBlock = testingRaw.slice(startIndex, endIndex);
const after = testingRaw.slice(endIndex);

let updatedBaseline = baselineBlock.replace(
  /Last measured: .*$/m,
  `Last measured: ${isoDate}.`,
);

for (const [label, key] of METRICS) {
  const rowPattern = new RegExp(`\\|\\s*${label}\\s*\\|\\s*[^|]+\\|`);
  updatedBaseline = updatedBaseline.replace(
    rowPattern,
    `| ${label.padEnd(10, ' ')} | ${formatPercent(total[key].pct).padEnd(7, ' ')} |`,
  );
}

if (updatedBaseline === baselineBlock) {
  process.stdout.write(`${TESTING_DOC_PATH} baseline already matches ${COVERAGE_SUMMARY_PATH} (${isoDate}).\n`);
} else {
  await writeFile(TESTING_DOC_PATH, `${before}${updatedBaseline}${after}`, 'utf8');

  process.stdout.write(`Updated ${TESTING_DOC_PATH} baseline from ${COVERAGE_SUMMARY_PATH} (${isoDate}).\n`);
}
