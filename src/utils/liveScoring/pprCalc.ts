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

/** part/whole as a 0-100 percentage. Null when whole <= 0 — never fake a 0%. */
export function percentage(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return (part / whole) * 100;
}

/** Format a nullable percentage for display, e.g. 62.5 -> "63%", null -> "–". */
export function formatPercent(value: number | null): string {
  return value === null ? '–' : `${Math.round(value)}%`;
}
