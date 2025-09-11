
import React from "react";
import { TeamPairing } from "@/types/autoSchedule";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Info, CheckCircle } from "lucide-react";
import TeamLogo from "@/components/ui/team/TeamLogo";
import { TIME_BLOCKS } from "@/utils/autoSchedule/constants";

interface MatchPairingItemProps {
  pairing: TeamPairing;
  index: number;
  blockName: string;
  isDualMatchMode?: boolean;
}

export const MatchPairingItem: React.FC<MatchPairingItemProps> = ({ 
  pairing, 
  index,
  blockName,
  isDualMatchMode
}) => {
  // Determine UI state based on compatibility score and match history
  const isWarning = pairing.compatibilityScore < 5 || pairing.hasPlayedBefore;
  const timeslot = index % 2 === 0 
    ? TIME_BLOCKS[blockName]?.main 
    : TIME_BLOCKS[blockName]?.secondary;

  return (
    <div 
      className={`p-3 border rounded-md ${
        isWarning 
          ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' 
          : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">Match {index + 1}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                {pairing.hasPlayedBefore ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                ) : pairing.compatibilityScore < 5 ? (
                  <Info className="h-4 w-4 text-amber-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                  Score: {pairing.compatibilityScore.toFixed(1)}/10
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {pairing.hasPlayedBefore 
                  ? "These teams have played against each other before" 
                  : pairing.compatibilityScore < 5 
                    ? "These teams may not be evenly matched" 
                    : "Good match pairing"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
        {/* Team 1 */}
        <div className="flex items-center gap-2">
          <TeamLogo 
            imageUrl={pairing.team1.imageUrl || pairing.team1.logoUrl} 
            teamName={pairing.team1.name} 
            className="h-6 w-6" 
          />
          <span className="text-sm truncate font-medium">{pairing.team1.name}</span>
        </div>

        <span className="text-xs px-2 font-medium">VS</span>

        {/* Team 2 */}
        <div className="flex items-center gap-2 justify-end">
          <span className="text-sm truncate font-medium">{pairing.team2.name}</span>
          <TeamLogo 
            imageUrl={pairing.team2.imageUrl || pairing.team2.logoUrl} 
            teamName={pairing.team2.name} 
            className="h-6 w-6" 
          />
        </div>
      </div>

      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
        <div>
          {pairing.team1.wins}-{pairing.team1.losses}
        </div>
        <div className="text-center">
          {isDualMatchMode && blockName === 'Early' ? TIME_BLOCKS[blockName]?.main : 
           isDualMatchMode && blockName === 'Late' ? TIME_BLOCKS[blockName]?.secondary : 
           timeslot}
        </div>
        <div>
          {pairing.team2.wins}-{pairing.team2.losses}
        </div>
      </div>
      
      {isDualMatchMode && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="text-xs text-center text-muted-foreground">
            {blockName === 'Early' ? 
              "Teams will also play at 7:00 PM with different opponents" : 
              "Teams also played at 6:30 PM with different opponents"}
          </div>
        </div>
      )}
    </div>
  );
};
