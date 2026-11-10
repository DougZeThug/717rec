// FAKE DATA ONLY. Builds the route handler and the sign-in seed for the league-night mocks.
// Order for each blocked request: auth endpoints (signed-in mocks only), RPCs listed in rpc.mjs, reads of any table in
// the table map, fake-success writes, then the standings mock, then the tool's own fallback ([] for reads).
import standingsMock from '../standings-mock.mjs';
import { RPC } from './rpc.mjs';
import { CORS, fakeWrite, json, read } from './postgrest.mjs';
import { TABLES as LEAGUE_NIGHT } from './data.mjs';
import { EXTRA_TABLES } from './extras.mjs';

// The auth storage key is built from the project ref in the URL the app falls back to when no VITE_SUPABASE_URL is
// set (src/integrations/supabase/client.ts). Change it here if the dev server runs against another project.
const AUTH_STORAGE_KEY = 'sb-wcitdamvochthvxvtxyb-auth-token';

const makeUser = (person) => ({
  id: person.id, aud: 'authenticated', role: 'authenticated', email: person.email,
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: person.full_name },
  created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', email_confirmed_at: '2026-01-02T00:00:00Z',
});

const session = (user) => ({
  access_token: 'fake-access-token', refresh_token: 'fake-refresh-token', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, user,
});

// Runs in the browser before app code (shoot.mjs: context.addInitScript(init, initArg)). Self-contained on purpose.
// 1. Signed-in mocks: put the fake session where supabase-js looks for it.
// 2. Every mock: answer the Realtime WebSocket locally. Playwright's page.route cannot see WebSockets and the tool
//    blocks the host, so without this every channel reports CHANNEL_ERROR and live pages read "connecting".
//    The stand-in speaks just enough Phoenix (protocol 2.0.0, JSON arrays) to say "ok" to joins, heartbeats and
//    token pushes, echoing postgres_changes bindings with ids. It never sends a change event. Other sockets
//    (the Vite dev server's) get the real WebSocket.
export function init(arg) {
  if (arg && arg.key) {
    const now = Math.floor(Date.now() / 1000);
    window.localStorage.setItem(arg.key, JSON.stringify({ ...arg.session, expires_at: now + 3600 }));
    window.sessionStorage.removeItem('adminActiveTab');
  }
  const Real = window.WebSocket;
  class FakeRealtimeSocket extends EventTarget {
    constructor(url) {
      super();
      Object.assign(this, { url: String(url), readyState: 0, protocol: '', extensions: '', bufferedAmount: 0, binaryType: 'blob' });
      Object.assign(this, { onopen: null, onmessage: null, onclose: null, onerror: null });
      setTimeout(() => { this.readyState = 1; this.emit(new Event('open')); }, 5);
    }
    emit(event) { this.dispatchEvent(event); const handler = this[`on${event.type}`]; if (handler) handler.call(this, event); }
    send(data) {
      if (typeof data !== 'string') return;
      let msg;
      try { msg = JSON.parse(data); } catch { return; }
      const [joinRef, ref, topic, event, payload] = Array.isArray(msg) ? msg : [msg.join_ref, msg.ref, msg.topic, msg.event, msg.payload];
      if (ref == null) return;
      const changes = event === 'phx_join' ? ((payload && payload.config && payload.config.postgres_changes) || []) : [];
      const response = event === 'phx_join' ? { postgres_changes: changes.map((c, i) => ({ ...c, id: 9000 + i })) } : {};
      const reply = JSON.stringify([joinRef ?? null, ref, topic, 'phx_reply', { status: 'ok', response }]);
      setTimeout(() => { if (this.readyState === 1) this.emit(new MessageEvent('message', { data: reply })); }, 5);
    }
    close(code = 1000, reason = '') {
      if (this.readyState === 3) return;
      this.readyState = 3;
      setTimeout(() => this.emit(new CloseEvent('close', { code, reason, wasClean: true })), 0);
    }
  }
  function WebSocketSwitch(url, protocols) {
    return /supabase\.(co|com)/.test(String(url)) ? new FakeRealtimeSocket(url) : new Real(url, protocols);
  }
  Object.assign(WebSocketSwitch, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  WebSocketSwitch.prototype = Real.prototype;
  window.WebSocket = WebSocketSwitch;
}

export const initArgFor = (person) => (person ? { key: AUTH_STORAGE_KEY, session: session(makeUser(person)) } : {});

const TABLES = { ...LEAGUE_NIGHT, ...EXTRA_TABLES };
// Tables whose only SELECT policy is granted TO authenticated: a signed-out read gets zero rows and no error, as in
// the database (messages: migration 20251010171351).
const MEMBERS_ONLY = new Set(['messages']);
const tables = { ...TABLES, rowsOf(name) { const v = TABLES[name]; return typeof v === 'function' ? v() : (v ?? []); } };

export const createMock = (person) => {
  const user = person ? makeUser(person) : null;
  const ctx = { user };
  return async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: CORS, body: '' }); return true; }
    const url = new URL(req.url());
    const path = url.pathname;

    if (path.startsWith('/auth/v1/')) {
      if (!user) return false;
      if (path.endsWith('/user')) { await json(route, user); return true; }
      if (path.endsWith('/token')) { await json(route, session(user)); return true; }
      if (path.endsWith('/logout')) { await route.fulfill({ status: 204, headers: CORS, body: '' }); return true; }
      return false;
    }

    if (path.startsWith('/rest/v1/rpc/')) {
      const fn = RPC[path.split('/rest/v1/rpc/')[1]];
      if (!fn) return standingsMock(route);
      let body = {};
      try { body = req.postDataJSON() ?? {}; } catch { body = {}; }
      await json(route, fn(body, ctx));
      return true;
    }

    if (!path.startsWith('/rest/v1/')) return false;
    const table = path.split('/rest/v1/')[1];
    if (!(table in TABLES)) return standingsMock(route);
    if (!['GET', 'HEAD'].includes(req.method())) return fakeWrite(route, req);

    const { rows, total, offset } = !user && MEMBERS_ONLY.has(table)
      ? { rows: [], total: 0, offset: 0 }
      : read(tables, table, url.searchParams);
    const headers = (req.headers().prefer ?? '').includes('count=')
      ? { 'content-range': `${rows.length ? `${offset}-${offset + rows.length - 1}` : '*'}/${total}` } : {};
    if (req.method() === 'HEAD') { await route.fulfill({ status: 200, headers: { ...CORS, ...headers }, body: '' }); return true; }
    if ((req.headers().accept ?? '').includes('vnd.pgrst.object')) {
      await (rows.length === 1 ? json(route, rows[0], 200, headers)
        : json(route, { code: 'PGRST116', message: `JSON object requested, multiple (or no) rows returned`, details: `The result contains ${rows.length} rows`, hint: null }, 406));
      return true;
    }
    await json(route, rows, 200, headers);
    return true;
  };
};
