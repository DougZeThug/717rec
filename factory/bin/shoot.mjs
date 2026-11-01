// Screenshot a running app at phone + desktop size and report console errors.
// Fail-closed for data safety: any request to a blocked host is answered locally
// (GET/OPTIONS -> empty JSON, everything else -> aborted). Nothing reaches production.
// Usage: node factory/bin/shoot.mjs --out <dir> [--url <base>] [--routes /,/x] [--mock <module.mjs>]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hostBlocked, loadConfig } from './lib.mjs';

const arg = (name, fallback) => { const at = process.argv.indexOf(`--${name}`); return at > 0 ? process.argv[at + 1] : fallback; };
const cfg = loadConfig();
const base = arg('url', cfg.preview?.url ?? 'http://localhost:8080');
const routes = (arg('routes') ?? (cfg.preview?.routes ?? ['/']).join(',')).split(',');
const out = resolve(arg('out', '.factory/evidence/screens'));
const blocked = cfg.preview?.blockedHosts ?? [];
// Fail closed: with no blocklist every request would reach the real backend.
if (!Array.isArray(blocked) || blocked.length === 0) {
  console.error('shoot: preview.blockedHosts in .factory/config.json is empty. Add the production hosts (for example "supabase.co") so no screenshot run can reach live data.');
  process.exit(2);
}
const VIEWPORTS = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

const { chromium } = await import('playwright').catch(() => import('@playwright/test'));
// Network boundary: the browser itself cannot resolve a blocked host, so a redirect hop, a service worker or a
// WebSocket cannot reach it either. The route handler below only supplies local stand-in answers.
const dnsBlock = blocked.flatMap((host) => [`MAP ${host} ~NOTFOUND`, `MAP *.${host} ~NOTFOUND`]).join(', ');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: [`--host-resolver-rules=${dnsBlock}`] });
const mock = arg('mock') ? (await import(pathToFileURL(resolve(arg('mock'))).href)).default : null;
mkdirSync(out, { recursive: true });
const report = { base, shots: [], consoleErrors: [], blockedRequests: [], overflow: [] };

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: size, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.route('**/*', async (route) => {
    const req = route.request();
    if (!hostBlocked(req.url(), blocked)) {
      await route.continue();
      return;
    }
    const target = new URL(req.url());
    report.blockedRequests.push(`${req.method()} ${target.hostname}${target.pathname}`);
    if (mock && (await mock(route))) return;
    if (['GET', 'OPTIONS', 'HEAD'].includes(req.method())) {
      await route.fulfill({ status: req.method() === 'OPTIONS' ? 204 : 200, contentType: 'application/json', headers: CORS, body: req.method() === 'OPTIONS' ? '' : '[]' });
      return;
    }
    await route.abort();
  });
  // A failed load is only expected for a blocked host (we aborted it on purpose). Any other failed load is a real error.
  page.on('console', (msg) => msg.type() === 'error' && !(/Failed to load resource/.test(msg.text()) && (msg.location()?.url ?? '') !== '' && hostBlocked(msg.location().url, blocked)) && report.consoleErrors.push(`[${vp}] ${msg.text().slice(0, 200)}`));
  page.on('pageerror', (error) => report.consoleErrors.push(`[${vp}] uncaught: ${error.message.slice(0, 200)}`));
  for (const route of routes) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 30000 }).catch((error) => report.consoleErrors.push(`[${vp}] navigation ${route}: ${error.message.slice(0, 120)}`));
    await page.waitForTimeout(Number(arg('settle', cfg.preview?.settleMs ?? 2500)));
    const name = `${vp}-${route === '/' ? 'home' : route.replace(/\W+/g, '-').replace(/^-|-$/g, '')}.png`;
    await page.screenshot({ path: join(out, name), fullPage: true });
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (wide) report.overflow.push(`${vp} ${route}: page scrolls sideways`);
    report.shots.push(join(out, name));
  }
  await ctx.close();
}
await browser.close();
report.blockedRequests = [...new Set(report.blockedRequests)];
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.consoleErrors.length || report.overflow.length ? 1 : 0;
