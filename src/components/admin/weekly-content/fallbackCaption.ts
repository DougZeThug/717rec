import type { RecapFactsV1 } from '@/types/recapEdition';

/**
 * A caption built from the facts alone, with no model involved.
 *
 * Its job is to make sure the caption box is never empty and Publish is never
 * blocked on an AI service — if the key is missing or the request fails, the
 * admin still has something to edit rather than a blank page.
 *
 * It states only what is in the facts, in the same order the graphic shows
 * them, and says nothing at all about a section that is empty.
 */
export const buildFallbackCaption = (facts: RecapFactsV1): string => {
  const lines: string[] = [`Week ${facts.weekNumber} is in the books.`];

  const upset = facts.upsets[0];
  if (upset) {
    const score = upset.matchResult ? ` ${upset.matchResult}` : '';
    lines.push(
      `${upset.winnerName} beat ${upset.loserName}${score} — a ${Math.round(
        upset.winnerProbability * 100
      )}% shot going in.`
    );
  }

  const streak = facts.hotStreaks[0];
  if (streak) {
    lines.push(`${streak.teamName} have now won ${streak.streakCount} in a row.`);
  }

  if (facts.teamOfTheWeek) {
    lines.push(
      `Biggest mover: ${facts.teamOfTheWeek.teamName}, up ${facts.teamOfTheWeek.delta.toFixed(
        1
      )} to ${facts.teamOfTheWeek.currentScore.toFixed(1)}.`
    );
  }

  for (const division of facts.divisions) {
    const leader = division.standings[0];
    if (!leader) continue;
    lines.push(
      `${division.divisionName}: ${leader.teamName} lead at ${leader.wins}–${leader.losses}.`
    );
  }

  lines.push('Full standings at 717rec.app.');

  return lines.join('\n\n');
};
