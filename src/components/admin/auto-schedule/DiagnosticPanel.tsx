import { AlertCircle, CheckCircle2, ChevronDown, Database } from 'lucide-react';
import React, { useMemo } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TimeBlockTeamsMap } from '@/types/autoSchedule';

interface DiagnosticPanelProps {
  // Maps team ID to array of block names (supports double headers in multiple blocks)
  teamBlockMap: Record<string, string[]>;
  timeBlockTeams: TimeBlockTeamsMap;
  isVisible?: boolean;
}

interface TeamAssignment {
  teamId: string;
  teamName: string;
  block: string;
  isDoubleHeader: boolean; // Team is in 2 blocks (valid double header)
  isInvalid: boolean; // Team is in 3+ blocks (invalid)
}

/**
 * DiagnosticPanel - Debugging tool for auto-schedule validation
 *
 * Displays:
 * - Team-to-block assignments
 * - Duplicate team assignments (critical errors)
 * - Block statistics
 * - Validation status
 */
export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  teamBlockMap,
  timeBlockTeams,
  isVisible = true,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Analyze team assignments
  const analysis = useMemo(() => {
    const teamAssignments: TeamAssignment[] = [];
    const teamBlocks = new Map<string, string[]>();
    const blockStats = new Map<string, number>();

    // Build team assignments list and detect double headers vs invalid (3+ blocks)
    Object.entries(timeBlockTeams).forEach(([block, teams]) => {
      blockStats.set(block, teams.length);

      teams.forEach((team) => {
        const currentBlocks = teamBlocks.get(team.id) || [];
        currentBlocks.push(block);
        teamBlocks.set(team.id, currentBlocks);

        teamAssignments.push({
          teamId: team.id,
          teamName: team.name,
          block: block,
          isDoubleHeader: currentBlocks.length === 2, // Exactly 2 blocks = valid double header
          isInvalid: currentBlocks.length > 2, // 3+ blocks = invalid
        });
      });
    });

    // Update isDoubleHeader/isInvalid flags based on final block counts
    teamAssignments.forEach((assignment) => {
      const blockCount = teamBlocks.get(assignment.teamId)?.length || 0;
      assignment.isDoubleHeader = blockCount === 2;
      assignment.isInvalid = blockCount > 2;
    });

    // Find double header teams (2 blocks - valid)
    const doubleHeaderTeams = Array.from(teamBlocks.entries())
      .filter(([_, blocks]) => blocks.length === 2)
      .map(([teamId, blocks]) => {
        const team = Object.values(timeBlockTeams)
          .flat()
          .find((t) => t.id === teamId);
        return {
          teamId,
          teamName: team?.name || 'Unknown',
          blocks,
        };
      });

    // Find invalid teams (3+ blocks - error)
    const invalidTeams = Array.from(teamBlocks.entries())
      .filter(([_, blocks]) => blocks.length > 2)
      .map(([teamId, blocks]) => {
        const team = Object.values(timeBlockTeams)
          .flat()
          .find((t) => t.id === teamId);
        return {
          teamId,
          teamName: team?.name || 'Unknown',
          blocks,
        };
      });

    // Calculate validation status - only 3+ blocks is an error, 2 blocks is valid (double header)
    const totalTeams = new Set(Object.keys(teamBlockMap)).size;
    const teamsWithAssignments = Object.keys(teamBlockMap).length;
    const hasInvalidAssignments = invalidTeams.length > 0;
    const isValid = !hasInvalidAssignments && teamsWithAssignments > 0;

    return {
      teamAssignments,
      doubleHeaderTeams,
      invalidTeams,
      blockStats,
      totalTeams,
      teamsWithAssignments,
      isValid,
      hasInvalidAssignments,
      hasDoubleHeaders: doubleHeaderTeams.length > 0,
    };
  }, [teamBlockMap, timeBlockTeams]);

  if (!isVisible) return null;

  return (
    <Card className="border-dashed bg-muted/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-mono">🔍 Diagnostic Panel</CardTitle>
              {analysis.isValid ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CardDescription className="text-xs">
            Team-to-block assignments and validation status
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Validation Status */}
            <div className="flex items-center gap-2">
              <Badge
                variant={analysis.isValid ? 'default' : 'destructive'}
                className="font-mono text-xs"
              >
                {analysis.isValid ? '✅ Valid' : '❌ Invalid'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {analysis.teamsWithAssignments} teams assigned
              </span>
            </div>

            {/* Invalid Assignments (3+ blocks) */}
            {analysis.hasInvalidAssignments && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs font-mono">
                  <strong>Critical Error:</strong> {analysis.invalidTeams.length} team(s) assigned
                  to 3+ blocks (max is 2 for double headers)
                  {analysis.invalidTeams.map((inv) => (
                    <div key={inv.teamId} className="mt-1 pl-4 border-l-2 border-destructive/50">
                      {inv.teamName}: {inv.blocks.join(', ')}
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Double Header Info */}
            {analysis.hasDoubleHeaders && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-xs font-mono">
                  <strong>Double Headers:</strong> {analysis.doubleHeaderTeams.length} team(s)
                  scheduled for 2 back-to-back pairs (4 matches total)
                  {analysis.doubleHeaderTeams.map((dh) => (
                    <div key={dh.teamId} className="mt-1 pl-4 border-l-2 border-amber-500/50">
                      {dh.teamName}: {dh.blocks.join(' & ')}
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Block Statistics */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Block Statistics</h4>
              <div className="grid grid-cols-2 gap-2">
                {Array.from(analysis.blockStats.entries()).map(([block, count]) => (
                  <div
                    key={block}
                    className="flex items-center justify-between p-2 rounded bg-background border text-xs font-mono"
                  >
                    <span className="font-medium">{block}</span>
                    <Badge variant="outline" className="text-xs">
                      {count} teams
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Assignments (Collapsed by default when many) */}
            {analysis.teamAssignments.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:opacity-80">
                  <ChevronDown className="h-3 w-3" />
                  Team Assignments ({analysis.teamAssignments.length})
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                    {analysis.teamAssignments.map((assignment, index) => (
                      <div
                        key={`${assignment.teamId}-${index}`}
                        className={`flex items-center justify-between p-2 rounded text-xs font-mono ${
                          assignment.isInvalid
                            ? 'bg-destructive/10 border border-destructive'
                            : assignment.isDoubleHeader
                              ? 'bg-amber-500/10 border border-amber-500/50'
                              : 'bg-background border'
                        }`}
                      >
                        <span className="truncate flex-1">{assignment.teamName}</span>
                        <Badge
                          variant={
                            assignment.isInvalid
                              ? 'destructive'
                              : assignment.isDoubleHeader
                                ? 'outline'
                                : 'secondary'
                          }
                          className={`text-xs ml-2 ${assignment.isDoubleHeader ? 'border-amber-500 text-amber-600' : ''}`}
                        >
                          {assignment.block}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Empty State */}
            {analysis.teamAssignments.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground font-mono">
                No team assignments loaded. Load teams first.
              </div>
            )}

            {/* Database Check Hint */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground font-mono">
                💡 To check database: Query{' '}
                <code className="bg-muted px-1 rounded">team_timeslots</code> for duplicate pair
                assignments
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
