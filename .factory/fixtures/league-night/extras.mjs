// FAKE DATA ONLY. Playoff bracket, weekly recap edition and admin-only rows for the league-night mocks.
import { ADMIN, ID, LAST, MEMBER, NIGHT, RECAP_WEEK, SEASON, TEAM, UNSCORED, base, dayKey, teams } from './data.mjs';

const tid = (i) => teams[i].team_id;
const HOUR = 36e5;
const DAY = 864e5;
const ago = (ms) => new Date(Date.now() - ms).toISOString();

// ---- Playoffs: one brackets-manager bracket per division, four teams, single elimination ----
// Semi-finals are played (seed 1 beat 4, seed 2 beat 3 in three games), the final is ready but not played.
// Rows follow the brackets-manager SQL tables: stage, group, round, match (status 2 = ready, 4 = completed), participant.
// playoff_matches (the legacy mirror) stays empty on purpose: rows there flip the home recap into playoff mode.
const DIVS = base.divisions;
const BRACKETS = [
  { id: ID(2000), title: 'Fake Competitive Playoffs', division: 0, seeds: [TEAM.ALPHA, TEAM.BRAVO, TEAM.CHARLIE, TEAM.DELTA] },
  { id: ID(2001), title: 'Fake Intermediate Playoffs With A Long Title', division: 1, seeds: [TEAM.FOXTROT, TEAM.GOLF, TEAM.HOTEL, TEAM.INDIA] },
];
const bm = { brackets: [], stage: [], group: [], round: [], match: [], participant: [], match_game: [] };
BRACKETS.forEach((b, k) => {
  const n = k * 10; // integer ids for the brackets-manager tables
  bm.brackets.push({
    // format and state as bracket-creator.ts writes them; state stays 'pending' until the bracket completes
    id: b.id, title: b.title, format: 'Single Elimination', state: 'pending', division_id: DIVS[b.division].id, season_id: SEASON,
    challonge_tournament_id: null, cn_bracket_id: null, uses_brackets_manager: true, created_at: `2026-11-0${k + 1}T12:00:00Z`,
    bracket_data: null, participants: null, migrated: false, migrated_at: null, reset_match_needed: false, wb_champion_id: null,
  });
  // The stage is named with the bracket id, as BracketCreationService writes it, so the shots show whether that raw id
  // ever appears as a heading over the bracket (UI-UX audit PO-04).
  bm.stage.push({ id: n + 1, tournament_id: b.id, name: b.id, type: 'single_elimination', number: 1,
    settings: { size: 4, seedOrdering: ['inner_outer'], grandFinal: 'none', consolationFinal: false, matchesChildCount: 0 } });
  bm.group.push({ id: n + 1, stage_id: n + 1, number: 1, name: null });
  bm.round.push({ id: n + 1, stage_id: n + 1, group_id: n + 1, number: 1, name: null }, { id: n + 2, stage_id: n + 1, group_id: n + 1, number: 2, name: null });
  b.seeds.forEach((team, s) => bm.participant.push({ id: n + 1 + s, tournament_id: b.id, name: teams[team].name, team_id: tid(team), position: s + 1 }));
  const p = (seed) => n + seed; // participant id of seed 1..4
  const done = (a, bb, aGames, bGames) => ({ opponent1_id: p(a), opponent1_position: a, opponent1_score: aGames, opponent1_result: aGames > bGames ? 'win' : 'loss',
    opponent2_id: p(bb), opponent2_position: bb, opponent2_score: bGames, opponent2_result: aGames > bGames ? 'loss' : 'win', status: 4 });
  const common = { stage_id: n + 1, group_id: n + 1, child_count: 0 };
  bm.match.push(
    { ...common, id: n + 1, round_id: n + 1, number: 1, ...done(1, 4, 2, 0) },
    { ...common, id: n + 2, round_id: n + 1, number: 2, ...done(2, 3, 2, 1) },
    { ...common, id: n + 3, round_id: n + 2, number: 1, opponent1_id: p(1), opponent1_position: null, opponent1_score: null, opponent1_result: null,
      opponent2_id: p(2), opponent2_position: null, opponent2_score: null, opponent2_result: null, status: 2 },
  );
});

// ---- Weekly recap edition for last week, published ----
// URL: /recap/fake-season-2026/week-<RECAP_WEEK>. Facts follow RecapFactsV1 (src/types/recapEdition.ts, schema version 2).
export const SEASON_SLUG = 'fake-season-2026';
const season = base.seasons.find((s) => s.id === SEASON);
const team = (i) => teams[i];
const mover = (i, delta) => ({ teamId: tid(i), teamName: team(i).name, logoUrl: null, division: team(i).divisionname,
  currentScore: team(i).power_score, previousScore: Number((team(i).power_score - delta).toFixed(1)), delta });
const DELTAS = { [TEAM.BRAVO]: 6, [TEAM.CHARLIE]: 3, [TEAM.FOXTROT]: 1.5, [TEAM.ECHO]: -4 };
const GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
const ranked = [...teams.keys()].sort((a, b) => team(b).power_score - team(a).power_score);
const weekStart = new Date(LAST);
weekStart.setDate(LAST.getDate() - LAST.getDay() + 1);
const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 7);
const facts = {
  factsSchemaVersion: 2, seasonId: SEASON, seasonName: season.name, seasonSlug: SEASON_SLUG, weekNumber: RECAP_WEEK,
  weekStartIso: weekStart.toISOString(), weekEndIso: weekEnd.toISOString(),
  upsets: [{ winnerId: tid(TEAM.ECHO), winnerName: team(TEAM.ECHO).name, winnerPowerScore: team(TEAM.ECHO).power_score,
    loserId: tid(TEAM.CHARLIE), loserName: team(TEAM.CHARLIE).name, loserPowerScore: team(TEAM.CHARLIE).power_score,
    powerScoreGap: Number((team(TEAM.CHARLIE).power_score - team(TEAM.ECHO).power_score).toFixed(1)), winnerProbability: 0.18,
    matchResult: '21–17', weekNumber: RECAP_WEEK }],
  hotStreaks: [[TEAM.ALPHA, 3], [TEAM.FOXTROT, 3]].map(([i, c]) => ({ teamId: tid(i), teamName: team(i).name, division: team(i).divisionname, streak: `W${c}`, streakCount: c })),
  movers: { basis: 'compared', currentWeek: RECAP_WEEK, previousWeek: RECAP_WEEK - 1,
    risers: [mover(TEAM.CHARLIE, 3), mover(TEAM.FOXTROT, 1.5)], faller: mover(TEAM.ECHO, -4) },
  teamOfTheWeek: mover(TEAM.BRAVO, 6),
  divisions: DIVS.map((d) => ({ divisionId: d.id, divisionName: d.name,
    standings: ranked.filter((i) => team(i).division_id === d.id).map((i, r) => ({ rank: r + 1, teamId: tid(i), teamName: team(i).name, logoUrl: null,
      wins: team(i).wins, losses: team(i).losses, gameWins: team(i).game_wins, gameLosses: team(i).game_losses, powerScore: team(i).power_score, delta: DELTAS[i] ?? 0 })) })),
  powerRankings: ranked.map((i, r) => ({
    rank: r + 1, previousRank: r + 1 + (i === TEAM.BRAVO ? 1 : i === TEAM.FOXTROT ? -1 : 0), teamId: tid(i), teamName: team(i).name, logoUrl: null,
    division: team(i).divisionname, grade: GRADES[r], gpa: Number((4 - r * 0.35).toFixed(2)), wins: team(i).wins, losses: team(i).losses,
    powerScore: team(i).power_score, delta: DELTAS[i] ?? 0,
    categories: [['overall', 'Overall'], ['consistency', 'Consistency'], ['games', 'Games'], ['offense', 'Offense'], ['clutch', 'Clutch'], ['schedule', 'Schedule']]
      .map(([key, label], c) => ({ key, label, grade: GRADES[Math.max(0, Math.min(9, r + (c % 3) - 1))], percentile: Math.max(5, 95 - r * 10 + c) })),
  })),
  unresolvedMatchCount: UNSCORED.length, generatedAt: new Date(LAST.getTime() + DAY + 8 * HOUR).toISOString(),
};
const blurbs = Object.fromEntries(facts.powerRankings.map((g) => [g.teamId,
  g.teamId === tid(TEAM.BRAVO) ? 'Up 1 to 2nd, 8-2 on the season, +6.0 power. The week\'s biggest climb, and a fake crowd favourite on every court.'
    : `Sits ${g.rank}${['st', 'nd', 'rd'][g.rank - 1] ?? 'th'}, ${g.wins}-${g.losses} on the season.`]));
const published = new Date(LAST.getTime() + DAY + 9 * HOUR).toISOString();
const recapEditions = [{
  id: ID(2100), season_id: SEASON, week_number: RECAP_WEEK, season_slug: SEASON_SLUG, season_name: season.name, status: 'published',
  published_version_id: ID(2110), first_published_at: published, published_at: published, published_by: ADMIN.id,
  created_at: published, created_by: ADMIN.id, updated_at: published,
}];
const recapVersions = [{
  id: ID(2110), edition_id: ID(2100), version: 1, facts, facts_schema_version: 2, headline: 'Fake Team Echo stuns Fake Team Charlie in week ' + RECAP_WEEK,
  caption: 'A fake week of upsets and long names. Fake Team Bravo climbs, Fake Team Echo bites back, and two fake matches still need scores.',
  caption_source: 'manual', caption_model: null, blurbs, blurbs_source: 'fallback', commissioner_note: 'Fake commissioner note: bring a jacket, the fake lanes get cold after 8.',
  correction_note: null, graphic_url: null, created_at: published, created_by: ADMIN.id,
}];

// ---- Admin rows ----
const scoreSubmissions = [
  [2200, UNSCORED[0], 'Fake Player 3B', TEAM.DELTA, 'We won 2-0: 21-15, 21-19. Scored on paper, sorry!', 3],
  [2201, UNSCORED[1], 'Fake Player 9A With A Long Name', TEAM.JULIET, 'Juliet won 2-1 (18-21, 21-16, 21-20). India agreed at the lanes.', 20],
].map(([n, match, who, t, message, hoursAgo]) => ({
  id: ID(n), match_id: match, submitter_name: who, submitter_team: team(t).name, team_id: tid(t), user_id: null, message, status: 'pending',
  is_verified: false, created_at: ago(hoursAgo * HOUR), reviewed_by: null, reviewed_at: null,
}));
const teamRequests = [
  [2300, TEAM.ECHO, 'TIME_CHANGE', 'PENDING', '6:30 PM', '8:00 PM', 'Two of our fake players work late on Thursdays.', 4],
  [2301, TEAM.GOLF, 'BYE_REQUEST', 'PENDING', null, null, 'Fake family wedding that weekend. We would like a bye week, please.', 30],
  [2302, TEAM.INDIA, 'TIME_CHANGE', 'APPROVED', '8:00 PM', '7:00 PM', 'Earlier slot please.', 120],
].map(([n, t, type, status, current, requested, reason, hoursAgo]) => ({
  id: ID(n), team_id: tid(t), season_id: SEASON, request_type: type, status, match_date: dayKey(NIGHT),
  current_timeslot: current, requested_timeslot: requested, reason, admin_notes: status === 'APPROVED' ? 'Done, moved.' : null,
  submitted_by: MEMBER.id, submitted_by_name: `Fake Captain ${t}`, processed_by: status === 'APPROVED' ? ADMIN.id : null,
  processed_at: status === 'APPROVED' ? ago(100 * HOUR) : null, created_at: ago(hoursAgo * HOUR), updated_at: ago(hoursAgo * HOUR),
}));
const LONG_CONTACT = 'Fake long contact message on purpose. Hi! My fake team would like to join the league next season. We have four '
  + 'fake players, two of whom have played in other fake leagues before, and two who are brand new to cornhole but very keen. We can play '
  + 'any Thursday slot except 6:30 PM, because one of us gets off work at six and the drive to the fake lanes takes twenty minutes. Is there '
  + 'a fee, do we need our own boards, and can a team have a fifth player as a sub? Thanks so much, and sorry for the long message.';
const contactRequests = [
  [2400, 'join_league', 'Fake Person Newcomer', null, 'fake.newcomer@example.com', 'Fake A, Fake B, Fake C, Fake D', LONG_CONTACT, 6],
  [2401, 'score', 'Fake Player 6B', TEAM.GOLF, '555-0100 (fake)', null, 'Our score from last week shows the wrong winner.', 28],
].map(([n, type, name, t, contact, players, message, hoursAgo]) => ({
  id: ID(n), request_type: type, submitter_name: name, submitter_team: t === null ? null : team(t).name, submitter_contact: contact, players, message,
  user_id: null, team_id: t === null ? null : tid(t), is_verified: false, status: 'new', admin_notes: null, resolved_by: null, resolved_at: null,
  created_at: ago(hoursAgo * HOUR), updated_at: ago(hoursAgo * HOUR),
}));
const participation = teams.map((t, i) => ({
  id: ID(2500 + i), season_id: SEASON, team_id: t.team_id, status: i === TEAM.JULIET ? 'NOT_PLAYING' : 'PLAYING', submitted_by: null,
  submitted_by_name: i % 3 === 0 ? `Fake Captain ${i}` : null, created_at: ago(20 * DAY), updated_at: ago(20 * DAY),
})).filter((_, i) => i !== TEAM.INDIA); // India has not answered yet
const today = dayKey(new Date());
const blindDrawSignups = [['Fake', 'A'], ['Faker', 'B'], ['Fakest Of All Names', 'C'], ['Pretend', 'D'], ['Sample', 'E']]
  .map(([first, initial], k) => ({ id: ID(2600 + k), event_date: today, first_name: first, last_initial: initial, created_at: ago((10 - k) * HOUR) }));
const blindDrawSettings = [{ id: ID(2650), signup_confirmation_message: 'Fake confirmation: you are on the fake list. Check in by 6:15 PM.', created_at: ago(30 * DAY), updated_at: ago(30 * DAY) }];
const challongeConfig = [{ id: ID(2660), enabled: false, header_title: 'Fake Playoff Brackets', header_subtitle: 'Fake subtitle', created_at: ago(90 * DAY), updated_at: ago(90 * DAY) }];
// 30 days of first-party traffic, busiest on Thursdays.
const traffic = Array.from({ length: 30 }, (_, k) => {
  const d = new Date(Date.now() - (29 - k) * DAY);
  const busy = d.getDay() === 4 ? 3 : d.getDay() === 5 ? 2 : 1;
  const visitors = 18 * busy + ((k * 7) % 11);
  return { day: dayKey(d), visitors, pageviews: visitors * 4 + (k % 5), ios_visitors: Math.round(visitors * 0.55), android_visitors: Math.round(visitors * 0.3), other_visitors: visitors - Math.round(visitors * 0.55) - Math.round(visitors * 0.3) };
});

// Power Score Sandbox inputs (0-1 scale), worked out from the same records the standings mock shows.
const components = (rows) => rows.map((r) => {
  const [w, l, gw, gl] = [r.wins ?? r.match_wins, r.losses ?? r.match_losses, r.game_wins, r.game_losses];
  return { ...(r.season_id ? { season_id: r.season_id } : {}), team_id: r.team_id, matches_played: w + l, wins: w, losses: l, game_wins: gw, game_losses: gl,
    weighted_win_pct: Number((w / Math.max(1, w + l)).toFixed(3)), sos: r.sos, weighted_game_win_pct: Number((gw / Math.max(1, gw + gl)).toFixed(3)) };
});

// Team page "Records by Division" (TeamTotals): the opponents' division in one old season, so Fake Team Bravo's
// archived games against Alpha, Charlie and Delta count as one record per tier. Opponent rows only: Bravo's own
// division history stays empty. The tier is read from the name (calculateDivisionRecords.ts categorizeDivision).
const OLD_SEASON = ID(2);
const teamDetailsArchive = [[TEAM.ALPHA, 'Fake Competitive'], [TEAM.CHARLIE, 'Fake Intermediate'], [TEAM.DELTA, 'Fake Recreational']]
  .map(([t, divisionname]) => ({ team_id: tid(t), season_id: OLD_SEASON, divisionname, division_id: null }));

export const EXTRA_TABLES = {
  v_power_score_components_current: components(teams),
  v_power_score_components: components(base.team_season_stats),
  ...bm,
  recap_editions: recapEditions,
  recap_edition_versions: recapVersions,
  score_submissions: scoreSubmissions,
  team_requests: teamRequests,
  contact_requests: contactRequests,
  support_tickets: [],
  season_team_participation: participation,
  blind_draw_signups: blindDrawSignups,
  blind_draw_settings: blindDrawSettings,
  challonge_fallback_config: challongeConfig,
  challonge_fallback_brackets: [],
  v_daily_traffic: traffic,
  v_counter_drift: [],
  team_details_archive: teamDetailsArchive,
};
