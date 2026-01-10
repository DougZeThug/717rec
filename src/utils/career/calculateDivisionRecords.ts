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
  teamId: string;
}

/**
 * Categorizes a division name into a tier.
 * Maps "Hidden" to competitive since it has weight 1.0.
 */
export const categorizeDivision = (divisionName: string | null): DivisionTier | null => {
  if (!divisionName) return null;
  const name = divisionName.toLowerCase();
  if (name.includes('competitive') || name.includes('hidden')) return 'competitive';
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
 * Calculates win/loss records against each division tier.
 * Uses opponent's division at the time of the match.
 */
export const calculateDivisionRecords = ({
  currentMatches,
  archivedMatches,
  playoffMatches,
  teamDivisionMap,
  bracketDivisionWeights,
  teamId,
}: DivisionRecordsInput): DivisionRecords => {
  const division_records: DivisionRecords = {
    competitive: { wins: 0, losses: 0 },
    intermediate: { wins: 0, losses: 0 },
    recreational: { wins: 0, losses: 0 },
  };

  // Process archived matches - look up opponent's division at time of match
  if (archivedMatches) {
    for (const match of archivedMatches) {
      const isTeam1 = match.team1_id === teamId;
      const opponentId = isTeam1 ? match.team2_id : match.team1_id;
      if (!opponentId || !match.season_id) continue;

      const opponentDivision = teamDivisionMap.get(`${opponentId}_${match.season_id}`);
      const tier = categorizeDivision(opponentDivision || null);

      if (tier) {
        if (match.winner_id === teamId) {
          division_records[tier].wins++;
        } else if (match.loser_id === teamId) {
          division_records[tier].losses++;
        }
      }
    }
  }

  // Add current season matches based on opponent's current division
  if (currentMatches) {
    for (const match of currentMatches) {
      const isTeam1 = match.team1_id === teamId;
      const opponentDivision = isTeam1
        ? match.team2?.divisions?.name
        : match.team1?.divisions?.name;
      const tier = categorizeDivision(opponentDivision || null);

      if (tier) {
        if (match.winner_id === teamId) {
          division_records[tier].wins++;
        } else if (match.loser_id === teamId) {
          division_records[tier].losses++;
        }
      }
    }
  }

  // Add playoff matches based on bracket division weight
  if (playoffMatches) {
    for (const match of playoffMatches) {
      if (!match.bracket_id) continue;
      const bracketWeight = bracketDivisionWeights[match.bracket_id] || 0.85;
      const tier = getTierFromWeight(bracketWeight);

      if (match.winner_id === teamId) {
        division_records[tier].wins++;
      } else if (match.loser_id === teamId) {
        division_records[tier].losses++;
      }
    }
  }

  return division_records;
};
