
import React from "react";
import { Team } from "@/types";
import { Link } from "react-router-dom";
import { getCardInteractionStyles } from "@/styles/interactionUtils";
import { calculateWinPercentage } from "@/utils/rankingUtils/calculateWinPercentage";
import { useTheme } from "next-themes";

interface TeamCardProps {
  team: Team;
}

const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  // Parse and ensure we're working with numbers for calculations
  const wins = parseInt(String(team.wins)) || 0;
  const losses = parseInt(String(team.losses)) || 0;
  
  // Get game stats with fallbacks
  const gameWins = parseInt(String(team.game_wins)) || 0;
  const gameLosses = parseInt(String(team.game_losses)) || 0;
  
  // Use the consistent win percentage calculation
  const winPercentage = calculateWinPercentage(wins, losses) * 100;
  
  // Get SOS and Power Score with fallbacks
  const sos = team.sos !== undefined ? team.sos : 0;
  const powerScore = team.power_score !== undefined ? team.power_score : 0;
  
  console.debug('[HomeTeamCard]', team.id, 'imageUrl:', team.imageUrl);
  
  return (
    <div className={getCardInteractionStyles("bg-white rounded-lg shadow-md overflow-hidden mb-4 sm:mb-0 text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#1E1E1E] dark:text-white dark:border-none")}>
      <Link to={`/teams/${team.id}`} className="block">
        <div className="h-44 bg-gray-200 relative flex items-center justify-center p-3">
          <div className="w-full h-full flex items-center justify-center">
            {team.imageUrl ? (
              <img 
                src={team.imageUrl} 
                alt={team.name} 
                className="max-h-36 max-w-full object-contain"
                onError={(e) => {
                  console.error(`Image load error for ${team.name}:`, team.imageUrl);
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=300&fit=crop';
                }}
              />
            ) : (
              <div className="text-gray-400 text-center">
                <span>No Logo Available</span>
              </div>
            )}
          </div>
        </div>
        <div className="p-3 font-inter">
          <h3 className="text-lg font-bold mb-1.5 truncate text-[#1a1a1a] dark:text-white" title={team.name}>{team.name}</h3>
          <div className="flex justify-between text-xs">
            <span>Record:</span>
            <span className="font-medium">{wins} - {losses}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>Win %:</span>
            <span className="font-medium">
              {winPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>Games:</span>
            <span className="font-medium">
              {gameWins}–{gameLosses}
            </span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>SOS:</span>
            <span className="font-medium">
              {sos.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>Power Score:</span>
            <span className="font-medium">
              {powerScore.toFixed(1)}
            </span>
          </div>
          {team.divisionName && (
            <div className="flex justify-between text-xs mt-1">
              <span>Division:</span>
              <span className="font-medium">{team.divisionName}</span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default TeamCard;
