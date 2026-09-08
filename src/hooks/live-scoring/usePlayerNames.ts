import { useMemo } from 'react';

interface NamedPlayer {
  id: string;
  display_name: string;
}

/** Player id to display name, for both rosters in one lookup. */
export const usePlayerNames = (
  team1Players: NamedPlayer[],
  team2Players: NamedPlayer[]
): Record<string, string> =>
  useMemo(() => {
    const names: Record<string, string> = {};
    for (const player of [...team1Players, ...team2Players]) {
      names[player.id] = player.display_name;
    }
    return names;
  }, [team1Players, team2Players]);
