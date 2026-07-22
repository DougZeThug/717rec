import { ValidationError } from '@/types/errors';

/**
 * brackets-manager resolves object seeding back to its stored participant
 * rows BY NAME (mapParticipantsNamesToDatabase), so two teams sharing a
 * display name silently collapse into one participant occupying two slots.
 * The teams table does not enforce unique names, and the library's own
 * duplicate check compares whole seeding objects (name + team_id), which
 * never trips for this case — so reject it up front with a message an
 * admin can act on.
 */
export function assertUniqueSeedingNames(teams: { name: string }[]): void {
  const seen = new Set<string>();
  for (const team of teams) {
    if (seen.has(team.name)) {
      throw new ValidationError(
        `Two of the selected teams are both named "${team.name}". ` +
          'The bracket engine tells teams apart by name — please rename one of them, then try again.'
      );
    }
    seen.add(team.name);
  }
}
