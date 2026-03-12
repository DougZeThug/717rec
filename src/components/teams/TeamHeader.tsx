import React from 'react';

import TeamBadgeCollection from '@/components/badges/TeamBadgeCollection';
import LastMatchHighlight from '@/components/teams/LastMatchHighlight';
import { Badge } from '@/components/ui/badge';
import { TeamLogo } from '@/components/ui/team/TeamLogo';
import { cn } from '@/lib/utils';
import { blueAmberHeading } from '@/styles/design-system/blueAmber';
import { Match, Team } from '@/types';

interface TeamHeaderProps {
  team: Team;
  winPercentage?: string;
  pastMatches?: Match[];
}

const TeamHeader = ({ team, winPercentage: _winPercentage, pastMatches = [] }: TeamHeaderProps) => {
  return (
    <div className="flex flex-col items-center mb-1 md:mb-4">
      <div className="mb-2 md:mb-4">
        <TeamLogo
          imageUrl={team?.imageUrl || team?.logoUrl}
          teamName={team?.name}
          size="lg"
          rounded={false}
          className="w-44 h-44 md:w-52 md:h-52"
        />
      </div>
      <div className="text-center">
        {/* Team Name with blue-amber gradient styling */}
        <h1
          className={cn(
            'font-bebas uppercase tracking-wide text-2xl sm:text-3xl md:text-4xl font-normal mb-1 md:mb-2',
            blueAmberHeading()
          )}
        >
          {team.name}
        </h1>

        {/* Division Badge */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-2 md:mb-3">
          {team.divisionName && (
            <Badge
              variant="outline"
              className="font-inter uppercase font-medium tracking-widest text-xs py-0.5 px-2 md:py-1 md:px-3"
            >
              {team.divisionName}
            </Badge>
          )}
        </div>

        {/* Last Match Highlight */}
        {pastMatches.length > 0 && (
          <div className="mb-2 md:mb-3">
            <LastMatchHighlight teamId={team.id} pastMatches={pastMatches} />
          </div>
        )}

        {/* Team Badges - Trophy Case */}
        <div className="flex justify-center">
          <TeamBadgeCollection
            teamId={team.id}
            size="md"
            maxDisplay={8}
            orientation="horizontal"
            className="gap-1.5 md:gap-2"
          />
        </div>
      </div>
    </div>
  );
};

export default TeamHeader;
