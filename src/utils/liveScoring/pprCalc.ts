/** Points per round thrown. Null when no rounds (never fake a 0.0 PPR). */
export function pointsPerRound(pointsFor: number, roundsThrown: number): number | null {
  if (roundsThrown <= 0) return null;
  return pointsFor / roundsThrown;
}

/** Differential per round (PPR minus opponent PPR over the same rounds). */
export function differentialPerRound(
  pointsFor: number,
  pointsAgainst: number,
  roundsThrown: number
): number | null {
  if (roundsThrown <= 0) return null;
  return (pointsFor - pointsAgainst) / roundsThrown;
}

/** Format a nullable ratio for display, e.g. 7.25 -> "7.25", null -> "–". */
export function formatRatio(value: number | null, digits = 2): string {
  return value === null ? '–' : value.toFixed(digits);
}
