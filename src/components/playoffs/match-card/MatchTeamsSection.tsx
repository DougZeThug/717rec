import React from 'react';

import { Team } from '@/types';

import TeamRow from './TeamRow';

interface MatchTeamsSectionProps {
  team1: Team | null;
  team2: Team | null;
  team1Id: string | null;
  team2Id: string | null;
  team1Seed: number;
  team2Seed: number;
  team1Score?: number | null;
  team2Score?: number | null;
  winnerId: string | null;
  matchType: string;
}

const MatchTeamsSection: React.FC<MatchTeamsSectionProps> = ({
  team1,
  team2,
  team1Id,
  team2Id,
  team1Seed,
  team2Seed,
  team1Score,
  team2Score,
  winnerId,
  matchType,
}) => {
  return (
    <div className="space-y-1.5">
      {/* Team 1 Row */}
      <TeamRow
        team={team1}
        teamSeed={team1Seed}
        score={team1Score ?? undefined}
        isWinner={team1Id === winnerId}
        matchType={matchType}
      />

      {/* Team 2 Row */}
      <TeamRow
        team={team2}
        teamSeed={team2Seed}
        score={team2Score ?? undefined}
        isWinner={team2Id === winnerId}
        matchType={matchType}
      />
    </div>
  );
};

export default MatchTeamsSection;
