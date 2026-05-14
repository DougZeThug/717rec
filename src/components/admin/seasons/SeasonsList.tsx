import { m } from 'framer-motion';
import { Archive, Calendar, Edit, Trophy } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Season } from '@/types/season';
import { toLocalDateString } from '@/utils/formatDateSafe';

import SeasonFinalizePlayoffsDialog from './SeasonFinalizePlayoffsDialog';

interface SeasonsListProps {
  seasons: Season[] | undefined;
  isLoading: boolean;
  onEditSeason: (season: Season) => void;
}

const SeasonsList: React.FC<SeasonsListProps> = ({ seasons, isLoading, onEditSeason }) => {
  const [finalizingSeason, setFinalizingSeason] = useState<Season | null>(null);
  if (isLoading) {
    return (
      <div className="space-y-4">
        {['season-skel-1', 'season-skel-2', 'season-skel-3'].map((skKey) => (
          <Card key={skKey}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!seasons || seasons.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="size-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No seasons found</h3>
          <p className="text-muted-foreground">Create your first season to get started.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (season: Season) => {
    if (season.is_active) {
      return (
        <Badge variant="default" className="bg-green-500">
          Active
        </Badge>
      );
    } else if (season.playoffs_active) {
      return (
        <Badge variant="default" className="bg-yellow-500">
          Playoffs In Progress
        </Badge>
      );
    } else if (season.is_archived) {
      return <Badge variant="secondary">Archived</Badge>;
    } else {
      return <Badge variant="outline">Inactive</Badge>;
    }
  };

  const getStatusIcon = (season: Season) => {
    if (season.is_active) {
      return <Calendar className="size-4 text-green-500" />;
    } else if (season.is_archived) {
      return <Archive className="size-4 text-muted-foreground" />;
    } else {
      return <Calendar className="size-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">All Seasons</h3>
      {seasons.map((season) => (
        <Card key={season.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(season)}
                <div>
                  <CardTitle className="text-lg">{season.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {toLocalDateString(season.start_date)} -
                    {season.end_date ? toLocalDateString(season.end_date) : 'Ongoing'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(season)}
                {season.playoffs_active && (
                  <m.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFinalizingSeason(season)}
                      className="flex items-center gap-1"
                    >
                      <Trophy className="size-3" />
                      Finalize Playoffs
                    </Button>
                  </m.div>
                )}
                <m.div whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditSeason(season)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="size-3" />
                    Edit
                  </Button>
                </m.div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {toLocalDateString(season.created_at)}
              </div>
              {season.is_archived && (
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  <span className="text-muted-foreground">Archived season</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {finalizingSeason && (
        <SeasonFinalizePlayoffsDialog
          isOpen={Boolean(finalizingSeason)}
          onClose={() => setFinalizingSeason(null)}
          season={finalizingSeason}
        />
      )}
    </div>
  );
};

export default SeasonsList;
