import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { SchedulingDiagnostics, TeamPairingMap } from '@/types/autoSchedule';
import { TIME_BLOCKS } from '@/utils/autoSchedule/constants';

import { MatchPairingItem } from './MatchPairingItem';
import { TimeBlockHeader } from './TimeBlockHeader';

interface ScheduleMatchesPreviewProps {
  pairings: TeamPairingMap;
  date: Date | null;
  isGenerating: boolean;
  dualMatchMode?: boolean;
  diagnostics?: SchedulingDiagnostics;
}

const ScheduleMatchesPreview: React.FC<ScheduleMatchesPreviewProps> = ({
  pairings,
  date,
  isGenerating,
  dualMatchMode,
  diagnostics,
}) => {
  const { isWinterTheme } = useSeasonalThemeBase();
  // Check if we have any pairings
  const hasPairings = Object.values(pairings).some((blockPairings) => blockPairings?.length > 0);

  if (!date || !hasPairings) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No match pairings have been generated yet</p>
      </div>
    );
  }

  // Count total matches
  const totalMatches = Object.values(pairings).reduce(
    (acc, blockPairings) => acc + blockPairings.length,
    0
  );

  // Count warnings (low compatibility scores or previous matches)
  const warningCount = Object.values(pairings).reduce(
    (acc, blockPairings) =>
      acc +
      blockPairings.filter((pair) => pair.compatibilityScore < 5 || pair.hasPlayedBefore).length,
    0
  );

  // Group pairs by team to analyze dual match assignments
  const teamMatches = new Map<string, string[]>();
  Object.entries(pairings).forEach(([block, pairs]) => {
    pairs.forEach((pair) => {
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
        <div className="flex items-center gap-2 flex-wrap">
          {dualMatchMode && (
            <Badge variant="secondary" className="text-xs">
              Dual Match Mode
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {totalMatches} Matches
          </Badge>
          {diagnostics && diagnostics.relaxationApplied > 0 && (
            <Badge
              variant="outline"
              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
            >
              Adjusted
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {warningCount} Warnings
            </Badge>
          )}
        </div>
      </div>

      {/* Show diagnostics info banner when constraint relaxation was applied */}
      {dualMatchMode && diagnostics && diagnostics.relaxationApplied > 0 && (
        <div
          className={`p-3 border rounded-md text-sm mb-2 ${
            isWinterTheme
              ? 'bg-blue-900/30 border-blue-500/40 text-blue-200'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <p className="font-medium">Scheduling adjustments were made:</p>
          <ul className="text-xs mt-1 opacity-90 list-disc list-inside">
            {diagnostics.constraintsRelaxed.includes('season_rematches') && (
              <li>Some teams may play opponents they have faced before this season</li>
            )}
            {diagnostics.constraintsRelaxed.includes('tier_constraints') && (
              <li>Some cross-tier matches were allowed (e.g., Competitive vs Recreational)</li>
            )}
            {diagnostics.repairAttempted && (
              <li>Additional pairing attempts were needed for some teams</li>
            )}
          </ul>
          <p className="text-xs mt-2 opacity-70">
            These adjustments ensure all teams get their matches scheduled.
          </p>
        </div>
      )}

      {dualMatchMode && teamsWithIncompleteMatches.length > 0 && (
        <div
          className={`p-3 border rounded-md text-sm mb-2 ${
            isWinterTheme
              ? 'bg-amber-900/30 border-amber-500/40 text-amber-200'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}
        >
          <p className="font-medium">Some teams are not scheduled for both time blocks:</p>
          <p className="text-xs mt-1 opacity-80">
            {teamsWithIncompleteMatches.length === 1
              ? 'This usually happens with an odd number of teams.'
              : 'This may indicate a constraint issue that could not be resolved automatically. ' +
                'Try refreshing or contact support if this persists.'}
          </p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-hidden">
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
        <p>
          * Match compatibility score is based on team records, power scores, and previous matches
        </p>
        <p>* Teams with similar skill levels are paired for more competitive matches</p>
        {dualMatchMode && (
          <p>
            * In dual match mode, teams are scheduled to play in both time blocks with different
            opponents
          </p>
        )}
      </div>
    </div>
  );
};

export default ScheduleMatchesPreview;
