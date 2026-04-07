import { AlertTriangle, Calendar, History, Loader2 } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';

import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import WinterSection from '@/components/winter/WinterSection';
import { useHistoricalSeasons } from '@/hooks/useSeasons';

import SeasonAccordion from './SeasonAccordion';

const HistoryPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { data: seasons = [], isLoading, isError, error } = useHistoricalSeasons();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading historical data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load season history</h3>
            <p className="text-muted-foreground">
              {error instanceof Error
                ? error.message
                : 'An unexpected error occurred. Please try again later.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (seasons.length === 0) {
    return (
      <Card>
        <CardContent className="py-0">
          <EmptyState
            icon={History}
            title="No Season History Yet"
            description="Past seasons and champions will appear here once the first season is completed."
            actions={[
              {
                label: 'View Current Season',
                onClick: () => navigate('/schedule'),
                icon: Calendar,
              },
            ]}
            secondaryLink={{
              label: 'Learn how seasons work',
              href: '/rules',
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <WinterSection showIcicles lightIcicles className="space-y-2 md:space-y-4">
      {seasons.map((season) => (
        <SeasonAccordion key={season.id} season={season} />
      ))}
    </WinterSection>
  );
};

export default HistoryPageContent;
