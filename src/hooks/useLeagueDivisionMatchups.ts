import { useQuery } from '@tanstack/react-query';

import { fetchLeagueDivisionMatchups } from '@/services/insights/LeagueDivisionMatchupsService';
import { categorizeDivision } from '@/utils/career/calculateDivisionRecords';
import type { DivisionTier } from '@/utils/career/types';

export type { DivisionTier } from '@/utils/career/types';

export interface DivisionMatchupRecord {
  // Higher tier (or equal) side comes first.
  tierA: DivisionTier;
  tierB: DivisionTier;
  // Wins by each side. For same-tier matchups, winsA === lossesA (symmetric).
  winsA: number;
  winsB: number;
}

const TIER_ORDER: Record<DivisionTier, number> = {
  competitive: 0,
  intermediate: 1,
  recreational: 2,
};

const PAIRINGS: Array<[DivisionTier, DivisionTier]> = [
  ['competitive', 'competitive'],
  ['competitive', 'intermediate'],
  ['competitive', 'recreational'],
  ['intermediate', 'intermediate'],
  ['intermediate', 'recreational'],
  ['recreational', 'recreational'],
];

const pairKey = (a: DivisionTier, b: DivisionTier) => `${a}|${b}`;

export function computeDivisionMatchups(input: {
  matches: { winner_id: string; loser_id: string; season_id: string | null }[];
  archivedMatches: { winner_id: string; loser_id: string; season_id: string | null }[];
  playoffMatches: { winner_id: string; loser_id: string; bracket_id: string | null }[];
  teamSeasonDivisions: { team_id: string; season_id: string; division_name: string | null }[];
  brackets: { id: string; display_division: string | null }[];
}): DivisionMatchupRecord[] {
  const divisionMap = new Map<string, string | null>();
  for (const row of input.teamSeasonDivisions) {
    divisionMap.set(`${row.team_id}_${row.season_id}`, row.division_name);
  }

  const bracketDivisionMap = new Map<string, string | null>();
  for (const b of input.brackets) {
    bracketDivisionMap.set(b.id, b.display_division);
  }

  const counts = new Map<string, { winsA: number; winsB: number }>();
  for (const [a, b] of PAIRINGS) counts.set(pairKey(a, b), { winsA: 0, winsB: 0 });

  const recordMatchup = (winnerTier: DivisionTier, loserTier: DivisionTier) => {
    // Orient so tierA is the higher (lower-ordinal) tier; ties are arbitrary.
    const winnerFirst = TIER_ORDER[winnerTier] <= TIER_ORDER[loserTier];
    const tierA = winnerFirst ? winnerTier : loserTier;
    const tierB = winnerFirst ? loserTier : winnerTier;
    const bucket = counts.get(pairKey(tierA, tierB));
    if (!bucket) return;
    if (winnerFirst) bucket.winsA += 1;
    else bucket.winsB += 1;
  };

  const tierFromSeason = (teamId: string, seasonId: string | null): DivisionTier | null => {
    if (!seasonId) return null;
    return categorizeDivision(divisionMap.get(`${teamId}_${seasonId}`) ?? null);
  };

  for (const m of [...input.matches, ...input.archivedMatches]) {
    const winnerTier = tierFromSeason(m.winner_id, m.season_id);
    const loserTier = tierFromSeason(m.loser_id, m.season_id);
    if (!winnerTier || !loserTier) continue;
    recordMatchup(winnerTier, loserTier);
  }

  for (const m of input.playoffMatches) {
    if (!m.bracket_id) continue;
    const tier = categorizeDivision(bracketDivisionMap.get(m.bracket_id) ?? null);
    if (!tier) continue;
    // Both teams are in the same bracket-tier playoff.
    recordMatchup(tier, tier);
  }

  return PAIRINGS.map(([tierA, tierB]) => {
    const bucket = counts.get(pairKey(tierA, tierB)) ?? { winsA: 0, winsB: 0 };
    return { tierA, tierB, winsA: bucket.winsA, winsB: bucket.winsB };
  });
}

export function useLeagueDivisionMatchups() {
  return useQuery({
    queryKey: ['league-division-matchups'],
    queryFn: async () => {
      const data = await fetchLeagueDivisionMatchups();
      return computeDivisionMatchups(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}