
import React from "react";
import { Team, Match } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TeamLogo from "@/components/ui/team/TeamLogo";
import { TIME_BLOCKS } from "@/utils/autoScheduleUtils";

interface TeamPairing {
  team1: Team;
  team2: Team;
  compatibilityScore: number;
  hasPlayedBefore?: boolean;
}

interface ScheduleMatchesPreviewProps {
  pairings: Record<string, TeamPairing[]>;
  date: Date | null;
  isGenerating: boolean;
  onApplyPairings?: (pairings: Record<string, TeamPairing[]>) => void;
}

const ScheduleMatchesPreview: React.FC<ScheduleMatchesPreviewProps> = ({
  pairings,
  date,
  isGenerating,
  onApplyPairings
}) => {
  // Check if we have any pairings
  const hasPairings = Object.values(pairings).some(blockPairings => blockPairings?.length > 0);
  
  if (!date || !hasPairings) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No match pairings have been generated yet</p>
      </div>
    );
  }

  // Count total matches
  const totalMatches = Object.values(pairings).reduce(
    (acc, blockPairings) => acc + blockPairings.length, 0
  );

  // Count warnings (low compatibility scores or previous matches)
  const warningCount = Object.values(pairings).reduce(
    (acc, blockPairings) => acc + blockPairings.filter(
      pair => pair.compatibilityScore < 5 || pair.hasPlayedBefore
    ).length, 
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Generated Match Pairings</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {totalMatches} Matches
          </Badge>
          {warningCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {warningCount} Warnings
            </Badge>
          )}
        </div>
      </div>
      
      {Object.entries(pairings).map(([block, blockPairings]) => (
        <Card key={block} className="overflow-hidden">
          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{block} Block</span>
              <span className="text-xs text-muted-foreground">
                ({TIME_BLOCKS[block]?.main}, {TIME_BLOCKS[block]?.secondary})
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {blockPairings.length} Matches
            </Badge>
          </div>
          <CardContent className="p-3">
            {blockPairings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {blockPairings.map((pairing, idx) => (
                  <div 
                    key={`${pairing.team1.id}-${pairing.team2.id}`} 
                    className={`p-3 border rounded-md ${pairing.compatibilityScore < 5 || pairing.hasPlayedBefore ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">Match {idx + 1}</span>
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
                          imageUrl={pairing.team1.logoUrl} 
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
                          imageUrl={pairing.team2.logoUrl} 
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
                        {idx % 2 === 0 ? TIME_BLOCKS[block]?.main : TIME_BLOCKS[block]?.secondary}
                      </div>
                      <div>
                        {pairing.team2.wins}-{pairing.team2.losses}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-2 text-sm text-muted-foreground">
                No matches could be generated for this block
              </p>
            )}
          </CardContent>
        </Card>
      ))}
      
      <div className="text-xs text-muted-foreground mt-2">
        <p>* Match compatibility score is based on team records, power scores, and previous matches</p>
        <p>* Teams with similar skill levels are paired for more competitive matches</p>
      </div>
    </div>
  );
};

export default ScheduleMatchesPreview;
