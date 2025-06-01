
import React from "react";
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SimpleBracketProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
}

const SimpleBracket: React.FC<SimpleBracketProps> = ({ bracket, onMatchClick }) => {
  console.log('🎯 SimpleBracket: Rendering bracket:', bracket.name);
  console.log('🎯 SimpleBracket: Matches count:', bracket.matches.length);

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

  if (bracket.matches.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-xl font-semibold mb-2">{bracket.name}</h3>
        <p className="text-gray-500">No matches found for this bracket</p>
        <div className="text-sm text-gray-400 mt-2">
          Bracket ID: {bracket.id} | State: {bracket.state}
        </div>
      </div>
    );
  }

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
                    className={`p-4 min-w-[250px] cursor-pointer hover:shadow-md transition-shadow ${
                      onMatchClick ? 'hover:bg-gray-50' : ''
                    }`}
                    onClick={() => onMatchClick?.(match.id)}
                  >
                    <div className="space-y-2">
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
                      
                      <div className="space-y-1">
                        <div className={`flex justify-between items-center p-2 rounded ${
                          match.winnerId === match.team1Id ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}>
                          <span className="font-medium">
                            {match.team1Name || 'TBD'}
                          </span>
                          <span className="font-bold">
                            {match.team1Score ?? '-'}
                          </span>
                        </div>
                        
                        <div className={`flex justify-between items-center p-2 rounded ${
                          match.winnerId === match.team2Id ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}>
                          <span className="font-medium">
                            {match.team2Name || 'TBD'}
                          </span>
                          <span className="font-bold">
                            {match.team2Score ?? '-'}
                          </span>
                        </div>
                      </div>
                      
                      {match.winnerId && (
                        <div className="text-xs text-green-600 font-medium">
                          Winner: {match.winnerId === match.team1Id ? match.team1Name : match.team2Name}
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
