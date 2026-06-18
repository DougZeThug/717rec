import { Edit, Eye, Loader2, RotateCcw, Save } from 'lucide-react';
import React, { useMemo } from 'react';

import DualMatchWarningDisplay from '@/components/admin/auto-schedule/DualMatchWarningDisplay';
import EditableMatchList from '@/components/admin/auto-schedule/EditableMatchList';
import ScheduleMatchesPreview from '@/components/admin/batch-matches/auto-schedule/ScheduleMatchesPreview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AutoScheduleMatch,
  MatchQualityMetrics,
  Team,
  TeamPairingMap,
  TimeBlockTeamsMap,
} from '@/types';
import {
  calculateDualBlockMetrics,
  validateDualBlockSchedule,
} from '@/utils/autoSchedule/dualBlock';
import { ValidationResult } from '@/utils/autoSchedule/validation';

interface MatchesTabProps {
  selectedDate: Date | null;
  timeBlockTeams: TimeBlockTeamsMap;
  generatedPairings: TeamPairingMap;
  isGenerating: boolean;
  matchQualityMetrics: MatchQualityMetrics | null;
  dualMatchMode?: boolean;
  onApplySchedule?: () => void;
  onSaveSchedule?: () => Promise<boolean>;
  isSaving?: boolean;
  // Edit mode props
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  editableMatches?: AutoScheduleMatch[];
  validation?: ValidationResult | null;
  onUpdateMatchTeam?: (matchId: string, teamPosition: 'team1' | 'team2', newTeamId: string) => void;
  onUpdateMatchTimeslot?: (matchId: string, newTimeslot: string) => void;
  onSwapTeams?: (matchId: string) => void;
  onRemoveMatch?: (matchId: string) => void;
  onResetEdits?: () => void;
  hasUnsavedEdits?: boolean;
}

const EMPTY_EDITABLE_MATCHES: AutoScheduleMatch[] = [];

const MatchesTab: React.FC<MatchesTabProps> = ({
  selectedDate,
  timeBlockTeams,
  generatedPairings,
  isGenerating,
  matchQualityMetrics,
  dualMatchMode,
  onApplySchedule,
  onSaveSchedule,
  isSaving = false,
  isEditMode = false,
  onToggleEditMode,
  editableMatches = EMPTY_EDITABLE_MATCHES,
  validation,
  onUpdateMatchTeam,
  onUpdateMatchTimeslot,
  onSwapTeams,
  onRemoveMatch,
  onResetEdits,
  hasUnsavedEdits = false,
}) => {
  // Check if we have generated any pairings
  const hasPairings =
    Object.keys(generatedPairings || {}).length > 0 &&
    Object.values(generatedPairings || {}).some((blockPairings) => blockPairings?.length > 0);

  // Calculate dual block metrics if in dual match mode and we have pairings
  const dualBlockMetrics = useMemo(() => {
    if (dualMatchMode && hasPairings) {
      // Aggregate across ALL time blocks (not just the first two) so teams
      // scheduled in 3+ blocks are counted correctly. A team is considered
      // to "have matches in multiple time blocks" only when its pairings
      // span distinct block ids.
      return calculateDualBlockMetrics(generatedPairings);
    }
    return null;
  }, [dualMatchMode, generatedPairings, hasPairings]);

  // Validate dual block schedule
  const dualBlockValidation = useMemo(() => {
    if (dualMatchMode && hasPairings) {
      // Validate across every block. validateDualBlockSchedule treats its
      // two args symmetrically (concatenates them), so we put the first
      // block in arg 1 and flatten the rest into arg 2.
      const blocks = Object.keys(generatedPairings);
      if (blocks.length >= 1) {
        const primary = generatedPairings[blocks[0]] || [];
        const rest = blocks.slice(1).flatMap((b) => generatedPairings[b] || []);
        return validateDualBlockSchedule(primary, rest);
      }
    }
    return null;
  }, [dualMatchMode, generatedPairings, hasPairings]);

  // Calculate total teams in the schedule
  const totalTeams = useMemo(() => {
    if (!hasPairings) return 0;

    const uniqueTeamIds = new Set<string>();

    Object.values(generatedPairings).forEach((blockPairings) => {
      blockPairings.forEach((pairing) => {
        uniqueTeamIds.add(pairing.team1.id);
        uniqueTeamIds.add(pairing.team2.id);
      });
    });

    return uniqueTeamIds.size;
  }, [generatedPairings, hasPairings]);

  // Get all teams for editing
  const allTeams = useMemo(() => {
    const teams: Team[] = [];
    const teamMap = new Map<string, Team>();

    Object.values(timeBlockTeams).forEach((blockTeams) => {
      blockTeams.forEach((team) => {
        if (!teamMap.has(team.id)) {
          teamMap.set(team.id, team);
          teams.push(team);
        }
      });
    });

    return teams;
  }, [timeBlockTeams]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium">Generated Match Pairings</h3>
          {hasUnsavedEdits && (
            <Badge variant="outline" className="text-xs">
              Unsaved Changes
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasPairings && onToggleEditMode && (
            <Button
              variant={isEditMode ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleEditMode}
            >
              {isEditMode ? (
                <>
                  <Eye className="mr-2 size-4" />
                  Preview Mode
                </>
              ) : (
                <>
                  <Edit className="mr-2 size-4" />
                  Edit Mode
                </>
              )}
            </Button>
          )}

          {isEditMode && hasUnsavedEdits && onResetEdits && (
            <Button variant="ghost" size="sm" onClick={onResetEdits}>
              <RotateCcw className="mr-2 size-4" />
              Reset
            </Button>
          )}

          {isEditMode && hasUnsavedEdits && onSaveSchedule && (
            <Button
              size="sm"
              onClick={onSaveSchedule}
              disabled={isSaving || validation?.isValid === false}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  Save Matches
                </>
              )}
            </Button>
          )}
          {dualMatchMode && (
            <Badge variant="secondary" className="text-xs">
              Dual Match Mode
            </Badge>
          )}

          {matchQualityMetrics && (
            <Badge
              variant={
                matchQualityMetrics.qualityRating === 'Excellent'
                  ? 'recreational'
                  : matchQualityMetrics.qualityRating === 'Good'
                    ? 'intermediate'
                    : 'outline'
              }
            >
              {matchQualityMetrics.qualityRating} Quality
            </Badge>
          )}

          {dualMatchMode && dualBlockMetrics && (
            <Badge
              variant={
                dualBlockMetrics.overallQualityScore >= 85
                  ? 'recreational'
                  : dualBlockMetrics.overallQualityScore >= 70
                    ? 'intermediate'
                    : 'outline'
              }
            >
              Dual Match Score: {dualBlockMetrics.overallQualityScore}
            </Badge>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Review the generated match pairings based on team compatibility.
        {dualMatchMode &&
          ' Teams play in both Early (6:30) and Late (7:00) blocks with different opponents.'}
      </p>

      {hasPairings ? (
        <div className="space-y-4">
          {dualMatchMode && dualBlockMetrics && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-2 mb-4">
                <div className="bg-muted/50 p-3 rounded-md text-center">
                  <div className="text-lg font-semibold">
                    {dualBlockMetrics.teamsWithBothMatches}
                  </div>
                  <div className="text-xs text-muted-foreground">Teams With Both Matches</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md text-center">
                  <div className="text-lg font-semibold">
                    {dualBlockMetrics.teamsWithSingleMatch}
                  </div>
                  <div className="text-xs text-muted-foreground">Teams With One Match</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md text-center">
                  <div className="text-lg font-semibold">
                    {dualBlockMetrics.crossBlockCompatibility.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">Cross-Block Compatibility</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md text-center">
                  <div
                    className="text-lg font-semibold"
                    style={{
                      color:
                        dualBlockMetrics.teamsWithDuplicateOpponents > 0
                          ? 'var(--amber-500)'
                          : 'inherit',
                    }}
                  >
                    {dualBlockMetrics.teamsWithDuplicateOpponents}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Teams With Duplicate Opponents
                  </div>
                </div>
              </div>

              <DualMatchWarningDisplay
                validation={dualBlockValidation}
                duplicateOpponentsCount={dualBlockMetrics.teamsWithDuplicateOpponents}
                teamsInBothBlocks={dualBlockMetrics.teamsWithBothMatches}
                totalTeams={totalTeams}
              />
            </>
          )}

          {isEditMode ? (
            <EditableMatchList
              matches={editableMatches}
              teams={allTeams}
              validation={validation || null}
              onUpdateTeam={onUpdateMatchTeam || (() => {})}
              onUpdateTimeslot={onUpdateMatchTimeslot || (() => {})}
              onSwapTeams={onSwapTeams || (() => {})}
              onRemove={onRemoveMatch || (() => {})}
            />
          ) : (
            <ScheduleMatchesPreview
              pairings={generatedPairings}
              date={selectedDate}
              isGenerating={isGenerating}
              dualMatchMode={dualMatchMode}
            />
          )}

          {!isEditMode && (
            <div className="flex justify-end mt-4">
              <Button onClick={onApplySchedule}>Export to Match Form</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>Generate a schedule to see match pairings</p>
        </div>
      )}
    </div>
  );
};

export default React.memo(MatchesTab);
