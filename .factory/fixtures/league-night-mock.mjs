// FAKE DATA ONLY. Mock for `node factory/bin/shoot.mjs --mock`. No real league names or people. Image fields are null.
// Signed out. league-night-member-mock.mjs (approved member of Fake Team Bravo) and league-night-admin-mock.mjs
// (profiles.is_admin = true) serve the same data with a fake session.
//
// Dates move with the clock: NIGHT = the coming Thursday (today on a Thursday), LAST = the Thursday before.
// Fills, on top of standings-mock.mjs (which still answers everything not listed here):
//   /schedule        NIGHT: 8 matches in 4 slots (6:30-8:00 PM) with team_timeslots; Bravo v Charlie is under way.
//                    LAST: 6 results, 2 matches still unscored, match comments (one long) and reactions.
//   /matches/<id>/live  ID(1000) Bravo v Charlie: game 1 done 21-17, game 2 at 12-12 after 7 rounds (member scores it).
//                    ID(1010) Alpha beat Bravo 2-1 last week, fully live-scored (match recap view).
//   /message-board   8 posts (one long, one edited, one with 5 reactions), admin notification. Signed out: no posts,
//                    as in the database (messages SELECT is TO authenticated only).
//   /playoffs        two brackets-manager brackets (?bracket=ID(2000) / ID(2001)): semis played, final ready.
//   /recap/fake-season-2026/week-<N>  published edition for LAST's season week (N = 44 on 2026-11-09).
//   / and /my-team   My Next Match, Team of the Week, recap edition card, Pending Scores (v_pending_matches).
//   /admin/*         score reports, team requests, contact inbox, participation, blind-draw signups, traffic,
//                    power snapshots a few days old, sandbox weights and components, power-migration backup.
//   Realtime         init() answers the WebSocket locally, so channels join and live pages read "Live updates: on".
// Served empty on purpose: v_counter_drift ("in sync"), support_tickets, challonge_fallback_brackets.
// Not served (the tool answers []): playoff_matches (rows there flip the home recap into playoff mode),
// and any other table. team_details_archive has three opponent rows only (Bravo's team page "Records by Division").
// Writes to the tables above get a fake success and are not stored. Writes elsewhere are aborted by the tool.
// Data lives in league-night/data.mjs and league-night/extras.mjs, RPC answers in league-night/rpc.mjs.
import { createMock, init, initArgFor } from './league-night/handler.mjs';

export { init };
export const initArg = initArgFor(null);
export default createMock(null);
