
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
}

const ScheduleMatchesPreview: React.FC<ScheduleMatchesPreviewProps> = ({
  pairings,
  date,
  isGenerating
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
      </div>
    </div>
  );
};

export default ScheduleMatchesPreview;
