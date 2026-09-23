import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { compareTeamsForRanking, getDisplayedPowerScore, type TeamDetailsRow } from './ranking.ts';

const team = (overrides: Partial<TeamDetailsRow>): TeamDetailsRow => ({
  team_id: 't',
  name: 'Team',
  divisionname: 'Competitive',
  win_percentage: 0.5,
  power_score: 50,
  ...overrides,
});

Deno.test('rounds a power score the way the site shows it', () => {
  // 42.65 is stored as 42.6499…, so the site (toFixed) shows 42.6.
  // Math.round(42.65 * 10) / 10 gave 42.7, a different number.
  assertEquals(getDisplayedPowerScore(42.65), 42.6);
  assertEquals(getDisplayedPowerScore(71.26), 71.3);
  assertEquals(getDisplayedPowerScore(null), null);
});

Deno.test('treats scores the site shows as tied as tied, so win % decides', () => {
  // Both show as 42.6 on the standings, which then order by win %.
  const alpha = team({ team_id: 'a', name: 'Alpha', power_score: 42.65, win_percentage: 0.4 });
  const bravo = team({ team_id: 'b', name: 'Bravo', power_score: 42.6, win_percentage: 0.6 });

  const order = [alpha, bravo].sort(compareTeamsForRanking).map((t) => t.name);

  assertEquals(order, ['Bravo', 'Alpha']);
});

Deno.test('orders by displayed score, then tier, then win %, then name, unrated last', () => {
  const teams = [
    team({ team_id: '1', name: 'Unrated', power_score: null }),
    team({ team_id: '2', name: 'Rec', divisionname: 'Recreational', power_score: 60 }),
    team({ team_id: '3', name: 'Comp', divisionname: 'Competitive', power_score: 60 }),
    team({ team_id: '4', name: 'Top', power_score: 70 }),
    team({ team_id: '5', name: 'Beta', power_score: 40 }),
    team({ team_id: '6', name: 'Alpha', power_score: 40 }),
  ];

  const order = [...teams].sort(compareTeamsForRanking).map((t) => t.name);

  assertEquals(order, ['Top', 'Comp', 'Rec', 'Alpha', 'Beta', 'Unrated']);
});
