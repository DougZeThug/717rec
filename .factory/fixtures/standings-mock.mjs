// FAKE DATA ONLY. Mock for `node factory/bin/shoot.mjs --mock`. No real league names or people.
// Serves the /stats page, every section of /teams/<slug> (full data for "Fake Team Bravo ...") and the signed-out
// home page (/): hero cards, Team of the Week, Weekly Recap, Pending Scores, Top Teams.
// Tables: seasons, v_team_details, matches, theme_settings, teams, divisions, team_season_stats, matches_archive,
// team_badge_events, v_player_season_stats, ranking_snapshots, power_score_snapshots, hero_cards, v_pending_matches.
// RPC: get_head_to_head_records, get_batch_head_to_head, get_blind_draw_signup_count.
// Not served on purpose (the tool answers []): brackets (would flip the recap to playoff mode), recap_editions,
// admin_notifications. Every image field is null so no fake row can make the page call an image host.
// Other reads get [] from the tool.
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const SEASON = ID(1);
const BRAVO = 1; // index in T of the team whose page is filled in
// tier = season-style label (team_season_stats, career tiers); weight/display = divisions table columns
const DIVS = [
  { id: ID(11), name: 'Fake Division North', tier: 'Competitive 1', display: 'Competitive', weight: 0.95 },
  { id: ID(12), name: 'Fake Division South', tier: 'Intermediate 1', display: 'Intermediate', weight: 0.75 },
];
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
// v_team_details rows. `players` is an array of name strings (the view returns text[]).
const teams = T.map(([name, d, w, l, gw, gl, ps, sos], i) => ({
  team_id: ID(100 + i), name, logo_url: null, image_url: null, wins: w, losses: l, game_wins: gw, game_losses: gl,
  division_id: DIVS[d].id, divisionname: DIVS[d].name, sos, power_score: ps, career_power_score: ps,
  win_percentage: +(w / (w + l)).toFixed(3), game_win_percentage: +(gw / (gw + gl)).toFixed(3),
  players: ['A', 'B', ...(i === BRAVO ? ['C', 'D With A Long Name'] : [])].map((s) => `Fake Player ${i}${s}`),
  created_at: '2026-01-01T00:00:00Z', close_match_losses: i % 3,
}));
const divOf = (t) => DIVS.find((d) => d.id === t.division_id);
const teamId = (i) => teams[i].team_id;

// ---- Seasons: the active one plus three archived ones ----
const season = {
  id: SEASON, name: 'Fake Season 2026', is_active: true, is_archived: false, playoffs_active: false,
  start_date: '2026-01-05', end_date: '2026-06-30', created_at: '2026-01-01T00:00:00Z',
  champion_team_id: null, runner_up_team_id: null, confirmation_open: false,
};
const OLD = [
  ['Fake Season 2024 Fall', '2024-08-05', '2024-12-14'],
  ['Fake Season 2025 Spring', '2025-01-06', '2025-06-28'],
  ['Fake Season 2025 Fall', '2025-08-04', '2025-12-13'],
].map(([name, start, end], i) => ({
  ...season, id: ID(2 + i), name, is_active: false, is_archived: true, start_date: start, end_date: end, created_at: `${start}T00:00:00Z`,
}));

// ---- Matches ----
// [team1, team2, team1 won?, loser's score, loser's games, week]. Winner scores 21 and wins 2 games.
// First 9: team i beats team i+1, one per week. Then 8 more so Bravo has 10 completed matches (8-2):
// 3 vs Charlie, 2 vs Delta, 1 vs Echo, 2 vs Foxtrot, and 2 losses to Alpha.
const PLAYED = [
  ...Array.from({ length: 9 }, (_, i) => [i, i + 1, true, 15 - i, 1, i]),
  [1, 3, true, 12, 0, 2], [4, 1, false, 14, 0, 3], [1, 2, true, 16, 1, 4], [0, 1, true, 11, 0, 5],
  [1, 5, true, 13, 0, 6], [3, 1, false, 17, 1, 7], [1, 2, true, 10, 0, 8], [1, 5, true, 15, 1, 9],
];
const matchBase = {
  location: 'Fake Lanes', round_number: null, position: null, bracket_id: null, match_type: 'regular',
  next_match_id: null, next_loser_match_id: null, best_of: 1, season_id: SEASON, metadata: null, created_at: '2026-03-01T00:00:00Z',
};
// Embedded team for the join-selects. One object fits both shapes the app asks for:
// v_team_details!team1_id(...) and teams!matches_team1_id_fkey(id, divisions(name)).
const brief = (i) => ({
  team_id: teamId(i), id: teamId(i), name: teams[i].name, image_url: null, logo_url: null,
  divisionname: teams[i].divisionname, divisions: { name: divOf(teams[i]).tier },
});
const played = PLAYED.map(([a, b, aWon, loseScore, loseGames, week], n) => ({
  ...matchBase, id: ID(200 + n), team1_id: teamId(a), team2_id: teamId(b),
  team1_score: aWon ? 21 : loseScore, team2_score: aWon ? loseScore : 21,
  team1_game_wins: aWon ? 2 : loseGames, team2_game_wins: aWon ? loseGames : 2,
  date: new Date(Date.UTC(2026, 2, 1 + week * 7, 23)).toISOString(), iscompleted: true,
  winner_id: teamId(aWon ? a : b), loser_id: teamId(aWon ? b : a), team1: brief(a), team2: brief(b),
}));
// Bravo's next match, always three days from now so it stays "upcoming".
const soon = new Date(Date.now() + 3 * 864e5);
soon.setUTCHours(23, 0, 0, 0);
const upcoming = {
  ...matchBase, id: ID(230), team1_id: teamId(BRAVO), team2_id: teamId(0), team1_score: null, team2_score: null,
  team1_game_wins: null, team2_game_wins: null, date: soon.toISOString(), iscompleted: false,
  winner_id: null, loser_id: null, team1: brief(BRAVO), team2: brief(0),
};
const matches = [...played, upcoming];

const themes = ['light', 'dark', 'winter'].map((k, i) => ({
  id: ID(300 + i), theme_key: k, label: k, is_enabled: true, sort_order: i, updated_at: '2026-01-01T00:00:00Z',
}));

// ---- Career: divisions, teams (with embedded division), team_season_stats ----
const divisions = DIVS.map((d) => ({ id: d.id, name: d.name, division_weight: d.weight, display_division: d.display, created_at: '2026-01-01T00:00:00Z' }));
const teamRows = teams.map((t) => ({
  id: t.team_id, name: t.name, image_url: null, logo_url: null, division_id: t.division_id, wins: t.wins, losses: t.losses,
  divisions: { name: divOf(t).tier, division_weight: divOf(t).weight, display_division: divOf(t).display },
}));
// Playoff order per old season, best first (North teams only). Bravo: runner-up, then champion, then third.
const FINISH = [[0, 1, 2, 3], [1, 0, 2, 4], [0, 2, 1, 3]];
const seasonStats = OLD.flatMap((s, si) => T.map(([, d, w, , , , ps, sos], i) => {
  const mw = Math.min(10, Math.max(0, w + [-1, 1, 0][si] * (i % 2 ? 1 : -1)));
  const ml = 10 - mw;
  const rank = FINISH[si].indexOf(i) + 1 || null;
  const power = +Math.min(0.97, Math.max(0.05, ps / 100 + [-0.04, 0.03, -0.02][si])).toFixed(3); // 0-1 scale here
  return {
    team_id: teamId(i), season_id: s.id, match_wins: mw, match_losses: ml,
    game_wins: 2 * mw + Math.ceil(ml / 2), game_losses: 2 * ml + Math.ceil(mw / 2), sos: +(sos + (si - 1) * 0.01).toFixed(3),
    power_score: power, career_power_score: power, champion: rank === 1, runner_up: rank === 2, playoff_rank: rank,
    division_name: DIVS[d].tier, seasons: { id: s.id, name: s.name, start_date: s.start_date },
  };
}));

// ---- Archived matches (Bravo, old seasons): feed career sweep and clutch figures ----
// Each old season gets 10 results matching Bravo's team_season_stats row. Wins are 2-0 sweeps unless k is a multiple of 3 (2-1).
const archive = OLD.flatMap((s) => {
  const wins = seasonStats.find((r) => r.season_id === s.id && r.team_id === teamId(BRAVO)).match_wins;
  return Array.from({ length: 10 }, (_, k) => {
    const won = k < wins;
    const lostGames = k % 3 === 0 ? 1 : 0;
    return {
      season_id: s.id, iscompleted: true, team1_id: teamId(BRAVO), team2_id: teamId([0, 2, 3, 4][k % 4]),
      winner_id: teamId(won ? BRAVO : [0, 2, 3, 4][k % 4]), loser_id: teamId(won ? [0, 2, 3, 4][k % 4] : BRAVO),
      team1_game_wins: won ? 2 : lostGames, team2_game_wins: won ? lostGames : 2,
    };
  });
});

// ---- Badges (Bravo only, active) ----
const badges = [
  ['competitive_champion', OLD[1], '2025-06-29', 3, 0],
  ['competitive_runner_up', OLD[0], '2024-12-15', 2, 1],
  ['clutch_performer', season, '2026-04-20', 0, 0],
].map(([type, s, at, pw, pl], k) => ({
  id: ID(600 + k), team_id: teamId(BRAVO), badge_type: type, season_id: s.id, awarded_at: `${at}T12:00:00Z`, is_active: true,
  created_at: `${at}T12:00:00Z`, metadata: { season_name: s.name, division_name: 'Competitive 1', playoff_wins: pw, playoff_losses: pl },
}));

// ---- Live-scoring player stats (Bravo, active season) ----
// [name suffix, rounds thrown, points for, points against]
const playerStats = [['1A', 64, 158, 120], ['1B', 60, 141, 118], ['1C', 24, 52, 55]].map(([n, r, pf, pa], k) => ({
  season_id: SEASON, team_id: teamId(BRAVO), player_id: ID(400 + k), display_name: `Fake Player ${n}`, matches_with_rounds: 8,
  rounds_thrown: r, rounds_won: Math.round(r * 0.55), points_for: pf, points_against: pa, net_points_won: pf - pa,
  bags_in: Math.round(r * 1.1), bags_on: Math.round(r * 1.4), bags_off: Math.round(r * 1.5), four_baggers: k,
  game_wins: 14 - k * 4, game_losses: 5 + k * 2, match_wins: 7 - k * 2, match_losses: 1 + k,
}));

// ---- Rankings baseline: last week Bravo was 3rd and Foxtrot 2nd (so Bravo shows up 1, Foxtrot down 1) ----
const snapshots = [...teams].sort((a, b) => b.power_score - a.power_score).map((t, i) => ({
  team_id: t.team_id, season_id: SEASON, rank_position: t.name.includes('Bravo') ? i + 2 : t.name.includes('Foxtrot') ? i : i + 1,
}));

// ---- Home page: weekly power-score snapshots (Team of the Week, Recap movers) ----
// Week 17 matches v_team_details. Week 16 = week 17 minus a delta, so Bravo, Charlie and Foxtrot rose and Echo fell.
// Team of the Week is the biggest riser (Bravo). The recap shows the next two risers and the one faller.
const WEEK_DELTA = { 1: 6, 2: 3, 5: 1.5, 4: -4 }; // team index in T -> power score change into week 17
const powerSnapshots = [16, 17].flatMap((week) => teams.map((t, i) => ({
  id: ID(800 + (week - 16) * 10 + i), season_id: SEASON, team_id: t.team_id, week_number: week,
  power_score: +(t.power_score - (week === 16 ? (WEEK_DELTA[i] ?? 0) : 0)).toFixed(1), division_id: t.division_id,
  snapshot_date: week === 16 ? '2026-04-27' : '2026-05-04', created_at: '2026-05-04T06:00:00Z',
  match_wins: t.wins, match_losses: t.losses, game_wins: t.game_wins, game_losses: t.game_losses, sos: t.sos,
})));

// ---- Home page: hero cards ----
// A function, so times are worked out when the page asks. The event starts 5 hours from now (plus 30 seconds, so the
// countdown still reads "5h 0m until start" after the page loads) and checks in 4 hours from now.
// Class strings are copied from src/constants/heroCardPresets.ts. The event slug must not be "blind-draw".
const heroCards = () => {
  const at = (hours, extraMs = 0) => new Date(Date.now() + hours * 36e5 + extraMs).toISOString();
  const base = {
    subtitle: null, body: null, cta_label: null, cta_url: null, accent_color: null, image_url: null, icon_name: null,
    is_visible: true, target_type: 'none', target_id: null, metadata: {},
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  };
  return [
    { ...base, id: ID(700), slug: 'fake-announcement', sort_order: 1, card_type: 'announcement', title: 'Fake Season Playoffs Start Soon',
      subtitle: 'Fake Lanes, bring your own bags', icon_name: 'Trophy', cta_url: '/schedule',
      background_color: 'bg-gradient-to-r from-blue-600 to-amber-500', text_color: 'text-white' },
    { ...base, id: ID(701), slug: 'fake-champions', sort_order: 2, card_type: 'champions', title: '🏆 Fake Season 2025 Fall Champions',
      background_color: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600', text_color: 'text-amber-900',
      metadata: { champions: { Competitive: teamId(0), Intermediate: teamId(5) } } },
    { ...base, id: ID(702), slug: 'fake-weekly-event', sort_order: 3, card_type: 'event', title: 'Fake Mixer Night',
      subtitle: 'Fake Lanes, every Thursday', body: 'Fake prize pool. Fake fun for everyone.', icon_name: 'Shuffle',
      background_color: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500', text_color: 'text-white',
      metadata: {
        is_active_event: true, check_in_time: at(4), start_time: at(5, 30000), buy_in: '$10', payouts: 'Top 3',
        past_winners: [
          { week: 1, winners: [{ place: 1, names: 'Fake Player 1A and 2B' }, { place: 2, names: 'Fake Player 3A and 4B' }] },
          { week: 2, winners: [{ place: 1, names: 'Fake Player 5A and 6B' }, { place: 2, names: 'Fake Player 7A and 8B' }] },
        ],
      } },
    { ...base, id: ID(703), slug: 'fake-standard', sort_order: 4, card_type: 'standard', title: 'Fake League Help And Rules',
      icon_name: 'Megaphone', cta_url: '/help', background_color: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500', text_color: 'text-white' },
  ];
};

// ---- Home page: pending scores (v_pending_matches) ----
// Two matches two days old (the real view only lists matches at least 16 hours old). Logos are null on purpose.
const pendingMatches = () => [[2, 3, 0], [6, 7, 1]].map(([a, b, k]) => ({
  id: ID(900 + k), date: new Date(Date.now() - 2 * 864e5 - k * 36e5).toISOString(), location: 'Fake Lanes',
  team1_id: teamId(a), team1_name: teams[a].name, team1_logo: null, team2_id: teamId(b), team2_name: teams[b].name, team2_logo: null,
}));

// A value that is a function is called on each request, so "now" is the time the page asks.
const TABLES = {
  seasons: [season, ...OLD], v_team_details: teams, matches, theme_settings: themes, teams: teamRows, divisions,
  team_season_stats: seasonStats, matches_archive: archive, team_badge_events: badges, v_player_season_stats: playerStats, ranking_snapshots: snapshots,
  power_score_snapshots: powerSnapshots, hero_cards: heroCards, v_pending_matches: pendingMatches,
};

// RPC get_head_to_head_records for Bravo (all-time, so larger than this season).
// [opponent index, played, wins, game wins, game losses, last played]. Gives a nemesis (Alpha),
// a dominated opponent (Charlie, Golf) and two close rivals (Delta, Foxtrot).
const H2H = [
  [0, 6, 1, 7, 12, '2026-04-05'], [2, 4, 4, 8, 3, '2026-04-26'], [3, 3, 2, 5, 3, '2026-04-12'],
  [4, 2, 2, 4, 0, '2026-03-22'], [5, 4, 2, 6, 6, '2026-05-03'], [6, 3, 3, 6, 1, '2025-11-15'],
];
const headToHead = (id) => (id !== teamId(BRAVO) ? [] : H2H.map(([o, played, wins, gw, gl, last]) => ({
  team_id: id, opponent_id: teamId(o), matches_played: played, wins, losses: played - wins, game_wins: gw, game_losses: gl,
  win_pct: +((wins / played) * 100).toFixed(1), last_played_at: `${last}T23:00:00Z`,
})));

// RPC answers by function name. Each gets the JSON body the app sent.
// get_batch_head_to_head ([]: every matchup reads as a first meeting) must answer, or the whole Weekly Recap card hides.
// get_blind_draw_signup_count: the event hero card asks for it; the number only shows on the "blind-draw" slug.
const RPC = {
  get_head_to_head_records: (body) => headToHead(body.p_team_id),
  get_batch_head_to_head: () => [],
  get_blind_draw_signup_count: () => 12,
};

// ---- PostgREST helpers: just the filters and sorts the app uses ----
const RESERVED = ['select', 'order', 'limit', 'offset', 'or', 'and'];
// One condition such as "eq.5", "neq.x", "in.(a,b)", "is.null", "not.is.null". Other operators do not filter.
const test = (cell, spec) => {
  if (spec.startsWith('not.')) return !test(cell, spec.slice(4));
  const dot = spec.indexOf('.');
  const [op, val, text] = [spec.slice(0, dot), spec.slice(dot + 1), String(cell)];
  if (op === 'eq' || op === 'is') return text === val;
  if (op === 'neq') return text !== val;
  if (op === 'in') return val.slice(1, -1).split(',').includes(text);
  return true;
};
// "col" or an embedded column written "embed(col)", as in order=seasons(start_date).desc
const cellOf = (row, path) => {
  const m = /^(\w+)\((\w+)\)$/.exec(path);
  return m ? row[m[1]]?.[m[2]] : row[path];
};
const sortRows = (rows, order) => {
  const keys = order.split(',').map((o) => { const [path, dir] = o.split('.'); return [path, dir === 'desc' ? -1 : 1]; });
  return [...rows].sort((a, b) => {
    for (const [path, sign] of keys) {
      const [x, y] = [cellOf(a, path), cellOf(b, path)];
      if (x !== y) return (x > y ? 1 : -1) * sign;
    }
    return 0;
  });
};
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });

export default async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: CORS, body: '' }); return true; }
  const url = new URL(req.url());
  // RPC calls are POSTs with a JSON body. Only the ones listed in RPC are served.
  const rpc = req.method() === 'POST' ? RPC[url.pathname.split('/rest/v1/rpc/')[1]] : undefined;
  if (rpc) {
    let body = {};
    try { body = req.postDataJSON() ?? {}; } catch { /* not JSON: answer as if no arguments were sent */ }
    await json(route, rpc(body));
    return true;
  }
  if (req.method() !== 'GET') return false;
  const table = url.pathname.split('/rest/v1/')[1];
  if (!(table in TABLES)) return false;
  let rows = typeof TABLES[table] === 'function' ? TABLES[table]() : TABLES[table];
  for (const [k, v] of url.searchParams) {
    // Skip control params and embedded-table filters such as divisions.display_division=neq.Hidden
    if (RESERVED.includes(k) || k.includes('.')) continue;
    rows = rows.filter((r) => test(r[k], v));
  }
  // or=(team1_id.eq.X,team2_id.eq.X): keep a row when any term matches
  const or = url.searchParams.get('or');
  if (or) {
    const terms = or.slice(1, -1).split(',').map((t) => [t.slice(0, t.indexOf('.')), t.slice(t.indexOf('.') + 1)]);
    rows = rows.filter((r) => terms.some(([col, spec]) => test(r[col], spec)));
  }
  if (url.searchParams.has('order')) rows = sortRows(rows, url.searchParams.get('order'));
  if (url.searchParams.has('limit')) rows = rows.slice(0, Number(url.searchParams.get('limit')));
  // A single-object request gets the first row as an object, or the "no rows" error PostgREST sends.
  if ((req.headers().accept ?? '').includes('vnd.pgrst.object')) {
    await (rows.length ? json(route, rows[0]) : json(route, { code: 'PGRST116', message: 'no rows', details: null, hint: null }, 406));
    return true;
  }
  await json(route, rows);
  return true;
};
