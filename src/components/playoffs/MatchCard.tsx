
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { PlayoffMatch, Team, PlayoffGame } from "@/types";

interface MatchCardProps {
  match: PlayoffMatch;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  hasNextMatch: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  teams, 
  onEditMatch,
  hasNextMatch
}) => {
  const getTeamById = (id?: string) => {
    if (!id) return null;
    return teams.find(team => team.id === id);
  };

  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);
  const winner = getTeamById(match.winnerId);
  
  return (
    <div className="relative flex">
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

            {/* Team 1 */}
            <div className={`flex items-center p-2 rounded-t-md ${match.team1Id === match.winnerId ? 'bg-green-50' : 'bg-gray-50'}`}>
              {team1 ? (
                <>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                    {team1.imageUrl && (
                      <img 
                        src={team1.imageUrl} 
                        alt={team1.name} 
                        className="w-full h-full object-contain"
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
            
            {/* Team 2 */}
            <div className={`flex items-center p-2 rounded-b-md ${match.team2Id === match.winnerId ? 'bg-green-50' : 'bg-gray-50'}`}>
              {team2 ? (
                <>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                    {team2.imageUrl && (
                      <img 
                        src={team2.imageUrl} 
                        alt={team2.name} 
                        className="w-full h-full object-contain"
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
            <MatchGames match={match} />
            
            {/* Finals Champion */}
            {winner && match.matchType === 'Finals' && (
              <div className="mt-3 pt-3 border-t text-center">
                <div className="text-sm text-gray-500">Champion</div>
                <div className="font-bold text-cornhole-green">{winner.name}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Bracket connecting lines */}
      {hasNextMatch && (
        <svg 
          className="absolute top-1/2 -right-16 h-full w-16"
          style={{ 
            pointerEvents: 'none', 
            zIndex: 1,
            transform: 'translateY(-50%)'
          }}
        >
          <line
            x1="0"
            y1="40"
            x2="64"
            y2="40"
            stroke="#9ca3af"
            strokeWidth="2"
          />
        </svg>
      )}
    </div>
  );
};

// Sub-component for match games
const MatchGames: React.FC<{ match: PlayoffMatch }> = ({ match }) => {
  if (!match.games || match.games.length === 0) return null;
  
  return (
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
  );
};

export default MatchCard;
