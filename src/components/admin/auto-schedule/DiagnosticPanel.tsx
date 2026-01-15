import { AlertCircle, CheckCircle2, ChevronDown, Database } from 'lucide-react';
import React, { useMemo } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TimeBlockTeamsMap } from '@/types/autoSchedule';

interface DiagnosticPanelProps {
  teamBlockMap: Record<string, string[]>;
  timeBlockTeams: TimeBlockTeamsMap;
  isVisible?: boolean;
}

interface TeamAssignment {
  teamId: string;
  teamName: string;
  block: string;
  isDoubleHeader: boolean;
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

    // Build team assignments list and detect double-headers
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
          isDoubleHeader: currentBlocks.length > 1,
        });
      });
    });

    // Find teams with double-header assignments (multiple blocks)
    const doubleHeaderTeams = Array.from(teamBlocks.entries())
      .filter(([_, blocks]) => blocks.length > 1)
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

    // Calculate validation status
    const totalTeams = new Set(Object.keys(teamBlockMap)).size;
    const teamsWithAssignments = Object.keys(teamBlockMap).length;
    // Double-headers are now valid - they're teams playing in multiple blocks
    const hasDoubleHeaders = doubleHeaderTeams.length > 0;
    const isValid = teamsWithAssignments > 0;

    return {
      teamAssignments,
      doubleHeaderTeams,
      blockStats,
      totalTeams,
      teamsWithAssignments,
      isValid,
      hasDoubleHeaders,
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

            {/* Double-Header Info */}
            {analysis.hasDoubleHeaders && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription className="text-xs font-mono">
                  <strong>Double-Header Teams:</strong> {analysis.doubleHeaderTeams.length} team(s)
                  playing in multiple blocks
                  {analysis.doubleHeaderTeams.map((team) => (
                    <div key={team.teamId} className="mt-1 pl-4 border-l-2 border-primary/50">
                      ⚡ {team.teamName}: {team.blocks.join(', ')}
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
                          assignment.isDoubleHeader
                            ? 'bg-primary/10 border border-primary'
                            : 'bg-background border'
                        }`}
                      >
                        <span className="truncate flex-1">
                          {assignment.isDoubleHeader && '⚡ '}
                          {assignment.teamName}
                        </span>
                        <Badge
                          variant={assignment.isDoubleHeader ? 'default' : 'secondary'}
                          className="text-xs ml-2"
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
