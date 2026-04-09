import {
  ArchivedMatchData,
  DivisionRecords,
  DivisionTier,
  MatchData,
  PlayoffMatchData,
} from './types';

interface DivisionRecordsInput {
  currentMatches: MatchData[] | null;
  archivedMatches: ArchivedMatchData[] | null;
  playoffMatches: PlayoffMatchData[] | null;
  teamDivisionMap: Map<string, string>;
  bracketDivisionWeights: Record<string, number>;
  bracketDivisionDisplayNames: Record<string, string>;
  teamId: string;
}

/**
 * Categorizes a division name into a tier.
 * Hidden/Hidden2 are excluded (return null) - they are administrative divisions.
 */
export const categorizeDivision = (divisionName: string | null): DivisionTier | null => {
  if (!divisionName) return null;
  const name = divisionName.toLowerCase();
  // Exclude hidden divisions from tier categorization
  if (name.includes('hidden')) return null;
  if (name.includes('competitive')) return 'competitive';
  if (name.includes('intermediate') || name === 'cuspers') return 'intermediate';
  if (name.includes('recreational')) return 'recreational';
  return null;
};

/**
 * Gets division tier from bracket division weight.
 */
export const getTierFromWeight = (weight: number): DivisionTier => {
  if (weight >= 0.89) return 'competitive';
  if (weight >= 0.4) return 'intermediate';
  return 'recreational';
};

/**
 * Iterates matches, resolves each to a tier via getTier, and records wins/losses.
 * Skips matches where getTier returns null.
 */
function processMatchesWithTier<T extends { winner_id: string | null; loser_id: string | null }>(
  matches: T[] | null,
  getTier: (match: T) => DivisionTier | null,
  records: DivisionRecords,
  teamId: string
): void {
  if (!matches) return;
  for (const match of matches) {
    const tier = getTier(match);
    if (!tier) continue;
    if (match.winner_id === teamId) records[tier].wins++;
    else if (match.loser_id === teamId) records[tier].losses++;
  }
}

/**
 * Calculates win/loss records against each division tier.
 * Uses opponent's division at the time of the match.
 */
export const calculateDivisionRecords = ({
  currentMatches,
  archivedMatches,
  playoffMatches,
  teamDivisionMap,
  bracketDivisionDisplayNames,
  teamId,
}: DivisionRecordsInput): DivisionRecords => {
  const division_records: DivisionRecords = {
    competitive: { wins: 0, losses: 0 },
    intermediate: { wins: 0, losses: 0 },
    recreational: { wins: 0, losses: 0 },
  };

  // Archived: look up opponent's historical division
  processMatchesWithTier(
    archivedMatches,
    (match) => {
      const opponentId = match.team1_id === teamId ? match.team2_id : match.team1_id;
      if (!opponentId || !match.season_id) return null;
      return categorizeDivision(teamDivisionMap.get(`${opponentId}_${match.season_id}`) || null);
    },
    division_records,
    teamId
  );

  // Current: historical lookup with fallback to joined division data
  processMatchesWithTier(
    currentMatches,
    (match) => {
      const isTeam1 = match.team1_id === teamId;
      const opponentId = isTeam1 ? match.team2_id : match.team1_id;
      if (!opponentId || !match.season_id) return null;
      const historicalDivision = teamDivisionMap.get(`${opponentId}_${match.season_id}`);
      const fallbackDivision = isTeam1 ? match.team2?.divisions?.name : match.team1?.divisions?.name;
      return categorizeDivision(historicalDivision || fallbackDivision || null);
    },
    division_records,
    teamId
  );

  // Playoff: classify by bracket's display_division name
  processMatchesWithTier(
    playoffMatches,
    (match) => {
      if (!match.bracket_id) return null;
      return categorizeDivision(bracketDivisionDisplayNames[match.bracket_id] || null);
    },
    division_records,
    teamId
  );

  return division_records;
};
