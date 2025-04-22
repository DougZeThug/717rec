import React from "react";
import { Link } from "react-router-dom";
import { Match, Team } from "@/types";
import { getCardInteractionStyles } from "@/styles/interactionUtils";

interface MatchCardProps {
  match: Match;
  team1: Team;
  team2: Team;
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  team1,
  team2, 
  formatDate, 
  formatTime 
}) => {
  return (
    <Link to={`/schedule?matchId=${match.id}`} className="block">
      <div className={getCardInteractionStyles("bg-white rounded-lg shadow-md overflow-hidden transform transition-all duration-200")}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-200 flex-shrink-0 flex items-center justify-center">
                {team1?.imageUrl ? (
                  <img 
                    src={team1.imageUrl} 
                    alt={team1.name} 
                    className="w-10 h-10 rounded-none object-contain"
                    onError={(e) => {
                      console.error(`Image load error for ${team1.name}:`, team1.imageUrl);
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=300&fit=crop';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-200 text-gray-400">
                    <span className="text-xs">No Logo</span>
                  </div>
                )}
              </div>
              <span className="ml-3 font-medium">{team1.name}</span>
            </div>
            <span className="text-lg font-bold mx-2">VS</span>
            <div className="flex items-center">
              <span className="mr-3 font-medium">{team2.name}</span>
              <div className="w-10 h-10 bg-gray-200 flex-shrink-0 flex items-center justify-center">
                {team2?.imageUrl ? (
                  <img 
                    src={team2.imageUrl} 
                    alt={team2.name} 
                    className="w-10 h-10 rounded-none object-contain"
                    onError={(e) => {
                      console.error(`Image load error for ${team2.name}:`, team2.imageUrl);
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=300&fit=crop';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-200 text-gray-400">
                    <span className="text-xs">No Logo</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-4">
            <div>
              <p><strong>Date:</strong> {formatDate(match.date!)}</p>
              <p><strong>Time:</strong> {formatTime(match.date!)}</p>
            </div>
            <div className="text-right">
              <p><strong>Score:</strong></p>
              <p>{match.team1Score} - {match.team2Score}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MatchCard;
