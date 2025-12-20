import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { usePendingScoresMatches } from '@/hooks/usePendingScoresMatches';
import { ScoreSubmissionModal } from './ScoreSubmissionModal';
import { formatDate, formatTime } from './utils';
import { cn } from '@/lib/utils';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';

const PendingScoresCard = () => {
  const { matches, isLoading } = usePendingScoresMatches();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const { shouldApplyWinter } = useSeasonalTheme();

  const cardClasses = cn(
    "w-full",
    shouldApplyWinter && "frost-card frost-edge"
  );

  if (isLoading) {
    return (
      <Card className={cardClasses}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className={cn("h-5 w-5", shouldApplyWinter ? "text-cyan-400" : "text-primary")} />
            Pending Scores
          </CardTitle>
          <CardDescription className={shouldApplyWinter ? "text-cyan-300/70" : undefined}>
            Matches awaiting score reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={cn(
                "flex items-center justify-between p-3 rounded-lg border animate-pulse",
                shouldApplyWinter && "border-cyan-500/20"
              )}>
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-muted" />
                   <div className="space-y-1">
                     <div className="w-20 h-4 bg-muted rounded" />
                     <div className="w-16 h-3 bg-muted rounded" />
                   </div>
                   <div className="w-4 h-4 bg-muted mx-2" />
                   <div className="w-8 h-8 bg-muted" />
                  <div className="space-y-1">
                    <div className="w-20 h-4 bg-muted rounded" />
                    <div className="w-16 h-3 bg-muted rounded" />
                  </div>
                </div>
                <div className="w-20 h-8 bg-muted rounded" />
              </div>
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
          <CardTitle className="flex items-center gap-2">
            <Clock className={cn("h-5 w-5", shouldApplyWinter ? "text-cyan-400" : "text-primary")} />
            Pending Scores
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="text-4xl mb-2">🎉</div>
          <p className={shouldApplyWinter ? "text-cyan-100/80" : "text-muted-foreground"}>All caught up!</p>
          <p className={cn("text-sm mt-1", shouldApplyWinter ? "text-cyan-300/60" : "text-muted-foreground")}>
            No pending score reports
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedMatch = matches.find(m => m.id === selectedMatchId);

  return (
    <>
      <Card className={cardClasses}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className={cn("h-5 w-5", shouldApplyWinter ? "text-cyan-400" : "text-primary")} />
            Pending Scores
          </CardTitle>
          <CardDescription className={shouldApplyWinter ? "text-cyan-300/70" : undefined}>
            {matches.length} match{matches.length !== 1 ? 'es' : ''} awaiting score reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-3 transition-colors",
                  shouldApplyWinter
                    ? "bg-slate-800/50 border-cyan-500/20 hover:bg-slate-800/70"
                    : "bg-card hover:bg-accent/50"
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Team 1 */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 flex-shrink-0">
                      {match.team1_logo ? (
                        <img 
                          src={match.team1_logo} 
                          alt={`${match.team1_name} logo`}
                           className="w-8 h-8 object-cover"
                        />
                      ) : (
                         <div className={cn(
                           "w-8 h-8 flex items-center justify-center text-xs font-medium",
                           shouldApplyWinter ? "bg-slate-700 text-cyan-300" : "bg-muted text-muted-foreground"
                         )}>
                          {match.team1_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        shouldApplyWinter && "text-cyan-50"
                      )}>{match.team1_name}</p>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="flex-shrink-0 px-2">
                    <span className={cn(
                      "text-xs font-medium",
                      shouldApplyWinter ? "text-cyan-400/70" : "text-muted-foreground"
                    )}>vs</span>
                  </div>

                  {/* Team 2 */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        shouldApplyWinter && "text-cyan-50"
                      )}>{match.team2_name}</p>
                    </div>
                    <div className="w-8 h-8 flex-shrink-0">
                      {match.team2_logo ? (
                        <img 
                          src={match.team2_logo} 
                          alt={`${match.team2_name} logo`}
                          className="w-8 h-8 object-cover"
                        />
                      ) : (
                        <div className={cn(
                          "w-8 h-8 flex items-center justify-center text-xs font-medium",
                          shouldApplyWinter ? "bg-slate-700 text-cyan-300" : "bg-muted text-muted-foreground"
                        )}>
                          {match.team2_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Info & Action */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className={cn(
                    "text-xs text-right tabular-nums",
                    shouldApplyWinter ? "text-cyan-300/70" : "text-muted-foreground"
                  )}>
                    <div>{formatDate(match.date)}</div>
                    <div>{formatTime(match.date)}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedMatchId(match.id)}
                    className={shouldApplyWinter ? "btn-winter-secondary" : undefined}
                  >
                    Report
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedMatch && (
        <ScoreSubmissionModal
          match={selectedMatch}
          open={!!selectedMatchId}
          onClose={() => setSelectedMatchId(null)}
        />
      )}
    </>
  );
};

export default PendingScoresCard;
