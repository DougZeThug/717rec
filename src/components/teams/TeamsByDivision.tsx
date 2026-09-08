import React, { useMemo } from 'react';

import { TeamsDivisionSection } from '@/components/teams/TeamsDivisionSection';
import { Team } from '@/types';

interface TeamsByDivisionProps {
  teamsByDivision: Record<string, Team[]>;
  getDivisionName: (displayDivision: string | undefined) => string;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  isLoading: boolean;
  viewMode: 'grid' | 'list';
  sortMode: 'rank' | 'alpha';
}

export const TeamsByDivision: React.FC<TeamsByDivisionProps> = ({
  teamsByDivision,
  getDivisionName,
  onEditTeam,
  onDeleteTeam,
  isLoading,
  viewMode,
  sortMode,
}) => {
  // `byVisitor` travels with the selection so the section knows whether to
  // scroll itself into view: opening one by default must leave the page alone.
  const [expanded, setExpanded] = React.useState<{
    division: string;
    byVisitor: boolean;
  } | null>(null);
  // Set once the default has been applied, and by any toggle, so a visitor who
  // closes the opening division is never overridden.
  const hasChosenDivision = React.useRef(false);

  // Filter out empty divisions
  const nonEmptyDivisions = useMemo(
    () =>
      Object.keys(teamsByDivision).filter(
        (displayDivision) => teamsByDivision[displayDivision].length > 0
      ),
    [teamsByDivision]
  );

  // Open the first division once the teams arrive. This used to be a lazy
  // useState initialiser, which ran on first mount while teamsByDivision was
  // still {} — so it settled on null and no division ever opened, leaving a
  // phone visitor looking at three collapsed headings and no teams.
  React.useEffect(() => {
    if (hasChosenDivision.current || nonEmptyDivisions.length === 0) return;
    hasChosenDivision.current = true;
    setExpanded({ division: nonEmptyDivisions[0], byVisitor: false });
  }, [nonEmptyDivisions]);

  const toggleDivision = (displayDivision: string) => {
    hasChosenDivision.current = true;
    setExpanded((prev) =>
      prev?.division === displayDivision ? null : { division: displayDivision, byVisitor: true }
    );
  };

  // Re-sort teams in each division appropriately
  const sortedTeamsByDivision = useMemo(() => {
    const sorted: Record<string, Team[]> = {};
    for (const displayDivision of Object.keys(teamsByDivision)) {
      const divisionTeams = teamsByDivision[displayDivision] || [];

      if (sortMode === 'alpha') {
        sorted[displayDivision] = [...divisionTeams].sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
      } else {
        sorted[displayDivision] = [...divisionTeams].sort(
          (a, b) => (b.power_score ?? 0) - (a.power_score ?? 0)
        );
      }
    }
    return sorted;
  }, [teamsByDivision, sortMode]);

  if (nonEmptyDivisions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No teams available in any division.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {nonEmptyDivisions.map((displayDivision) => {
        const divisionTeams = sortedTeamsByDivision[displayDivision];
        const divisionName = getDivisionName(displayDivision);
        const isExpanded = expanded?.division === displayDivision;

        return (
          <TeamsDivisionSection
            key={displayDivision}
            divisionName={divisionName}
            teams={divisionTeams}
            isExpanded={isExpanded}
            scrollIntoViewOnExpand={isExpanded && expanded.byVisitor}
            onToggleExpand={() => toggleDivision(displayDivision)}
            onEditTeam={onEditTeam}
            onDeleteTeam={onDeleteTeam}
            isLoading={isLoading}
            viewMode={viewMode}
          />
        );
      })}
    </div>
  );
};
