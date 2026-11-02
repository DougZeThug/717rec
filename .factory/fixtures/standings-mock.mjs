// FAKE DATA ONLY. Mock for `node factory/bin/shoot.mjs --mock`. No real league names or people.
// Serves the /stats page reads: seasons, v_team_details, matches, theme_settings. Other reads get [] from the tool.
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const SEASON = ID(1);
const DIVS = [{ id: ID(11), name: 'Fake Division North' }, { id: ID(12), name: 'Fake Division South' }];
// [name, division index, wins, losses, game wins, game losses, power score, sos]
const T = [
  ['Fake Team Alpha', 0, 9, 1, 19, 6, 88.2, 0.56],
  ['Fake Team Bravo With A Very Long Name Here', 0, 8, 2, 17, 8, 79.5, 0.54],
  ['Fake Team Charlie', 0, 6, 4, 14, 12, 61.3, 0.5],
  ['Fake Team Delta And The Extremely Long Roster', 0, 4, 6, 11, 14, 47.8, 0.52],
  ['Fake Team Echo', 0, 1, 9, 5, 19, 22.4, 0.49],
  ['Fake Team Foxtrot', 1, 7, 3, 16, 9, 70.1, 0.51],
  ['Fake Team Golf Supercalifragilistic Edition', 1, 6, 4, 13, 11, 58.6, 0.5],
  ['Fake Team Hotel', 1, 5, 5, 12, 12, 52.0, 0.48],
  ['Fake Team India', 1, 3, 7, 8, 16, 35.9, 0.53],
  ['Fake Team Juliet', 1, 2, 8, 6, 17, 28.7, 0.47],
];
const teams = T.map(([name, d, w, l, gw, gl, ps, sos], i) => ({
  team_id: ID(100 + i), name, logo_url: null, image_url: null, wins: w, losses: l, game_wins: gw, game_losses: gl,
  division_id: DIVS[d].id, divisionname: DIVS[d].name, sos, power_score: ps, career_power_score: ps,
  win_percentage: +(w / (w + l)).toFixed(3), game_win_percentage: +(gw / (gw + gl)).toFixed(3),
  players: `Fake Player ${i}A, Fake Player ${i}B`, created_at: '2026-01-01T00:00:00Z', close_match_losses: i % 3,
}));
const season = {
  id: SEASON, name: 'Fake Season 2026', is_active: true, is_archived: false, playoffs_active: false,
  start_date: '2026-01-05', end_date: '2026-06-30', created_at: '2026-01-01T00:00:00Z',
  champion_team_id: null, runner_up_team_id: null, confirmation_open: false,
};
// Completed matches: team i beats team i+1 within the same list, one per week.
const matches = teams.slice(0, 9).map((t, i) => ({
  id: ID(200 + i), team1_id: t.team_id, team2_id: teams[i + 1].team_id, team1_score: 21, team2_score: 15 - i,
  date: new Date(Date.UTC(2026, 2, 1 + i * 7, 23)).toISOString(), location: 'Fake Lanes', iscompleted: true,
  winner_id: t.team_id, loser_id: teams[i + 1].team_id, round_number: null, position: null, bracket_id: null,
  match_type: 'regular', next_match_id: null, next_loser_match_id: null, best_of: 1,
  team1_game_wins: 2, team2_game_wins: 1, created_at: '2026-03-01T00:00:00Z',
})).reverse();
const themes = ['light', 'dark', 'winter'].map((k, i) => ({
  id: ID(300 + i), theme_key: k, label: k, is_enabled: true, sort_order: i, updated_at: '2026-01-01T00:00:00Z',
}));
const TABLES = { seasons: [season], v_team_details: teams, matches, theme_settings: themes };

export default async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: CORS, body: '' }); return true; }
  if (req.method() !== 'GET') return false;
  const url = new URL(req.url());
  const table = url.pathname.split('/rest/v1/')[1];
  if (!(table in TABLES)) return false;
  let rows = TABLES[table];
  // Simple filters only: col=eq.value
  for (const [k, v] of url.searchParams) {
    if (!v.startsWith('eq.') || ['select', 'order', 'limit'].includes(k)) continue;
    const want = v.slice(3);
    rows = rows.filter((r) => String(r[k]) === want);
  }
  const single = (req.headers().accept ?? '').includes('vnd.pgrst.object');
  if (single) {
    await route.fulfill(rows.length
      ? { status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(rows[0]) }
      : { status: 406, contentType: 'application/json', headers: CORS, body: JSON.stringify({ code: 'PGRST116', message: 'no rows', details: null, hint: null }) });
    return true;
  }
  await route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(rows) });
  return true;
};
