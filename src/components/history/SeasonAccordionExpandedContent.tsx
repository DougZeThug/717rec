import { Pencil, RefreshCw, Trophy } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sortHistoryDivisions } from '@/utils/historyDivisionUtils';

import DivisionPanel from './DivisionPanel';
import EditModeContainer from './editing/EditModeContainer';
import SeasonAccordionSkeleton from './SeasonAccordionSkeleton';
import { Season } from './seasonAccordionTypes';
import SeasonMetaBar from './SeasonMetaBar';
import { SeasonData } from './useSeasonAccordionViewModel';

interface SeasonAccordionExpandedContentProps {
  isLoading: boolean;
  error: Error | null;
  season: Season;
  seasonData?: SeasonData[];
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  refetch: () => Promise<unknown>;
  isRefetching: boolean;
  divisionData: Record<string, SeasonData[]>;
  isAdminAccessGranted: boolean;
  isWinterTheme: boolean;
}

const SeasonAccordionExpandedContent: React.FC<SeasonAccordionExpandedContentProps> = ({
  isLoading,
  error,
  season,
  seasonData,
  isEditMode,
  setIsEditMode,
  isSaving,
  setIsSaving,
  refetch,
  isRefetching,
  divisionData,
  isAdminAccessGranted,
  isWinterTheme,
}) => (
  <div
    className={cn(
      'p-3 md:p-4 lg:p-6 border-t',
      isWinterTheme ? 'border-white/10' : 'border-border'
    )}
  >
    {isLoading ? (
      <SeasonAccordionSkeleton />
    ) : error ? (
      <div className="text-center py-8">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <Trophy className="size-8 mx-auto mb-2" />
          <p className="font-medium">Failed to load season data</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button
            onClick={() => refetch()}
            disabled={isRefetching}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`size-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Retrying...' : 'Try Again'}
          </Button>
        </div>
      </div>
    ) : season.is_active && (!seasonData || seasonData.length === 0) ? (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="size-8 mx-auto mb-2 text-muted-foreground" />
        <p>Season in progress – check back later</p>
      </div>
    ) : isEditMode ? (
      <EditModeContainer
        seasonId={season.id}
        seasonData={seasonData || []}
        onSave={async () => {
          setIsSaving(true);
          try {
            await refetch();
            setIsEditMode(false);
          } finally {
            setIsSaving(false);
          }
        }}
        onCancel={() => setIsEditMode(false)}
        isSaving={isSaving}
      />
    ) : (
      <div className="space-y-3 md:space-y-6">
        {isAdminAccessGranted && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
              className="gap-2"
            >
              <Pencil className="size-4" />
              Edit Divisions
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
          {sortHistoryDivisions(Object.entries(divisionData)).map(([divisionName, teams]) => (
            <DivisionPanel key={divisionName} divisionName={divisionName} teams={teams} />
          ))}
        </div>
        <div className="hidden md:block">
          <SeasonMetaBar season={season} seasonData={seasonData || []} />
        </div>
      </div>
    )}
  </div>
);

export default SeasonAccordionExpandedContent;
