import { describe, expect, it } from 'vitest';

import { PowerScoreComponentRow } from '@/services/admin/PowerWeightSandboxService';
import { Team } from '@/types';

import { buildSeasonWeightPreview } from '../buildSeasonWeightPreview';

const component = (
  teamId: string,
  weightedWinPct: number,
  sos: number,
  weightedGameWinPct: number,
  matchesPlayed = 10
): PowerScoreComponentRow => ({
  team_id: teamId,
  matches_played: matchesPlayed,
  wins: 5,
  losses: 5,
  game_wins: 12,
  game_losses: 10,
  weighted_win_pct: weightedWinPct,
  sos,
  weighted_game_win_pct: weightedGameWinPct,
});

const team = (id: string, name: string, divisionName: string): Team => ({
  id,
  name,
  divisionName,
});

// Alpha leans on schedule strength (sos .9), Bravo on raw winning (.9 win
// rate). Under 40/45/15 Alpha leads (83 vs 79.5); shifting 20 points from
// SOS to match wins (60/25/15) flips it (81 vs 83.5).
const teams: Team[] = [
  team('a', 'Alpha', 'Competitive'),
  team('b', 'Bravo', 'Competitive'),
  team('c', 'Charlie', 'Competitive'), // matches_played 0 → unrated
  team('r', 'Romeo', 'Recreational'),
  team('n', 'November', 'Recreational'), // no component row at all → unrated
  team('h', 'Hush', 'Hidden'),
];

const components: PowerScoreComponentRow[] = [
  component('a', 0.8, 0.9, 0.7),
  component('b', 0.9, 0.7, 0.8),
  component('c', 0, 0.5, 0, 0),
  component('r', 0.5, 0.85, 0.5),
  component('h', 0.4, 0.85, 0.4),
];

const baseline = { win: 40, sos: 45, game: 15 };
const candidate = { win: 60, sos: 25, game: 15 };

describe('buildSeasonWeightPreview', () => {
  it('groups by division, alphabetically, hidden included (the UI filters)', () => {
    const preview = buildSeasonWeightPreview({ teams, components, baseline, candidate });
    expect(preview.map((d) => d.divisionName)).toEqual(['Competitive', 'Hidden', 'Recreational']);
  });

  it('detects the rank swap with correct scores and deltas', () => {
    const preview = buildSeasonWeightPreview({ teams, components, baseline, candidate });
    const competitive = preview.find((d) => d.divisionName === 'Competitive');

    // Sorted by candidate rank: Bravo overtakes Alpha under 60/25/15.
    expect(competitive?.rows.map((r) => r.teamName)).toEqual(['Bravo', 'Alpha']);

    const bravo = competitive?.rows[0];
    expect(bravo?.baselineScore).toBeCloseTo(79.5, 9);
    expect(bravo?.candidateScore).toBeCloseTo(83.5, 9);
    expect(bravo?.baselineRank).toBe(2);
    expect(bravo?.candidateRank).toBe(1);
    expect(bravo?.rankDelta).toBe(1); // moved up one spot
    expect(bravo?.scoreDelta).toBeCloseTo(4, 9);

    const alpha = competitive?.rows[1];
    expect(alpha?.baselineScore).toBeCloseTo(83, 9);
    expect(alpha?.candidateScore).toBeCloseTo(81, 9);
    expect(alpha?.rankDelta).toBe(-1);
    expect(alpha?.scoreDelta).toBeCloseTo(-2, 9);
  });

  it('ranks within each division independently', () => {
    const preview = buildSeasonWeightPreview({ teams, components, baseline, candidate });
    const recreational = preview.find((d) => d.divisionName === 'Recreational');
    expect(recreational?.rows).toHaveLength(1);
    expect(recreational?.rows[0]).toMatchObject({
      teamName: 'Romeo',
      baselineRank: 1,
      candidateRank: 1,
      rankDelta: 0,
    });
  });

  it('buckets zero-match and component-less teams as unrated', () => {
    const preview = buildSeasonWeightPreview({ teams, components, baseline, candidate });
    const competitive = preview.find((d) => d.divisionName === 'Competitive');
    expect(competitive?.unrated).toEqual([{ teamId: 'c', teamName: 'Charlie' }]);
    const recreational = preview.find((d) => d.divisionName === 'Recreational');
    expect(recreational?.unrated).toEqual([{ teamId: 'n', teamName: 'November' }]);
  });

  it('breaks equal scores by team name, like the stored standings', () => {
    const twins = [team('z', 'Zulu', 'Competitive'), team('y', 'Yankee', 'Competitive')];
    const identical = [component('z', 0.6, 0.85, 0.6), component('y', 0.6, 0.85, 0.6)];
    const preview = buildSeasonWeightPreview({
      teams: twins,
      components: identical,
      baseline,
      candidate,
    });
    expect(preview[0].rows.map((r) => r.teamName)).toEqual(['Yankee', 'Zulu']);
  });
});
