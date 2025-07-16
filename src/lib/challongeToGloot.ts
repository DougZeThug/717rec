import type { Match as GlootMatch } from '@g-loot/react-tournament-brackets';
import { ChallongeMatch, ChallongeParticipant } from '@/services/challonge/types';

export function adaptChallongeToGloot(
  matches: ChallongeMatch[],
  participants: ChallongeParticipant[]
): GlootMatch[] {
  const nameMap = Object.fromEntries(
    participants.map(p => [p.id, p.name])
  );

  console.log('🔧 Adapter Debug:');
  console.log('Name map:', nameMap);
  console.log('Matches to process:', matches.length);

  return matches.map((m): GlootMatch => {
    // Better participant handling
    const p1 = m.player1_id ? {
      id: String(m.player1_id),
      name: nameMap[m.player1_id] || 'TBD',
      isWinner: m.winner_id === m.player1_id,
      resultText: m.winner_id === m.player1_id ? 'W' : (m.winner_id === m.player2_id ? 'L' : ''),
      status: m.state === 'complete' ? 'PLAYED' as const : 
              m.state === 'pending' ? 'WALK_OVER' as const : 'NO_SHOW' as const
    } : null;

    const p2 = m.player2_id ? {
      id: String(m.player2_id),
      name: nameMap[m.player2_id] || 'TBD',
      isWinner: m.winner_id === m.player2_id,
      resultText: m.winner_id === m.player2_id ? 'W' : (m.winner_id === m.player1_id ? 'L' : ''),
      status: m.state === 'complete' ? 'PLAYED' as const : 
              m.state === 'pending' ? 'WALK_OVER' as const : 'NO_SHOW' as const
    } : null;

    // Better match state handling
    const matchState = m.state === 'complete' ? 'DONE' : 
                      m.state === 'pending' ? 'SCORE_DONE' : 'SCHEDULED';
    
    const result = {
      id: String(m.id),
      name: `Match ${m.id}`,
      nextMatchId: m.next_match_id ? String(m.next_match_id) : undefined,
      tournamentRoundText: m.round > 0 ? `Winners R${m.round}` 
        : m.round < 0 ? `Losers R${Math.abs(m.round)}` 
        : 'Final',
      startTime: new Date().toISOString(),
      state: matchState,
      participants: [
        p1 ?? { id: 'bye', name: 'BYE', resultText: '', isWinner: false, status: 'NO_PARTY' as const },
        p2 ?? { id: 'bye', name: 'BYE', resultText: '', isWinner: false, status: 'NO_PARTY' as const }
      ],
    };
    
    console.log(`Match ${m.id}:`, {
      round: m.round,
      player1_id: m.player1_id,
      player2_id: m.player2_id,
      player1_name: p1?.name,
      player2_name: p2?.name,
      state: m.state,
      winner_id: m.winner_id
    });
    
    return result;
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