
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlayoffBracket, Team, PlayoffMatch, PlayoffGame } from "@/types";

interface BracketViewProps {
  bracket: PlayoffBracket;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
}

const BracketView: React.FC<BracketViewProps> = ({ bracket, teams, onEditMatch }) => {
  const getTeamById = (id?: string) => {
    if (!id) return null;
    return teams.find(team => team.id === id);
  };

  const maxRound = Math.max(...bracket.matches.map(match => match.round));
  
  // Group matches by round and type
  const matchesByRoundAndType: Record<string, PlayoffMatch[]> = {};
  
  bracket.matches.forEach(match => {
    const key = `${match.round}-${match.matchType || 'Winners'}`;
    if (!matchesByRoundAndType[key]) {
      matchesByRoundAndType[key] = [];
    }
    matchesByRoundAndType[key].push(match);
  });
  
  // Sort each group by position
  Object.keys(matchesByRoundAndType).forEach(key => {
    matchesByRoundAndType[key].sort((a, b) => a.position - b.position);
  });

  // Get unique rounds and types
  const roundsAndTypes = Object.keys(matchesByRoundAndType).sort((a, b) => {
    const [roundA, typeA] = a.split('-');
    const [roundB, typeB] = b.split('-');
    if (roundA === roundB) {
      // Winners bracket comes first, then losers, then finals
      if (typeA === 'Finals') return 1;
      if (typeB === 'Finals') return -1;
      return typeA === 'Winners' ? -1 : 1;
    }
    return parseInt(roundA) - parseInt(roundB);
  });

  // Function to get the next match based on current match's winner
  const getNextMatch = (match: PlayoffMatch): PlayoffMatch | null => {
    if (!match.winnerId) return null;
    
    return bracket.matches.find(m => 
      (m.team1Id === match.winnerId || m.team2Id === match.winnerId) && 
      m.round > match.round
    ) || null;
  };

  return (
    <div className="overflow-auto">
      <div className="flex flex-col space-y-6 min-w-max p-4">
        <div className="flex space-x-16 relative">
          {roundsAndTypes.map((key) => {
            const [round, type] = key.split('-');
            const roundMatches = matchesByRoundAndType[key];
            
            const roundLabel = 
              type === 'Finals' ? "Finals" : 
              parseInt(round) === maxRound && type === 'Winners' ? "Winners Finals" :
              parseInt(round) === maxRound - 1 && type === 'Winners' ? "Winners Semifinals" : 
              parseInt(round) === maxRound - 2 && type === 'Winners' ? "Winners Quarterfinals" : 
              parseInt(round) === maxRound && type === 'Losers' ? "Losers Finals" :
              parseInt(round) === maxRound - 1 && type === 'Losers' ? "Losers Semifinals" : 
              `${type} Round ${round}`;
              
            return (
              <div key={key} className="flex flex-col space-y-4 relative" style={{ zIndex: 10 }}>
                <div className="text-center">
                  <Badge 
                    variant={type === 'Winners' ? 'default' : type === 'Losers' ? 'secondary' : 'outline'}
                    className="font-bold mb-2"
                  >
                    {roundLabel}
                  </Badge>
                </div>
                
                <div className="flex flex-col space-y-24">
                  {roundMatches.map((match, index) => {
                    const team1 = getTeamById(match.team1Id);
                    const team2 = getTeamById(match.team2Id);
                    const winner = getTeamById(match.winnerId);
                    const nextMatch = getNextMatch(match);
                    
                    return (
                      <div key={match.id} className="relative">
                        {/* Draw connecting lines to next match (if there is one) */}
                        {nextMatch && (
                          <svg 
                            className="absolute top-0 left-full h-full w-16"
                            style={{ pointerEvents: 'none', zIndex: 1 }}
                          >
                            <path
                              d={`M 0,${40} L 32,${40} L 32,${nextMatch.position > match.position ? -30 : 110} L 64,${nextMatch.position > match.position ? -30 : 110}`}
                              stroke="#9ca3af"
                              strokeWidth="2"
                              fill="transparent"
                            />
                          </svg>
                        )}
                        
                        <Card 
                          className={`w-80 hover:shadow-md transition-shadow ${onEditMatch ? 'cursor-pointer' : ''}`}
                          onClick={() => onEditMatch && onEditMatch(match.id)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                                <span>Best of {match.bestOf || 3}</span>
                                <span>{match.matchType || "Match"}</span>
                              </div>

                              <div className={`flex items-center p-2 rounded-t-md ${match.team1Id === match.winnerId ? 'bg-green-50' : 'bg-gray-50'}`}>
                                {team1 ? (
                                  <>
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                                      {team1.logoUrl && (
                                        <img 
                                          src={team1.logoUrl} 
                                          alt={team1.name} 
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                    </div>
                                    <span className="flex-1 truncate">{team1.name}</span>
                                    {match.team1Score !== undefined && (
                                      <span className={`font-bold ${match.team1Id === match.winnerId ? 'text-green-600' : ''}`}>
                                        {match.team1Score}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400 italic">TBD</span>
                                )}
                              </div>
                              
                              <div className={`flex items-center p-2 rounded-b-md ${match.team2Id === match.winnerId ? 'bg-green-50' : 'bg-gray-50'}`}>
                                {team2 ? (
                                  <>
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                                      {team2.logoUrl && (
                                        <img 
                                          src={team2.logoUrl} 
                                          alt={team2.name} 
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                    </div>
                                    <span className="flex-1 truncate">{team2.name}</span>
                                    {match.team2Score !== undefined && (
                                      <span className={`font-bold ${match.team2Id === match.winnerId ? 'text-green-600' : ''}`}>
                                        {match.team2Score}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400 italic">TBD</span>
                                )}
                              </div>

                              {/* Games details */}
                              {match.games && match.games.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <div className="text-sm font-semibold mb-2">Games</div>
                                  <div className="space-y-2">
                                    {match.games.map((game, index) => (
                                      <div key={game.id} className="flex justify-between items-center text-sm">
                                        <span>Game {index + 1}</span>
                                        <div>
                                          <span className={game.winner === match.team1Id ? "font-bold" : ""}>
                                            {game.team1Score}
                                          </span>
                                          {" - "}
                                          <span className={game.winner === match.team2Id ? "font-bold" : ""}>
                                            {game.team2Score}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {winner && type === 'Finals' && (
                                <div className="mt-3 pt-3 border-t text-center">
                                  <div className="text-sm text-gray-500">Champion</div>
                                  <div className="font-bold text-cornhole-green">{winner.name}</div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BracketView;
