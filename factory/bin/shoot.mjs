#!/usr/bin/env node
// Screenshot a running app at phone + desktop size and report console errors.
// Fail-closed for data safety: any request to a blocked host is answered locally
// (GET/OPTIONS -> empty JSON, everything else -> aborted). Nothing reaches production.
// Usage: node factory/bin/shoot.mjs --out <dir> [--url <base>] [--routes /,/x] [--mock <module.mjs>]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './lib.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const cfg = loadConfig();
const base = arg('url', cfg.preview?.url ?? 'http://localhost:8080');
const routes = (arg('routes') ?? (cfg.preview?.routes ?? ['/']).join(',')).split(',');
const out = resolve(arg('out', '.factory/evidence/screens'));
const blocked = cfg.preview?.blockedHosts ?? [];
const VIEWPORTS = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

const { chromium } = await import('playwright').catch(() => import('@playwright/test'));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
const mock = arg('mock') ? (await import(pathToFileURL(resolve(arg('mock'))).href)).default : null;
mkdirSync(out, { recursive: true });
const report = { base, shots: [], consoleErrors: [], blockedRequests: [], overflow: [] };

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: size });
  const page = await ctx.newPage();
  await page.route('**/*', async (route) => {
    const req = route.request();
    const host = new URL(req.url()).hostname;
    if (!blocked.some((b) => host.endsWith(b))) return route.continue();
    report.blockedRequests.push(`${req.method()} ${host}${new URL(req.url()).pathname}`);
    if (mock && (await mock(route))) return;
    if (['GET', 'OPTIONS', 'HEAD'].includes(req.method())) return route.fulfill({ status: req.method() === 'OPTIONS' ? 204 : 200, contentType: 'application/json', headers: CORS, body: req.method() === 'OPTIONS' ? '' : '[]' });
    return route.abort();
  });
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && report.consoleErrors.push(`[${vp}] ${m.text().slice(0, 200)}`));
  page.on('pageerror', (e) => report.consoleErrors.push(`[${vp}] uncaught: ${e.message.slice(0, 200)}`));
  for (const r of routes) {
    await page.goto(base + r, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => report.consoleErrors.push(`[${vp}] navigation ${r}: ${e.message.slice(0, 120)}`));
    await page.waitForTimeout(Number(arg('settle', cfg.preview?.settleMs ?? 2500)));
    const name = `${vp}-${r === '/' ? 'home' : r.replace(/\W+/g, '-').replace(/^-|-$/g, '')}.png`;
    await page.screenshot({ path: join(out, name), fullPage: true });
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (wide) report.overflow.push(`${vp} ${r}: page scrolls sideways`);
    report.shots.push(join(out, name));
  }
  await ctx.close();
}
await browser.close();
report.blockedRequests = [...new Set(report.blockedRequests)];
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.consoleErrors.length || report.overflow.length ? 1 : 0);
