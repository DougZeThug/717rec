import { PlayoffBracket, PlayoffMatch, PlayoffTeam } from '@/utils/playoffs/playoffTypes';
import { 
  BracketsManagerData, 
  Stage, 
  Group, 
  Round, 
  Match, 
  MatchGame, 
  Participant, 
  MatchStatus 
} from '../types/ewanMellorTypes';

export function transformPlayoffToEwanMellor(
  bracket: PlayoffBracket,
  matches: PlayoffMatch[],
  teams: PlayoffTeam[]
): BracketsManagerData {
  // Determine bracket type
  const isDoubleElimination = bracket.format?.toLowerCase().includes('double') ||
    matches.some(m => m.matchType === 'losers');

  // Create participants
  const participants: Participant[] = teams.map((team, index) => ({
    id: index + 1,
    tournament_id: 1,
    name: team.name
  }));

  // Create participant lookup
  const teamIdToParticipantId = new Map<string, number>();
  teams.forEach((team, index) => {
    teamIdToParticipantId.set(team.id, index + 1);
  });

  // Create stage
  const stage: Stage = {
    id: 1,
    tournament_id: 1,
    name: bracket.name || 'Tournament',
    type: isDoubleElimination ? 'double_elimination' : 'single_elimination',
    number: 1,
    settings: {
      size: teams.length,
      grandFinal: isDoubleElimination ? 'simple' : undefined,
      balanceByes: true
    }
  };

  // Group matches by type and round
  const winnerMatches = matches.filter(m => m.matchType === 'winners' || m.matchType === 'finals');
  const loserMatches = matches.filter(m => m.matchType === 'losers');

  // Create groups
  const groups: Group[] = [];
  let groupId = 1;

  // Winners bracket group
  if (winnerMatches.length > 0) {
    groups.push({
      id: groupId++,
      stage_id: 1,
      number: 1,
      name: 'Winners Bracket'
    });
  }

  // Losers bracket group (for double elimination)
  if (loserMatches.length > 0) {
    groups.push({
      id: groupId++,
      stage_id: 1,
      number: 2,
      name: 'Losers Bracket'
    });
  }

  // Create rounds
  const rounds: Round[] = [];
  let roundId = 1;

  // Process winners bracket rounds
  const winnerRounds = [...new Set(winnerMatches.map(m => m.round))].sort((a, b) => a - b);
  winnerRounds.forEach((roundNum, index) => {
    rounds.push({
      id: roundId++,
      number: roundNum,
      stage_id: 1,
      group_id: 1,
      name: `Round ${roundNum}`
    });
  });

  // Process losers bracket rounds
  const loserRounds = [...new Set(loserMatches.map(m => m.round))].sort((a, b) => a - b);
  loserRounds.forEach((roundNum, index) => {
    rounds.push({
      id: roundId++,
      number: roundNum,
      stage_id: 1,
      group_id: 2,
      name: `Losers Round ${roundNum}`
    });
  });

  // Create matches
  const transformedMatches: Match[] = matches.map((match, index) => {
    const roundInfo = rounds.find(r => 
      r.number === match.round && 
      r.group_id === (match.matchType === 'losers' ? 2 : 1)
    );

    const status = getMatchStatus(match);
    
    return {
      id: index + 1,
      number: match.position || index + 1,
      stage_id: 1,
      group_id: match.matchType === 'losers' ? 2 : 1,
      round_id: roundInfo?.id || 1,
      child_count: 0,
      status,
      opponent1: match.team1Id ? {
        id: teamIdToParticipantId.get(match.team1Id) || null,
        position: match.team1Seed || undefined,
        result: match.winnerId === match.team1Id ? 'win' : 
                match.winnerId && match.winnerId !== match.team1Id ? 'loss' : undefined,
        score: match.team1Score || undefined
      } : null,
      opponent2: match.team2Id ? {
        id: teamIdToParticipantId.get(match.team2Id) || null,
        position: match.team2Seed || undefined,
        result: match.winnerId === match.team2Id ? 'win' : 
                match.winnerId && match.winnerId !== match.team2Id ? 'loss' : undefined,
        score: match.team2Score || undefined
      } : null
    };
  });

  // Create match games if available
  const matchGames: MatchGame[] = [];
  matches.forEach((match, matchIndex) => {
    if (match.games && match.games.length > 0) {
      match.games.forEach((game, gameIndex) => {
        matchGames.push({
          id: matchGames.length + 1,
          number: game.gameNumber || gameIndex + 1,
          stage_id: 1,
          parent_id: matchIndex + 1,
          status: game.winnerId ? MatchStatus.Completed : MatchStatus.Ready,
          opponent1: {
            id: match.team1Id ? teamIdToParticipantId.get(match.team1Id) || null : null,
            result: game.winnerId === match.team1Id ? 'win' : 
                    game.winnerId && game.winnerId !== match.team1Id ? 'loss' : undefined,
            score: game.team1Score
          },
          opponent2: {
            id: match.team2Id ? teamIdToParticipantId.get(match.team2Id) || null : null,
            result: game.winnerId === match.team2Id ? 'win' : 
                    game.winnerId && game.winnerId !== match.team2Id ? 'loss' : undefined,
            score: game.team2Score
          }
        });
      });
    }
  });

  return {
    stage: [stage],
    group: groups,
    round: rounds,
    match: transformedMatches,
    match_game: matchGames,
    participant: participants
  };
}

function getMatchStatus(match: PlayoffMatch): MatchStatus {
  if (match.status === 'completed' || match.winnerId) {
    return MatchStatus.Completed;
  }
  if (match.status === 'in_progress') {
    return MatchStatus.Running;
  }
  if (match.team1Id && match.team2Id) {
    return MatchStatus.Ready;
  }
  return MatchStatus.Waiting;
}