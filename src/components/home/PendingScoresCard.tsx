import { Clock } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type PendingMatch, usePendingScoresMatches } from '@/hooks/usePendingScoresMatches';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { SnowflakeSparkle, WINTER_ICONS_ENABLED } from '@/icons';
import { cn } from '@/lib/utils';

import { ScoreSubmissionModal } from './ScoreSubmissionModal';
import { formatDate, formatTime } from './utils';

const PendingScoresTitle = ({ shouldApplyWinter }: { shouldApplyWinter: boolean }) => (
  <CardTitle className="flex items-center gap-2">
    <Clock className={cn('size-5', shouldApplyWinter ? 'text-cyan-400' : 'text-primary')} />
    Pending Scores
    {shouldApplyWinter && WINTER_ICONS_ENABLED && (
      <SnowflakeSparkle size={12} className="text-cyan-400/60" />
    )}
  </CardTitle>
);

const SkeletonName = () => (
  <div className="min-w-0">
    <div className="w-20 h-4 bg-muted rounded" />
  </div>
);

const PendingScoreSkeletonRow = ({ shouldApplyWinter }: { shouldApplyWinter: boolean }) => (
  <div
    className={cn(
      'flex items-center justify-between p-3 rounded-lg border animate-pulse',
      shouldApplyWinter && 'border-cyan-500/20'
    )}
  >
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="size-8 bg-muted rounded" />
        <SkeletonName />
      </div>
      <div className="shrink-0 px-2">
        <div className="w-6 h-3 bg-muted rounded" />
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <SkeletonName />
        <div className="size-8 bg-muted rounded" />
      </div>
    </div>
    <div className="w-20 h-8 bg-muted rounded" />
  </div>
);

const PendingTeamLogo = ({
  logo,
  name,
  shouldApplyWinter,
}: {
  logo: string | null;
  name: string;
  shouldApplyWinter: boolean;
}) => (
  <div className="size-8 shrink-0">
    {logo ? (
      <img src={logo} alt={`${name} logo`} className="size-8 object-cover" />
    ) : (
      <div
        className={cn(
          'size-8 flex items-center justify-center text-xs font-medium',
          shouldApplyWinter ? 'bg-slate-700 text-cyan-300' : 'bg-muted text-muted-foreground'
        )}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    )}
  </div>
);

const PendingTeamName = ({
  name,
  shouldApplyWinter,
}: {
  name: string;
  shouldApplyWinter: boolean;
}) => (
  <div className="min-w-0">
    <p className={cn('font-medium text-sm truncate', shouldApplyWinter && 'text-cyan-50')}>
      {name}
    </p>
  </div>
);

const PendingMatchRow = ({
  match,
  shouldApplyWinter,
  onReport,
}: {
  match: PendingMatch;
  shouldApplyWinter: boolean;
  onReport: () => void;
}) => (
  <div
    className={cn(
      'flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-3 transition-colors',
      shouldApplyWinter
        ? 'bg-slate-800/50 border-cyan-500/20 hover:bg-slate-800/70'
        : 'bg-card hover:bg-accent/50'
    )}
  >
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {/* Team 1 */}
      <div className="flex items-center gap-2 min-w-0">
        <PendingTeamLogo
          logo={match.team1_logo}
          name={match.team1_name}
          shouldApplyWinter={shouldApplyWinter}
        />
        <PendingTeamName name={match.team1_name} shouldApplyWinter={shouldApplyWinter} />
      </div>

      {/* VS */}
      <div className="shrink-0 px-2">
        <span
          className={cn(
            'text-xs font-medium',
            shouldApplyWinter ? 'text-cyan-400/70' : 'text-muted-foreground'
          )}
        >
          vs
        </span>
      </div>

      {/* Team 2 */}
      <div className="flex items-center gap-2 min-w-0">
        <PendingTeamName name={match.team2_name} shouldApplyWinter={shouldApplyWinter} />
        <PendingTeamLogo
          logo={match.team2_logo}
          name={match.team2_name}
          shouldApplyWinter={shouldApplyWinter}
        />
      </div>
    </div>

    {/* Match Info & Action */}
    <div className="flex items-center gap-3 shrink-0">
      <div
        className={cn(
          'text-xs text-right tabular-nums',
          shouldApplyWinter ? 'text-cyan-300/70' : 'text-muted-foreground'
        )}
      >
        <div>{formatDate(match.date)}</div>
        <div>{formatTime(match.date)}</div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onReport}
        className={shouldApplyWinter ? 'btn-winter-secondary' : undefined}
      >
        Report
      </Button>
    </div>
  </div>
);

const PendingScoresCard = () => {
  const { matches, isLoading } = usePendingScoresMatches();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const { shouldApplyWinter } = useSeasonalTheme();

  const cardClasses = cn('w-full', shouldApplyWinter && 'winter-card-full');

  if (isLoading) {
    return (
      <Card className={cardClasses}>
        <CardHeader>
          <PendingScoresTitle shouldApplyWinter={shouldApplyWinter} />
          <CardDescription className={shouldApplyWinter ? 'text-cyan-300/70' : undefined}>
            Matches awaiting score reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['pending-skel-1', 'pending-skel-2', 'pending-skel-3'].map((sk) => (
              <PendingScoreSkeletonRow key={sk} shouldApplyWinter={shouldApplyWinter} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card className={cardClasses}>
        <CardHeader>
          <PendingScoresTitle shouldApplyWinter={shouldApplyWinter} />
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="text-4xl mb-2">🎉</div>
          <p className={shouldApplyWinter ? 'text-cyan-100/80' : 'text-muted-foreground'}>
            All caught up!
          </p>
          <p
            className={cn(
              'text-sm mt-1',
              shouldApplyWinter ? 'text-cyan-300/60' : 'text-muted-foreground'
            )}
          >
            No pending score reports
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  return (
    <>
      <Card className={cardClasses}>
        <CardHeader>
          <PendingScoresTitle shouldApplyWinter={shouldApplyWinter} />
          <CardDescription className={shouldApplyWinter ? 'text-cyan-300/70' : undefined}>
            {matches.length} match{matches.length !== 1 ? 'es' : ''} awaiting score reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {matches.map((match) => (
              <PendingMatchRow
                key={match.id}
                match={match}
                shouldApplyWinter={shouldApplyWinter}
                onReport={() => setSelectedMatchId(match.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedMatch && (
        <ScoreSubmissionModal
          match={selectedMatch}
          open={Boolean(selectedMatchId)}
          onClose={() => setSelectedMatchId(null)}
        />
      )}
    </>
  );
};

export default PendingScoresCard;
