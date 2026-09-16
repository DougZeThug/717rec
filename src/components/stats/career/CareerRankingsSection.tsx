import { Trophy } from 'lucide-react';
import { useTheme } from 'next-themes';
import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ErrorDisplay } from '@/components/ui/error-display';
import { LoadingState } from '@/components/ui/loading-state';
import { useCareerRankings } from '@/hooks/useCareerRankings';
import { useIsMobile } from '@/hooks/useMobile';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import type { CareerRanking } from '@/types/career';

import { careerCardClasses, type CareerCardTheme, careerContentClasses } from './careerCardStyles';
import { CareerRankingsHeader } from './CareerRankingsHeader';
import CareerRankingsTable from './CareerRankingsTable';

/** The card shown in place of the whole section when the fetch failed. */
const CareerRankingsError: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <Card className="mb-4">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Trophy className="size-5" />
        Career Statistics
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ErrorDisplay
        variant="inline"
        error="We couldn't load career statistics. Please try again."
        onRetry={onRetry}
      />
    </CardContent>
  </Card>
);

/** Loading, the table, or the line that says there is nothing yet. */
const CareerRankingsBody: React.FC<{
  isLoading: boolean;
  rankings: CareerRanking[] | undefined;
}> = ({ isLoading, rankings }) => {
  if (isLoading) return <LoadingState variant="section" message="Loading career stats..." />;
  if (rankings && rankings.length > 0) return <CareerRankingsTable rankings={rankings} />;
  return (
    <div className="text-center py-12 text-muted-foreground">No career statistics available.</div>
  );
};

const CareerRankingsSection: React.FC = () => {
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const { isWinterTheme } = useSeasonalThemeBase();
  const theme: CareerCardTheme = {
    isWinterTheme,
    isLight: !isWinterTheme && resolvedTheme === 'light',
  };
  const {
    data: careerRankings,
    isLoading,
    error,
    refetch,
  } = useCareerRankings({ includeHidden: true });
  const [isOpen, setIsOpen] = React.useState(false);

  // A failed fetch is not a league with no history. The rankings query stays
  // disabled until the team list arrives, so the failure reported here is often
  // the team list's own — see the fold in useCareerRankings.
  if (error) {
    // No `void`: the hook's refetch is a retry action that resolves with
    // nothing, so there is no promise here worth discarding.
    return <CareerRankingsError onRetry={() => void refetch()} />;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <Card
        className={cn(
          'border-t-2',
          'shadow-lg hover:shadow-xl transition-shadow duration-300',
          careerCardClasses(theme)
        )}
      >
        <CareerRankingsHeader
          theme={theme}
          isMobile={isMobile}
          isOpen={isOpen}
          rankings={careerRankings}
        />

        <CollapsibleContent>
          <CardContent className={cn('p-2 sm:p-4', careerContentClasses(theme))}>
            <CareerRankingsBody isLoading={isLoading} rankings={careerRankings} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default CareerRankingsSection;
