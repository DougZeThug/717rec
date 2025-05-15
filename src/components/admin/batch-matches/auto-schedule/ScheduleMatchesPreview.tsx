
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimeBlockHeader } from "./TimeBlockHeader";
import { MatchPairingItem } from "./MatchPairingItem";
import { TeamPairingMap } from "@/types/autoSchedule";
import { TIME_BLOCKS } from "@/utils/autoSchedule/constants";

interface ScheduleMatchesPreviewProps {
  pairings: TeamPairingMap;
  date: Date | null;
  isGenerating: boolean;
  dualMatchMode?: boolean;
}

const ScheduleMatchesPreview: React.FC<ScheduleMatchesPreviewProps> = ({
  pairings,
  date,
  isGenerating,
  dualMatchMode
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

  // Group pairs by team to analyze dual match assignments
  const teamMatches = new Map<string, string[]>();
  Object.entries(pairings).forEach(([block, pairs]) => {
    pairs.forEach(pair => {
      if (!teamMatches.has(pair.team1.id)) teamMatches.set(pair.team1.id, []);
      if (!teamMatches.has(pair.team2.id)) teamMatches.set(pair.team2.id, []);
      
      teamMatches.get(pair.team1.id)?.push(block);
      teamMatches.get(pair.team2.id)?.push(block);
    });
  });

  // Check if all teams have matches in both blocks when in dual match mode
  const teamsWithIncompleteMatches = dualMatchMode 
    ? Array.from(teamMatches.entries())
      .filter(([_, blocks]) => blocks.length < 2)
      .map(([teamId, _]) => teamId)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Generated Match Pairings</h3>
        <div className="flex items-center gap-2">
          {dualMatchMode && (
            <Badge variant="secondary" className="text-xs">
              Dual Match Mode
            </Badge>
          )}
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
      
      {dualMatchMode && teamsWithIncompleteMatches.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 mb-2">
          <p className="font-medium">Some teams are not scheduled for both time blocks:</p>
          <p className="text-xs mt-1">This usually happens with an odd number of teams or when compatibility constraints couldn't be satisfied.</p>
        </div>
      )}
      
      {Object.entries(pairings).map(([block, blockPairings]) => (
        <Card key={block} className="overflow-hidden">
          <TimeBlockHeader 
            blockName={block} 
            teamCount={blockPairings.length * 2} 
            timeslots={[TIME_BLOCKS[block]?.main, TIME_BLOCKS[block]?.secondary]} 
          />
          <CardContent className="p-3">
            {blockPairings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {blockPairings.map((pairing, idx) => (
                  <MatchPairingItem 
                    key={`${pairing.team1.id}-${pairing.team2.id}`}
                    pairing={pairing}
                    index={idx}
                    blockName={block}
                    isDualMatchMode={dualMatchMode}
                  />
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
        {dualMatchMode && (
          <p>* In dual match mode, teams are scheduled to play in both time blocks with different opponents</p>
        )}
      </div>
    </div>
  );
};

export default ScheduleMatchesPreview;
