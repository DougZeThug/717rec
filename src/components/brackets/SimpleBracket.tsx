
import React from "react";
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SimpleBracketProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
}

const SimpleBracket: React.FC<SimpleBracketProps> = ({ bracket, onMatchClick }) => {
  console.log('🎯 PHASE 1 FIX: SimpleBracket rendering with bracket:', {
    id: bracket?.id,
    name: bracket?.name,
    matchesReceived: bracket?.matches?.length || 0,
    teamsReceived: bracket?.teams?.length || 0
  });
  
  if (bracket?.matches && bracket.matches.length > 0) {
    console.log('🎯 PHASE 1 FIX: SimpleBracket has matches! Details:', {
      totalMatches: bracket.matches.length,
      sampleMatch: bracket.matches[0],
      matchesWithTeams: bracket.matches.filter(m => m.team1Id || m.team2Id).length,
      emptyMatches: bracket.matches.filter(m => !m.team1Id && !m.team2Id).length,
      rounds: [...new Set(bracket.matches.map(m => m.round))].sort()
    });
  } else {
    console.log('🎯 PHASE 1 FIX: SimpleBracket has NO matches - investigating:', {
      bracketExists: !!bracket,
      matchesProperty: bracket?.matches,
      matchesType: typeof bracket?.matches,
      matchesIsArray: Array.isArray(bracket?.matches)
    });
  }

  // Group matches by round for display
  const matchesByRound = bracket.matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof bracket.matches>);

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  console.log('🎯 PHASE 1 FIX: Rounds organized:', {
    roundsCount: rounds.length,
    rounds: rounds,
    matchesByRound: Object.keys(matchesByRound).map(round => ({
      round: Number(round),
      matchCount: matchesByRound[Number(round)].length
    }))
  });

  // Check if we truly have no matches vs just no teams assigned
  if (bracket.matches.length === 0) {
    console.log('🎯 PHASE 1 FIX: Showing empty state - no matches found');
    return (
      <div className="text-center p-8">
        <h3 className="text-xl font-semibold mb-2">{bracket.name}</h3>
        <p className="text-gray-500">No matches have been created for this bracket yet</p>
        <div className="text-sm text-gray-400 mt-2">
          Bracket ID: {bracket.id} | State: {bracket.state}
        </div>
        <div className="text-sm text-gray-400 mt-1">
          Teams available in division: {bracket.teams.length}
        </div>
      </div>
    );
  }

  console.log('🎯 PHASE 1 FIX: Rendering bracket with matches');

  // Show bracket with matches (even if teams aren't assigned yet)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{bracket.name}</h2>
        <div className="flex gap-2">
          <Badge variant="outline">{bracket.format}</Badge>
          <Badge variant={bracket.state === 'completed' ? 'default' : 'secondary'}>
            {bracket.state}
          </Badge>
        </div>
      </div>

      {/* Debug info when in development */}
      <div className="text-xs text-gray-400 mb-4">
        🎯 PHASE 1 DEBUG: Matches: {bracket.matches.length} | Teams in division: {bracket.teams.length} | Rounds: {rounds.length}
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {rounds.map(round => (
          <div key={round} className="flex-shrink-0">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Round {round}
            </h3>
            <div className="space-y-4">
              {matchesByRound[round]
                .sort((a, b) => a.position - b.position)
                .map(match => (
                  <Card 
                    key={match.id} 
                    className={`p-4 min-w-[280px] cursor-pointer hover:shadow-md transition-shadow ${
                      onMatchClick ? 'hover:bg-gray-50' : ''
                    }`}
                    onClick={() => onMatchClick?.(match.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {match.matchType} • Position {match.position}
                        </span>
                        <Badge 
                          variant={match.status === 'completed' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {match.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {/* Team 1 */}
                        <div className={`flex justify-between items-center p-3 rounded-lg ${
                          match.winnerId === match.team1Id ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center gap-2">
                            {match.team1Logo && (
                              <img 
                                src={match.team1Logo} 
                                alt={`${match.team1Name} logo`}
                                className="w-6 h-6 rounded object-cover"
                              />
                            )}
                            <span className="font-medium">
                              {match.team1Name || 'TBD'}
                            </span>
                          </div>
                          <span className="font-bold text-lg">
                            {match.team1Score ?? '-'}
                          </span>
                        </div>
                        
                        {/* Team 2 */}
                        <div className={`flex justify-between items-center p-3 rounded-lg ${
                          match.winnerId === match.team2Id ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center gap-2">
                            {match.team2Logo && (
                              <img 
                                src={match.team2Logo} 
                                alt={`${match.team2Name} logo`}
                                className="w-6 h-6 rounded object-cover"
                              />
                            )}
                            <span className="font-medium">
                              {match.team2Name || 'TBD'}
                            </span>
                          </div>
                          <span className="font-bold text-lg">
                            {match.team2Score ?? '-'}
                          </span>
                        </div>
                      </div>
                      
                      {match.winnerId && (
                        <div className="text-xs text-green-600 font-medium pt-1">
                          Winner: {match.winnerId === match.team1Id ? match.team1Name : match.team2Name}
                        </div>
                      )}

                      {/* Only show debug info for matches without teams in development */}
                      {(!match.team1Name && !match.team2Name) && (
                        <div className="text-xs text-orange-500 pt-1">
                          Awaiting team assignments
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleBracket;
