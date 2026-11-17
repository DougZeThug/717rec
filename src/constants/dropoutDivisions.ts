import { isHiddenDivisionName } from '@/utils/divisions/realDivisionOverrides';

/**
 * The real division of each team that dropped out, for the season it played in.
 *
 * From Doug, 2026-11-16. The stored names say Hidden because the team was moved
 * to Hidden after it dropped out, and the move overwrote its division. These
 * 8 team-seasons hold 22 real games, which the Team page, Career and the league
 * division card file under the division below instead.
 *
 * Key: "teamId_seasonId". Value: the division display name. The Power Score
 * lookup (RealDivisionService) fills in later dropouts, so this list only needs
 * a row for a team the lookup cannot answer. A row here beats the lookup.
 */
export const DROPOUT_DIVISIONS: Record<string, string> = {
  // Bag Assassins, Fall 2025 (1 game)
  '21f5f389-1ad4-4dc5-a828-0e2972c13845_34cd19e2-abf5-43b8-a16f-6d73a0e998ac': 'Intermediate',
  // Shut Your Cornhole, Fall 2025 (4 games)
  '5db6b718-81af-4bd0-a0cd-0a0eae4330ad_34cd19e2-abf5-43b8-a16f-6d73a0e998ac': 'Competitive',
  // Jerm, Winter 1 2026 (2 games)
  'aa967a4d-b9a8-496e-81e9-7993ac005763_4b90a1d8-b90a-4e47-8e8c-b89a7b54e106': 'Recreational',
  // Red Roof Rockets, Winter 1 2026 (1 game)
  'e91cb2d1-ef48-48e7-b15f-735c941f3679_4b90a1d8-b90a-4e47-8e8c-b89a7b54e106': 'Recreational',
  // The Tomato Saucers, Winter 2 2026 (2 games)
  'accd6e20-f761-4769-8cdc-6c9495cc231c_9cd55eb8-672c-4a43-a9df-3552a7759cca': 'Recreational',
  // Baggin' & Braggin', Spring 2026 (4 games)
  'fcb5fb21-a8f4-4dbd-a04d-7688832ada8c_660382ee-e13b-4866-81fc-7e51c4df5d11': 'Competitive',
  // Burning Holes & Taking Souls, Summer 1 2026 (6 games)
  'eb7976c7-fc7f-40e9-926d-d8bd1754003d_7df71033-ed43-40f7-bad6-8c411cf3a241': 'Recreational',
  // Zoo Pals, Fall 2026, the active season (2 games)
  '56387477-8ba1-43b7-a307-414926ca5f79_02572002-9c31-467c-99db-bd3bbf2cdf7c': 'Intermediate',
};

/**
 * Puts Doug's list on top of the lookup's answers. A row in the list WINS over
 * the lookup for the same team and season. Returns a new map. A blank or
 * Hidden name in the list is skipped, so it never wipes out a good answer.
 * `dropout` is a parameter only so a test can pass its own list.
 */
export const applyDropoutDivisions = (
  lookup: ReadonlyMap<string, string>,
  dropout: Readonly<Record<string, string>> = DROPOUT_DIVISIONS
): Map<string, string> => {
  const merged = new Map<string, string>(lookup);
  for (const [key, realName] of Object.entries(dropout)) {
    if (!realName.trim() || isHiddenDivisionName(realName)) continue;
    merged.set(key, realName);
  }
  return merged;
};
