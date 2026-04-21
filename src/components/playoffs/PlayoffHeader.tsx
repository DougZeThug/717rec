import React from 'react';

import PageHeader from '@/components/layout/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useActiveSeason, usePlayoffActiveSeason } from '@/hooks/useSeasons';

interface PlayoffHeaderProps {
  selectedSeasonId?: string | null;
}

const PlayoffHeader: React.FC<PlayoffHeaderProps> = ({ selectedSeasonId }) => {
  const { data: playoffSeason } = usePlayoffActiveSeason();
  const { data: activeSeason } = useActiveSeason();

  const showOverlapBanner =
    Boolean(playoffSeason) &&
    Boolean(activeSeason) &&
    playoffSeason?.id !== activeSeason?.id &&
    selectedSeasonId === playoffSeason?.id;

  return (
    <>
      <PageHeader
        title="Playoffs"
        description="Tournament brackets and playoff schedules"
        className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6"
      />
      {showOverlapBanner && (
        <Alert className="mb-4">
          <AlertDescription>
            Showing <strong>{playoffSeason.name}</strong> playoffs — regular season play is on{' '}
            <strong>{activeSeason.name}</strong>.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default PlayoffHeader;
