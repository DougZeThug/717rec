import React from 'react';

import MatchScoresList from '@/components/admin/scores/MatchScoresList';
import { useUncompletedMatches } from '@/hooks/useUncompletedMatches';

const EditScoresSection = () => {
  const {
    matches,
    teams,
    isLoading,
    openItems,
    scores,
    toggleItem,
    handleScoreChange,
    handleSubmitScore,
  } = useUncompletedMatches();

  if (isLoading) {
    return <div>Loading uncompleted matches...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        Submit scores for matches that have been completed. This will automatically update team
        records.
      </p>

      <MatchScoresList
        matches={matches}
        teams={teams}
        openItems={openItems}
        scores={scores}
        onToggleItem={toggleItem}
        onScoreChange={handleScoreChange}
        onSubmitScore={(matchId, team1Score, team2Score) =>
          handleSubmitScore({
            matchId,
            team1Score,
            team2Score,
          })
        }
      />
    </div>
  );
};

export default EditScoresSection;
