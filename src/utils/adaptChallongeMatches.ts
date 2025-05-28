
import { ChallongeMatch } from '@/services/challonge/types';

export function adaptChallongeMatches(
  matches: ChallongeMatch[],
  nameMap: Record<number, string>,
) {
  return matches.map(m => ({
    id: m.id.toString(),
    name: `${m.id}`,
    nextMatchId: null,          // g-loot auto-links by round
    tournamentRoundText: '',
    startTime: '',
    state: m.state === 'complete' ? 'DONE' : 'SCORE_DONE',
    participants: [
      {
        id: m.player1_id?.toString() ?? '',
        name: nameMap[m.player1_id] ?? 'TBD',
        resultText: '',
        isWinner: m.winner_id === m.player1_id,
        status: m.state === 'complete' ? 'PLAYED' : 'NO_SHOW',
      },
      {
        id: m.player2_id?.toString() ?? '',
        name: nameMap[m.player2_id] ?? 'TBD',
        resultText: '',
        isWinner: m.winner_id === m.player2_id,
        status: m.state === 'complete' ? 'PLAYED' : 'NO_SHOW',
      },
    ],
  }));
}
