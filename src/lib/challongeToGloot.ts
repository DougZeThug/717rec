import type { Match as GlootMatch } from '@g-loot/react-tournament-brackets';
import { ChallongeMatch, ChallongeParticipant } from '@/services/challonge/types';

export function adaptChallongeToGloot(
  matches: ChallongeMatch[],
  participants: ChallongeParticipant[]
): GlootMatch[] {
  const nameMap = Object.fromEntries(
    participants.map(p => [p.id, p.name])
  );

  return matches.map((m): GlootMatch => {
    const p1 = m.player1_id ? {
      id: String(m.player1_id),
      name: nameMap[m.player1_id] ?? 'TBD',
      isWinner: m.winner_id === m.player1_id,
      resultText: m.winner_id === m.player1_id ? 'W' : (m.winner_id === m.player2_id ? 'L' : ''),
      status: m.state === 'complete' ? 'PLAYED' as const : 'WALK_OVER' as const
    } : null;

    const p2 = m.player2_id ? {
      id: String(m.player2_id),
      name: nameMap[m.player2_id] ?? 'TBD',
      isWinner: m.winner_id === m.player2_id,
      resultText: m.winner_id === m.player2_id ? 'W' : (m.winner_id === m.player1_id ? 'L' : ''),
      status: m.state === 'complete' ? 'PLAYED' as const : 'WALK_OVER' as const
    } : null;

    return {
      id: String(m.id),
      name: `R${Math.abs(m.round)}`,
      nextMatchId: m.next_match_id ? String(m.next_match_id) : undefined,
      tournamentRoundText: m.round > 0 ? `Winners R${m.round}` 
        : m.round < 0 ? `Losers R${Math.abs(m.round)}` 
        : 'Final',
      startTime: new Date().toISOString(),
      state: m.winner_id ? 'DONE' : 'SCHEDULED',
      participants: [
        p1 ?? { id: 'bye', name: 'BYE', resultText: '', isWinner: false, status: 'NO_PARTY' as const },
        p2 ?? { id: 'bye', name: 'BYE', resultText: '', isWinner: false, status: 'NO_PARTY' as const }
      ],
    };
  });
}

export function separateDoubleEliminationMatches(glootMatches: GlootMatch[]) {
  const upper: GlootMatch[] = [];
  const lower: GlootMatch[] = [];

  glootMatches.forEach(match => {
    if (match.tournamentRoundText?.includes('Winners') || match.tournamentRoundText === 'Final') {
      upper.push(match);
    } else if (match.tournamentRoundText?.includes('Losers')) {
      lower.push(match);
    }
  });

  return { upper, lower };
}