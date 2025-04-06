
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { PlayoffBracket, Team, PlayoffMatch } from "@/types";

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
  
  // Group matches by round
  const matchesByRound: PlayoffMatch[][] = [];
  for (let i = 1; i <= maxRound; i++) {
    matchesByRound.push(
      bracket.matches
        .filter(match => match.round === i)
        .sort((a, b) => a.position - b.position)
    );
  }

  return (
    <div className="overflow-auto">
      <div className="flex space-x-6 min-w-max p-4">
        {matchesByRound.map((roundMatches, roundIndex) => {
          const round = roundIndex + 1;
          const roundLabel = 
            round === maxRound ? "Finals" : 
            round === maxRound - 1 ? "Semifinals" : 
            round === maxRound - 2 ? "Quarterfinals" : 
            `Round ${round}`;
            
          return (
            <div key={round} className="flex flex-col space-y-4">
              <div className="text-center font-bold text-cornhole-navy">{roundLabel}</div>
              
              <div className="flex flex-col space-y-12">
                {roundMatches.map(match => {
                  const team1 = getTeamById(match.team1Id);
                  const team2 = getTeamById(match.team2Id);
                  const winner = getTeamById(match.winnerId);
                  
                  return (
                    <Card 
                      key={match.id} 
                      className={`w-64 hover:shadow-md transition-shadow ${onEditMatch ? 'cursor-pointer' : ''}`}
                      onClick={() => onEditMatch && onEditMatch(match.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
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
                          
                          {winner && round === maxRound && (
                            <div className="mt-3 pt-3 border-t text-center">
                              <div className="text-sm text-gray-500">Winner</div>
                              <div className="font-bold text-cornhole-green">{winner.name}</div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BracketView;
