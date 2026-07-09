import { format } from 'date-fns';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingState from '@/components/ui/loading-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminLiveScoredMatches } from '@/hooks/live-scoring/useAdminCorrections';
import { useSeasons } from '@/hooks/useSeasons';

import { MatchCorrectionsPanel } from './MatchCorrectionsPanel';

const ALL_SEASONS = '__all__';

const LiveCorrectionsSection: React.FC = () => {
  const { data: seasons } = useSeasons();
  const [seasonId, setSeasonId] = useState<string>(ALL_SEASONS);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const {
    data: matches,
    isLoading,
    error,
  } = useAdminLiveScoredMatches(seasonId === ALL_SEASONS ? null : seasonId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Live Score Corrections</h2>
        <p className="text-sm text-muted-foreground">
          Fix wrong round scores, bag breakdowns, throwers, or the winner of a completed game. Only
          matches scored live are listed here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="season-filter" className="text-sm font-medium">
          Season
        </label>
        <Select value={seasonId} onValueChange={setSeasonId}>
          <SelectTrigger id="season-filter" className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SEASONS}>All seasons</SelectItem>
            {(seasons ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState variant="section" message="Loading live-scored matches…" />}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          Failed to load matches.
        </p>
      )}

      {!isLoading && !error && (matches?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">No live-scored matches yet.</p>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="space-y-2">
          {(matches ?? []).map((m) => {
            const active = m.id === selectedMatchId;
            return (
              <Card
                key={m.id}
                className={
                  active
                    ? 'border-primary ring-1 ring-primary/40 cursor-pointer'
                    : 'cursor-pointer hover:border-primary/40'
                }
              >
                <button
                  type="button"
                  onClick={() => setSelectedMatchId(m.id)}
                  className="w-full text-left"
                  aria-pressed={active}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {m.team1?.name ?? 'Team 1'} vs {m.team2?.name ?? 'Team 2'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-0.5">
                    <div>{m.date ? format(new Date(m.date), 'MMM d, yyyy') : 'No date'}</div>
                    <div>
                      {m.gameCount} game{m.gameCount === 1 ? '' : 's'} · {m.roundCount} round
                      {m.roundCount === 1 ? '' : 's'}
                      {m.iscompleted ? ' · finalized' : ''}
                    </div>
                  </CardContent>
                </button>
              </Card>
            );
          })}
        </div>

        <div>
          {selectedMatchId ? (
            <MatchCorrectionsPanel matchId={selectedMatchId} />
          ) : (
            <div className="flex items-center justify-center min-h-[200px] rounded-md border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                Select a match to view and correct its rounds.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={() => setSelectedMatchId(null)}
          disabled={!selectedMatchId}
        >
          Clear selection
        </Button>
      </div>
    </div>
  );
};

export default LiveCorrectionsSection;
