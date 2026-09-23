// The ordering written to ranking_snapshots.rank_position. Its own file, apart
// from index.ts, so a test can import it without starting the server.

export interface TeamDetailsRow {
  team_id: string;
  name: string | null;
  divisionname: string | null;
  win_percentage: number | null;
  power_score: number | null;
}

// Mirrors getTierFromDivision in src/utils/autoSchedule/blossom/tierUtils.ts.
export const getTierFromDivision = (divisionName: string | null | undefined): number => {
  if (!divisionName) return 2; // Default to intermediate
  const lowerName = divisionName.toLowerCase();
  if (lowerName.includes('competitive') || lowerName.includes('comp')) return 1;
  if (lowerName.includes('recreational') || lowerName.includes('rec')) return 3;
  return 2;
};

// Mirrors getDisplayedPowerScore in src/utils/powerScore/formatPowerScore.ts.
// toFixed, not Math.round(x * 10) / 10: the two disagree on values such as
// 42.65 (stored as 42.6499…), which toFixed shows as 42.6 and Math.round
// lifts to 42.7. The site sorts on what toFixed shows, so this must too, or two
// teams the standings show as tied get a different order here.
export const getDisplayedPowerScore = (powerScore: number | null | undefined): number | null => {
  if (powerScore === null || powerScore === undefined) return null;
  return Number(powerScore.toFixed(1));
};

// Must stay in lockstep with the client sort in src/hooks/useTeamRankings.ts so
// the stored baseline compares like-for-like with what the site displays:
// 1-decimal power score desc, NULL scores last, then division tier, win %, name.
export const compareTeamsForRanking = (a: TeamDetailsRow, b: TeamDetailsRow): number => {
  const aScore = getDisplayedPowerScore(a.power_score);
  const bScore = getDisplayedPowerScore(b.power_score);
  if (aScore === null && bScore !== null) return 1;
  if (bScore === null && aScore !== null) return -1;
  if (aScore !== null && bScore !== null && bScore !== aScore) return bScore - aScore;
  const tierA = getTierFromDivision(a.divisionname);
  const tierB = getTierFromDivision(b.divisionname);
  if (tierA !== tierB) return tierA - tierB;
  const winA = a.win_percentage ?? 0;
  const winB = b.win_percentage ?? 0;
  if (winA !== winB) return winB - winA;
  return (a.name || '').localeCompare(b.name || '');
};
