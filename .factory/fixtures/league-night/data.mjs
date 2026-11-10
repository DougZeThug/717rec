// FAKE DATA ONLY. Shared rows for the league-night screenshot mocks. No real league names or people.
// Teams, divisions, seasons and the old matches come from ../standings-mock.mjs (read through its own handler), so
// every id lines up with the pages that mock already fills. This file adds a league night around "now":
// NIGHT = the coming Thursday (today when today is Thursday), LAST = the Thursday before it.
// Times are built in the local clock of the Node process. Run the tool and the browser on one machine (as shoot.mjs
// does) and a match shows at 6:30 PM on the page whatever the machine's time zone is.
import standingsMock from '../standings-mock.mjs';
import { rowsFromMock } from './postgrest.mjs';

export const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const SEASON = ID(1);

// ---- Rows borrowed from the standings mock ----
const BASE_TABLES = [
  'seasons', 'v_team_details', 'matches', 'theme_settings', 'teams', 'divisions', 'team_season_stats', 'matches_archive',
  'team_badge_events', 'v_player_season_stats', 'ranking_snapshots', 'power_score_snapshots',
];
export const base = Object.fromEntries(
  await Promise.all(BASE_TABLES.map(async (t) => [t, (await rowsFromMock(standingsMock, t)) ?? []])),
);
export const teams = base.v_team_details; // index i = standings TEAM_ROWS[i]: 0 Alpha ... 9 Juliet; 0-4 North, 5-9 South
const tid = (i) => teams[i].team_id;
export const TEAM = { ALPHA: 0, BRAVO: 1, CHARLIE: 2, DELTA: 3, ECHO: 4, FOXTROT: 5, GOLF: 6, HOTEL: 7, INDIA: 8, JULIET: 9 };

// ---- Dates ----
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
today.setHours(0, 0, 0, 0);
export const NIGHT = new Date(today);
NIGHT.setDate(today.getDate() + ((4 - today.getDay() + 7) % 7));
export const LAST = new Date(NIGHT);
LAST.setDate(NIGHT.getDate() - 7);
export const at = (day, h, m = 0) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).toISOString();
const ago = (ms) => new Date(Date.now() - ms).toISOString();
const HOUR = 36e5;
const DAY = 864e5;

// ---- People ----
export const MEMBER = { id: ID(5000), email: 'fake.player.member@example.com', username: 'fake_player_1a', full_name: 'Fake Player 1A' };
export const ADMIN = { id: ID(5001), email: 'fake.admin@example.com', username: 'fake_admin', full_name: 'Fake Admin Person' };
const OTHERS = [
  ['fake_player_0a', 'Fake Player 0A', 0], ['fake_player_2a', 'Fake Player 2A', 2], ['fake_player_3b_has_a_long_username', 'Fake Player 3B', 3],
  ['fake_player_5a', 'Fake Player 5A', 5], ['fake_player_6b', 'Fake Player 6B', 6], ['fake_player_8a', 'Fake Player 8A', 8],
].map(([username, full_name, team], k) => ({ id: ID(5010 + k), username, full_name, team }));
const profileRow = (p, isAdmin = false) => ({
  id: p.id, username: p.username, full_name: p.full_name, avatar_url: null, created_at: '2026-01-02T00:00:00Z', is_admin: isAdmin,
});
const profiles = [profileRow(MEMBER), profileRow(ADMIN, true), ...OTHERS.map((p) => profileRow(p))];
// A new sign-up waiting for approval (admin pending memberships) has a profile too.
const PENDING = { id: ID(5020), username: 'fake_new_player', full_name: 'Fake New Player Waiting', avatar_url: null, created_at: ago(DAY), is_admin: false };
profiles.push(PENDING);

const teamMemberships = [
  { id: ID(5100), user_id: MEMBER.id, team_id: tid(TEAM.BRAVO), is_approved: true, joined_at: '2026-01-10T00:00:00Z', approved_at: '2026-01-10T01:00:00Z', approved_by: ADMIN.id, rejected_at: null, rejected_by: null },
  ...OTHERS.map((p, k) => ({ id: ID(5101 + k), user_id: p.id, team_id: tid(p.team), is_approved: true, joined_at: '2026-01-11T00:00:00Z', approved_at: '2026-01-11T01:00:00Z', approved_by: ADMIN.id, rejected_at: null, rejected_by: null })),
  { id: ID(5110), user_id: PENDING.id, team_id: tid(TEAM.HOTEL), is_approved: false, joined_at: ago(DAY), approved_at: null, approved_by: null, rejected_at: null, rejected_by: null },
];

// Live-scoring roster. Bravo's ids match the standings mock's v_player_season_stats (ID(400..402)).
const roster = (i, firstId, names) => names.map((n, k) => ({
  id: ID(firstId + k), team_id: tid(i), display_name: `Fake Player ${n}`, is_active: true,
  profile_id: i === TEAM.BRAVO && k === 0 ? MEMBER.id : null, created_at: '2026-01-05T00:00:00Z',
}));
const teamPlayers = [
  ...roster(TEAM.BRAVO, 400, ['1A', '1B', '1C', '1D With A Long Name']),
  ...roster(TEAM.CHARLIE, 410, ['2A', '2B']),
  ...teams.flatMap((t, i) => (i === TEAM.BRAVO || i === TEAM.CHARLIE ? [] : roster(i, 420 + i * 2, [`${i}A`, `${i}B`]))),
];
const P = (team, k) => teamPlayers.filter((p) => p.team_id === tid(team))[k].id;

// ---- League night matches ----
const matchBase = {
  location: 'Fake Lanes', round_number: 0, position: null, bracket_id: null, match_type: 'regular', next_match_id: null,
  next_loser_match_id: null, best_of: 3, season_id: SEASON, metadata: null, created_at: '2026-01-05T00:00:00Z',
};
// [id, team1, team2, hour, minute, result]. result: null = not played, 'live' = under way,
// [team1 game wins, team2 game wins, team1 points, team2 points] = finished.
const NIGHT_ROWS = [
  [1000, TEAM.BRAVO, TEAM.CHARLIE, 18, 30, 'live'],
  [1001, TEAM.FOXTROT, TEAM.GOLF, 18, 30, null],
  [1002, TEAM.ALPHA, TEAM.DELTA, 19, 0, null],
  [1003, TEAM.HOTEL, TEAM.INDIA, 19, 0, null],
  [1004, TEAM.ECHO, TEAM.BRAVO, 19, 30, null],
  [1005, TEAM.JULIET, TEAM.FOXTROT, 19, 30, null],
  [1006, TEAM.CHARLIE, TEAM.DELTA, 20, 0, null],
  [1007, TEAM.GOLF, TEAM.HOTEL, 20, 0, null],
];
// Last Thursday: six results, two matches nobody has scored yet (pending scores, score reports).
const LAST_ROWS = [
  [1010, TEAM.ALPHA, TEAM.BRAVO, 18, 30, [2, 1, 21, 19]],
  [1011, TEAM.FOXTROT, TEAM.JULIET, 18, 30, [2, 0, 21, 9]],
  [1012, TEAM.CHARLIE, TEAM.ECHO, 19, 0, [1, 2, 17, 21]],
  [1013, TEAM.GOLF, TEAM.INDIA, 19, 0, [2, 0, 21, 14]],
  [1014, TEAM.BRAVO, TEAM.DELTA, 19, 30, [2, 1, 21, 16]],
  [1015, TEAM.HOTEL, TEAM.FOXTROT, 19, 30, [0, 2, 12, 21]],
  [1016, TEAM.DELTA, TEAM.ECHO, 20, 0, null],
  [1017, TEAM.INDIA, TEAM.JULIET, 20, 0, null],
];
export const UNSCORED = [ID(1016), ID(1017)];
const toMatch = (day) => ([n, a, b, h, m, result]) => {
  const done = Array.isArray(result);
  const aWon = done && result[0] > result[1];
  return {
    ...matchBase, id: ID(n), team1_id: tid(a), team2_id: tid(b), date: at(day, h, m), iscompleted: done,
    team1_score: done ? result[2] : null, team2_score: done ? result[3] : null,
    team1_game_wins: done ? result[0] : result === 'live' ? 1 : null, team2_game_wins: done ? result[1] : result === 'live' ? 0 : null,
    winner_id: done ? tid(aWon ? a : b) : null, loser_id: done ? tid(aWon ? b : a) : null,
  };
};
export const LIVE_MATCH = ID(1000);
// The standings mock's own "upcoming" match (ID(230), three days out) is dropped: tonight's schedule replaces it.
const matches = [
  ...base.matches.filter((m) => m.id !== ID(230)).map(({ team1, team2, ...m }) => ({ ...m, round_number: m.round_number ?? 0 })),
  ...NIGHT_ROWS.map(toMatch(NIGHT)),
  ...LAST_ROWS.map(toMatch(LAST)),
];

// team_timeslots: one row per team per slot, both nights
const SLOT = { 18.5: '6:30 PM', 19: '7:00 PM', 19.5: '7:30 PM', 20: '8:00 PM' };
const timeslots = [[NIGHT, NIGHT_ROWS, 6000], [LAST, LAST_ROWS, 6100]].flatMap(([day, rows, first]) => rows.flatMap(([, a, b, h, m], k) => [a, b].map((t, s) => ({
  id: ID(first + k * 2 + s), match_date: dayKey(day), timeslot: SLOT[h + m / 60], team_id: tid(t), created_at: ago(7 * DAY),
  is_back_to_back: false, is_double_header: false, pair_slot: null, match_sequence: null,
}))));

// ---- Live scoring: games, rounds and line-ups ----
// A round is [team1 raw points, team2 raw points] (0-12). The app folds them by cancellation into game totals.
const fold = (rounds) => rounds.reduce(([x, y], [a, b]) => (a > b ? [x + a - b, y] : [x, y + b - a]), [0, 0]);
// Rounds for a finished game: the winner reaches 21 on the last round only, the loser ends on `lose` (19 or less).
const script = (team1Wins, lose, seed) => {
  const steps = (total, last) => { const out = []; let left = total - last; for (let k = seed; left > 0; k += 1) { const n = Math.min(left, [3, 1, 4, 2, 5][k % 5]); out.push(n); left -= n; } return [...out, last].filter((n) => n > 0); };
  const [win, loss] = [steps(21, 3), steps(lose, 0)];
  const rounds = [];
  for (let k = 0; win.length || loss.length; k += 1) {
    const y = k % 3;
    if (loss.length && (k % 2 || !win.length || win.length === 1)) { const n = loss.shift(); rounds.push(team1Wins ? [y, n + y] : [n + y, y]); }
    else if (win.length) { const n = win.shift(); rounds.push(team1Wins ? [n + y, y] : [y, n + y]); }
    if (k % 4 === 3) rounds.push([y + 2, y + 2]);
  }
  return rounds;
};
// Live: Bravo (team1) v Charlie (team2) tonight. Game 1 Bravo 21-17, game 2 under way at 12-12.
const G1 = [[6, 3], [3, 7], [9, 1], [4, 4], [1, 6], [5, 2], [2, 8], [7, 4], [3, 5], [8, 4]];
const G2 = [[3, 7], [5, 5], [8, 2], [1, 6], [4, 4], [9, 3], [2, 5]];
// Finished and live-scored: Alpha (team1) beat Bravo (team2) 2-1 last Thursday: 21-15, 18-21, 21-19.
const SCRIPTS = [
  { match: 1000, team1: TEAM.BRAVO, team2: TEAM.CHARLIE, day: NIGHT, games: [[G1, true], [G2, null]] },
  { match: 1010, team1: TEAM.ALPHA, team2: TEAM.BRAVO, day: LAST, games: [[script(true, 15, 0), true], [script(false, 18, 2), false], [script(true, 19, 4), true]] },
];
// [in, on, off] for a round score. Every score used here (0-10, 12) splits this way into 4 bags.
const breakdown = (s) => { const bagsIn = Math.min(4, Math.floor(s / 3)); return [bagsIn, s - bagsIn * 3, 4 - bagsIn - (s - bagsIn * 3)]; };
const games = [];
const matchRounds = [];
const gamePlayers = [];
SCRIPTS.forEach(({ match, team1, team2, day, games: list }, sk) => {
  let clock = Date.parse(at(day, 18, 32));
  list.forEach(([rounds, team1Won], gk) => {
    const [x, y] = fold(rounds);
    const done = team1Won !== null;
    if (done && (Math.max(x, y) < 21 || Math.abs(x - y) < 2 || (x > y) !== team1Won)) throw new Error(`league-night mock: match ${match} game ${gk + 1} folds to ${x}-${y}`);
    const gameId = ID(1100 + sk * 10 + gk);
    const started = new Date(clock).toISOString();
    rounds.forEach(([a, b], r) => {
      const [i1, o1, f1] = breakdown(a);
      const [i2, o2, f2] = breakdown(b);
      clock += 110e3;
      matchRounds.push({
        id: ID(1200 + sk * 100 + gk * 30 + r), match_id: ID(match), game_id: gameId, round_number: r + 1, team1_score: a, team2_score: b,
        net_points: Math.abs(a - b), winner_team: a === b ? null : a > b ? 1 : 2,
        team1_thrower_id: P(team1, r % 2), team2_thrower_id: P(team2, r % 2),
        team1_bags_in: i1, team1_bags_on: o1, team1_bags_off: f1, team2_bags_in: i2, team2_bags_on: o2, team2_bags_off: f2,
        entered_by_user_id: MEMBER.id, created_at: new Date(clock).toISOString(),
      });
    });
    games.push({
      id: gameId, match_id: ID(match), game_number: gk + 1, status: done ? 'completed' : 'in_progress',
      winner_team_id: done ? tid(team1Won ? team1 : team2) : null, team1_score: done ? x : null, team2_score: done ? y : null,
      started_at: started, completed_at: done ? new Date(clock).toISOString() : null, created_at: started, updated_at: new Date(clock).toISOString(),
    });
    [[team1, 0], [team1, 1], [team2, 0], [team2, 1]].forEach(([t, k], s) => gamePlayers.push({
      id: ID(1700 + sk * 40 + gk * 4 + s), game_id: gameId, team_id: tid(t), player_id: P(t, k), slot: k + 1, created_at: started,
    }));
    clock += 4 * 60e3;
  });
});

// ---- Power snapshots for last week (and the week before), so "last snapshot" is fresh ----
// Same numbers as the standings mock's weeks 16 and 17, so Team of the Week and the movers read the same.
const seasonStart = Date.UTC(2026, 0, 5);
export const weekOf = (day) => Math.floor((Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) - seasonStart) / (7 * DAY)) + 1;
export const RECAP_WEEK = weekOf(LAST);
const snapAt = (offsetDays) => { const d = new Date(LAST); d.setDate(d.getDate() + offsetDays); return d; };
const freshSnapshots = base.power_score_snapshots.map((row) => {
  const latest = row.week_number === 17;
  const day = snapAt(latest ? 1 : -6);
  return {
    ...row, id: row.id.replace('-8000-', '-8100-'), week_number: RECAP_WEEK - (latest ? 0 : 1),
    snapshot_date: dayKey(day), created_at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 6).toISOString(),
  };
});

// v_pending_matches: regular-season matches from before tonight with no result. (The real view waits 16 hours after
// the match; here everything before NIGHT counts, so a run on Friday morning still shows last week's two.)
const pendingMatches = () => matches
  .filter((m) => !m.iscompleted && !m.bracket_id && Date.parse(m.date) < NIGHT.getTime())
  .map((m) => {
    const [t1, t2] = [teams.find((t) => t.team_id === m.team1_id), teams.find((t) => t.team_id === m.team2_id)];
    return { id: m.id, date: m.date, location: m.location, team1_id: t1.team_id, team1_name: t1.name, team1_logo: null, team2_id: t2.team_id, team2_name: t2.name, team2_logo: null };
  });

// ---- Comments and reactions on last week's matches ----
const LONG_COMMENT = 'Fake comment that runs long on purpose: what a finish on court three. Both fake teams traded four-baggers '
  + 'for most of game three, the lead changed hands six times, and it came down to the very last bag of the night. Fake Team Alpha '
  + 'hung on, but Fake Team Bravo With A Very Long Name Here made them earn every point. Rematch next month, same fake lanes.';
const comment = (n, match, user, content, minutes) => {
  const who = [MEMBER, ...OTHERS].find((p) => p.id === user);
  const membership = teamMemberships.find((m) => m.user_id === user);
  return {
    id: ID(n), match_id: ID(match), user_id: user, username: who.username, content,
    team_name: membership ? teams.find((t) => t.team_id === membership.team_id).name : null,
    created_at: new Date(Date.parse(at(LAST, 21, 0)) + minutes * 60e3).toISOString(),
  };
};
const matchComments = [
  comment(1400, 1010, OTHERS[0].id, LONG_COMMENT, 5),
  comment(1401, 1010, MEMBER.id, 'Good game. We will get you next time.', 9),
  comment(1402, 1010, OTHERS[1].id, 'Fake fans were loud tonight!', 15),
  comment(1403, 1012, OTHERS[2].id, 'Upset of the week right here.', 20),
  comment(1404, 1014, OTHERS[2].id, 'Close one on court two. Nerves.', 30),
];
const matchReactions = [['🔥', 1010, MEMBER.id], ['🔥', 1010, OTHERS[0].id], ['👏', 1010, OTHERS[1].id], ['😮', 1012, OTHERS[3].id]]
  .map(([emoji, match, user], k) => ({ id: ID(1450 + k), match_id: ID(match), user_id: user, emoji, created_at: at(LAST, 21, 30) }));

// ---- Message board ----
const LONG_POST = 'Fake long post on purpose. Reminder for everyone on the fake board: league night starts at 6:30 PM sharp, '
  + 'so please be at the fake lanes by 6:15 to check in with your captain. Bring both sets of bags, a fake water bottle and your '
  + 'best fake attitude. If your team cannot make it, send a request through the app before Wednesday night so the fake schedule '
  + 'can be fixed. Parking is in the fake back lot. Food trucks are fake but the fun is real. See you all Thursday!';
const post = (n, user, content, category, hoursAgo, edited = false) => {
  const who = [MEMBER, ADMIN, ...OTHERS].find((p) => p.id === user);
  const membership = teamMemberships.find((m) => m.user_id === user);
  const team = membership ? teams.find((t) => t.team_id === membership.team_id) : null;
  const created = ago(hoursAgo * HOUR);
  return {
    id: ID(n), user_id: user, username: who.username, team_id: team?.team_id ?? null, team_name: team?.name ?? null,
    content, category, created_at: created, is_edited: edited, updated_at: edited ? ago((hoursAgo - 1) * HOUR) : created,
  };
};
const messages = [
  post(1500, ADMIN.id, LONG_POST, 'Announcement', 2),
  post(1501, OTHERS[0].id, 'Who has a spare set of fake bags for Thursday?', 'Question', 5),
  post(1502, MEMBER.id, 'Great games last week, everyone. Fake Team Bravo is ready for round two.', 'General', 9, true),
  post(1503, OTHERS[3].id, 'Fake mixer night after league play. Bring a partner!', 'Event', 20),
  post(1504, OTHERS[1].id, 'Short one.', 'General', 26),
  post(1505, OTHERS[2].id, 'Does anyone know if the fake lanes have lights on court four now? Asking for a fake friend.', 'Question', 40),
  post(1506, OTHERS[4].id, 'Lost a fake blue bag near court two. Let me know if you find it.', 'Other', 52),
  post(1507, OTHERS[5].id, 'Congrats to the fake champions from last season!', 'General', 70),
  // A long unbroken word and a link, as people paste them: a phone must wrap it, not cut it.
  post(1508, OTHERS[0].id, 'Fake sign-up sheet: https://example.com/fake-league/signups/thursday-night-doubles-sheet-2026 and SOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO excited!', 'General', 80),
];
const messageReactions = [['👍', 1500, MEMBER.id], ['👍', 1500, OTHERS[0].id], ['👍', 1500, OTHERS[1].id], ['❤️', 1500, OTHERS[2].id], ['😂', 1500, OTHERS[3].id], ['🔥', 1502, OTHERS[0].id]]
  .map(([emoji, message, user], k) => ({ id: ID(1550 + k), message_id: ID(message), user_id: user, emoji, created_at: ago(HOUR) }));

const adminNotifications = [{
  id: ID(1600), title: 'Fake notice: league night moves to the indoor fake lanes', body: 'Fake body text. Same time, new fake place.',
  created_by: ADMIN.id, created_at: ago(3 * HOUR), updated_at: ago(3 * HOUR), expires_at: new Date(Date.now() + 5 * DAY).toISOString(),
}];

export const TABLES = {
  ...base,
  matches,
  profiles,
  team_memberships: teamMemberships,
  team_players: teamPlayers,
  team_timeslots: timeslots,
  games,
  match_rounds: matchRounds,
  power_score_snapshots: [...base.power_score_snapshots, ...freshSnapshots],
  v_pending_matches: pendingMatches,
  game_players: gamePlayers,
  match_comments: matchComments,
  match_reactions: matchReactions,
  messages,
  message_reactions: messageReactions,
  admin_notifications: adminNotifications,
};
