import { Calendar, History, Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import WinterSection from '@/components/winter/WinterSection';
import { useToast } from '@/hooks/use-toast';
import { useSeasons } from '@/hooks/useSeasons';

import SeasonAccordion from './SeasonAccordion';

const HistoryPageContent: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: seasonsData, isLoading: loading, error } = useSeasons();

  // Sort seasons by start_date descending
  const seasons = useMemo(() => {
    if (!seasonsData) return [];
    return [...seasonsData].sort((a, b) => {
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });
  }, [seasonsData]);

  // Show error toast if query failed
  React.useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch seasons data',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  if (loading) {
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
    <WinterSection showIcicles lightIcicles className="space-y-4">
      {seasons.map((season) => (
        <SeasonAccordion key={season.id} season={season} />
      ))}
    </WinterSection>
  );
};

export default HistoryPageContent;
