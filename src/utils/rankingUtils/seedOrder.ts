import { getTierFromDivision } from '@/utils/autoSchedule/blossom/tierUtils';
import { getDisplayedPowerScore } from '@/utils/powerScore/formatPowerScore';

/** What the seed order reads from one team. */
export interface SeedOrderTeam {
  /** 0-100 scale. `null` or `undefined` means the team has no score yet. */
  powerScore: number | null | undefined;
  divisionName: string | null | undefined;
  /** The stored column from `v_team_details`, a 0-1 fraction. */
  winPercentage: number | null | undefined;
  name: string;
}

/**
 * Orders two teams best first, the way `createBracket` seeds teams that have no
 * manual seed (`src/services/bracket-creator.ts`, "Neither has manual seed"):
 *
 *   1. Displayed power score (one decimal), highest first. A team with no score
 *      sinks to the end.
 *   2. Division tier, higher division first. This comes BEFORE win %.
 *   3. Win percentage, highest first.
 *   4. Team name, A to Z.
 *
 * The Create Bracket form lists teams with this, so the admin sees the order the
 * saved bracket will use. It does not read manual seeds: those are applied on top.
 * Keep it in step with `createBracket`; `bracket-creator.seedOrderParity.test.ts`
 * runs the same teams through both.
 */
export const compareSeedOrder = (a: SeedOrderTeam, b: SeedOrderTeam): number => {
  const aDisplayed = getDisplayedPowerScore(a.powerScore);
  const bDisplayed = getDisplayedPowerScore(b.powerScore);

  // A team with no score goes last. With two such teams, fall through.
  if (aDisplayed === null && bDisplayed !== null) return 1;
  if (aDisplayed !== null && bDisplayed === null) return -1;
  if (aDisplayed !== null && bDisplayed !== null && aDisplayed !== bDisplayed) {
    return bDisplayed - aDisplayed;
  }

  const tierA = getTierFromDivision(a.divisionName);
  const tierB = getTierFromDivision(b.divisionName);
  if (tierA !== tierB) return tierA - tierB;

  const aWinPct = a.winPercentage || 0;
  const bWinPct = b.winPercentage || 0;
  if (aWinPct !== bWinPct) return bWinPct - aWinPct;

  return a.name.localeCompare(b.name);
};
