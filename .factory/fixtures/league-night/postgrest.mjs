// FAKE DATA ONLY. A small PostgREST stand-in for the league-night screenshot mocks (Node side, never in the browser).
// It answers GET/HEAD reads from an in-memory table map: eq/neq/gt/gte/lt/lte/in/is/like/ilike/cs filters, not.,
// nested or=/and=, order (also order=embed(col)), limit/offset, Prefer: count=exact (content-range), single-object
// reads (Accept: application/vnd.pgrst.object+json) and embedded selects such as
// team1:v_team_details!team1_id(...), teams!matches_team1_id_fkey(id, divisions(name)), teams:team_id(name),
// seasons!inner(name) and one-to-many games(...). Rows keep every column (extra columns are harmless to the app).
// Writes are answered with a plausible success and are NOT stored: a screenshot run never persists anything.
export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-expose-headers': 'content-range, x-total-count',
};

export const json = (route, body, status = 200, headers = {}) =>
  route.fulfill({ status, contentType: 'application/json', headers: { ...CORS, ...headers }, body: body === undefined ? '' : JSON.stringify(body) });

// ---- select parsing ----
const splitTop = (text) => {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur) parts.push(cur);
  return parts;
};

export const parseSelect = (text) => splitTop((text ?? '*').replace(/\s+/g, '')).map((raw) => {
  const item = raw.startsWith('...') ? raw.slice(3) : raw;
  const open = item.indexOf('(');
  const head = open >= 0 ? item.slice(0, open) : item;
  const children = open >= 0 ? parseSelect(item.slice(open + 1, -1)) : null;
  const colon = head.search(/:(?!:)/);
  const alias = colon > 0 && head[colon + 1] !== ':' ? head.slice(0, colon) : null;
  const rest = alias ? head.slice(colon + 1) : head;
  const [name, ...hints] = rest.split('::')[0].split('!');
  return { raw, alias, name, hints, children, spread: raw.startsWith('...') };
});

// ---- relationships ----
// FK column -> target table. A column not listed here falls back to "<x>_id" -> "<x>s".
const FK_TABLE = {
  team1_id: 'teams', team2_id: 'teams', winner_id: 'teams', loser_id: 'teams', team_id: 'teams', opponent_id: 'teams',
  winner_team_id: 'teams', champion_team_id: 'teams', runner_up_team_id: 'teams',
  user_id: 'profiles', created_by: 'profiles', profile_id: 'profiles', submitted_by: 'profiles',
  match_id: 'matches', game_id: 'games', message_id: 'messages', division_id: 'divisions', season_id: 'seasons',
  bracket_id: 'brackets', player_id: 'team_players', recap_edition_id: 'recap_editions', edition_id: 'recap_editions',
};
const KEY = { v_team_details: 'team_id', v_player_season_stats: 'player_id' };
const singular = (t) => t.replace(/^v_/, '').replace(/_details$/, '').replace(/ies$/, 'y').replace(/(ch|sh|x)es$/, '$1').replace(/s$/, '');

export const shape = (tables, table, row, items) => {
  // Nested so the two can call each other with no forward reference.
  const embed = (tables, parentTable, row, item) => {
    const named = item.name;
    const target = tables[named] !== undefined ? named : (item.alias && tables[item.alias] !== undefined ? item.alias : FK_TABLE[named]);
    if (!target || tables[target] === undefined) return { value: null, known: false };
    const rows = tables.rowsOf(target);
    const hint = item.hints.find((h) => h !== 'inner' && h !== 'left');
    let fk = null;
    if (tables[named] === undefined && named in row) fk = named; // teams:team_id(...)
    else if (hint && hint in row) fk = hint; // v_team_details!team1_id(...)
    else if (hint) {
      const match = new RegExp(`^${parentTable}_(\\w+)_fkey$`).exec(hint); // teams!matches_team1_id_fkey(...)
      if (match && match[1] in row) fk = match[1];
    }
    if (!fk && `${singular(target)}_id` in row) fk = `${singular(target)}_id`;
    if (fk) {
      const key = KEY[target] ?? 'id';
      const found = rows.find((r) => r[key] === row[fk] && row[fk] != null) ?? null;
      return { value: found ? shape(tables, target, found, item.children) : null, known: true };
    }
    // one-to-many: child rows that point back at the parent
    const back = `${singular(parentTable)}_id`;
    const parentKey = row[KEY[parentTable] ?? 'id'];
    const kids = rows.filter((r) => r[back] === parentKey);
    return { value: kids.map((k) => shape(tables, target, k, item.children)), known: true };
  };

  if (!items) return { ...row };
  const out = { ...row };
  for (const item of items) {
    if (item.children) {
      const { value } = embed(tables, table, row, item);
      if (item.spread && value && !Array.isArray(value)) Object.assign(out, value);
      else out[item.alias ?? item.name] = value;
    } else if (item.alias) out[item.alias] = row[item.name];
  }
  return out;
};

// ---- filters ----
const num = (v) => (/^-?\d+(\.\d+)?$/.test(String(v)) ? Number(v) : Date.parse(v));
export const test = (cell, spec) => {
  if (spec.startsWith('not.')) return !test(cell, spec.slice(4));
  const dot = spec.indexOf('.');
  const op = spec.slice(0, dot);
  const val = spec.slice(dot + 1);
  const text = cell === null || cell === undefined ? 'null' : String(cell);
  if (op === 'is') return val === 'null' ? cell == null : val === 'true' ? cell === true : val === 'false' ? cell === false : text === val;
  if (op === 'eq') return text === val.replace(/^"|"$/g, '');
  if (op === 'neq') return text !== val;
  if (op === 'in') return val.slice(1, -1).split(',').map((v) => v.replace(/^"|"$/g, '')).includes(text);
  if (op === 'like' || op === 'ilike') {
    const re = new RegExp(`^${val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[*%]/g, '.*')}$`, op === 'ilike' ? 'i' : '');
    return re.test(text);
  }
  if (op === 'cs') return Array.isArray(cell) && val.replace(/^[{[]|[}\]]$/g, '').split(',').every((v) => cell.map(String).includes(v.replace(/"/g, '')));
  if (['gt', 'gte', 'lt', 'lte'].includes(op)) {
    if (cell == null) return false;
    const [a, b] = [num(text), num(val)];
    if (Number.isNaN(a) || Number.isNaN(b)) return op.startsWith('gt') ? text > val || (op === 'gte' && text === val) : text < val || (op === 'lte' && text === val);
    return op === 'gt' ? a > b : op === 'gte' ? a >= b : op === 'lt' ? a < b : a <= b;
  }
  return true; // fts and other operators do not filter
};

const cellOf = (row, path) => {
  const m = /^(\w+)\((\w+)\)$/.exec(path) ?? /^(\w+)\.(\w+)$/.exec(path);
  if (m) { const v = row[m[1]]; return Array.isArray(v) ? v[0]?.[m[2]] : v?.[m[2]]; }
  return row[path];
};

// "a.eq.1,and(b.gt.2,c.is.null),d.in.(x,y)" inside or=(...) / and=(...)
const logic = (row, kind, body) => {
  const terms = splitTop(body).map((t) => {
    const m = /^(not\.)?(and|or)\((.*)\)$/.exec(t);
    if (m) return () => { const r = logic(row, m[2], m[3]); return m[1] ? !r : r; };
    const dot = t.indexOf('.');
    return () => test(cellOf(row, t.slice(0, dot)), t.slice(dot + 1));
  });
  return kind === 'or' ? terms.some((f) => f()) : terms.every((f) => f());
};


const sortRows = (rows, order) => {
  const keys = order.split(',').map((o) => {
    const [path, ...mods] = o.split('.');
    return { path, sign: mods.includes('desc') ? -1 : 1, nullsFirst: mods.includes('nullsfirst') ? true : mods.includes('nullslast') ? false : mods.includes('desc') };
  });
  return [...rows].sort((a, b) => {
    for (const { path, sign, nullsFirst } of keys) {
      const [x, y] = [cellOf(a, path), cellOf(b, path)];
      if (x === y) continue;
      if (x == null) return nullsFirst ? -1 : 1;
      if (y == null) return nullsFirst ? 1 : -1;
      return (x > y ? 1 : -1) * sign;
    }
    return 0;
  });
};

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'or', 'and', 'on_conflict', 'columns']);

/** Run a GET/HEAD read. `tables` must have rowsOf(name). Returns { rows, total }. */
export const read = (tables, table, params) => {
  const items = parseSelect(params.get('select'));
  let rows = tables.rowsOf(table).map((r) => shape(tables, table, r, items));
  // !inner embeds drop the parent row when the embed is empty
  for (const item of items) {
    if (item.children && item.hints.includes('inner')) {
      const key = item.alias ?? item.name;
      rows = rows.filter((r) => (Array.isArray(r[key]) ? r[key].length : r[key]));
    }
  }
  for (const [k, v] of params) {
    if (RESERVED.has(k) || /\.(order|limit|offset)$/.test(k)) continue;
    if (k.endsWith('.or') || k.endsWith('.and')) continue;
    rows = rows.filter((r) => {
      if (!k.includes('.')) return test(r[k], v);
      const [rel, col] = k.split('.');
      const emb = r[rel];
      if (emb == null) return !items.some((i) => (i.alias ?? i.name) === rel && i.hints.includes('inner'));
      if (Array.isArray(emb)) { r[rel] = emb.filter((e) => test(e[col], v)); return true; }
      return test(emb[col], v);
    });
  }
  for (const kind of ['or', 'and']) {
    for (const v of params.getAll(kind)) rows = rows.filter((r) => logic(r, kind, v.slice(1, -1)));
  }
  if (params.has('order')) rows = sortRows(rows, params.get('order'));
  const total = rows.length;
  const offset = Number(params.get('offset') ?? 0);
  if (offset) rows = rows.slice(offset);
  if (params.has('limit')) rows = rows.slice(0, Number(params.get('limit')));
  return { rows, total, offset };
};

let writeCounter = 0;
/** Answer a POST/PATCH/DELETE to /rest/v1/<table> as a success without storing it. */
export const fakeWrite = async (route, req) => {
  const method = req.method();
  const prefer = req.headers().prefer ?? '';
  const single = (req.headers().accept ?? '').includes('vnd.pgrst.object');
  if (method === 'DELETE' || !prefer.includes('return=representation')) {
    await route.fulfill({ status: method === 'POST' ? 201 : 204, headers: CORS, body: '' });
    return true;
  }
  let body = null;
  try { body = req.postDataJSON(); } catch { body = null; }
  const now = new Date().toISOString();
  const list = (Array.isArray(body) ? body : [body ?? {}]).map((r) => ({
    id: `00000000-0000-4000-9000-${String((writeCounter += 1)).padStart(12, '0')}`, created_at: now, updated_at: now, ...r,
  }));
  await json(route, single ? list[0] : list, method === 'POST' ? 201 : 200);
  return true;
};

/** Pull every row of a table from another mock module by calling it with a stand-in route. */
export const rowsFromMock = async (mock, table) => {
  let captured = null;
  const fake = {
    request: () => ({
      method: () => 'GET',
      url: () => `https://fake.supabase.co/rest/v1/${table}?select=*`,
      headers: () => ({ accept: 'application/json' }),
      postDataJSON: () => ({}),
    }),
    fulfill: async ({ body }) => { captured = body; },
  };
  const handled = await mock(fake);
  return handled && captured ? JSON.parse(captured) : null;
};
