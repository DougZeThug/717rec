import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Users } from 'lucide-react';
import { usePendingScoresMatches } from '@/hooks/usePendingScoresMatches';
import { ScoreSubmissionModal } from './ScoreSubmissionModal';
import { formatDate, formatTime } from './utils';

const PendingScoresCard = () => {
  const { matches, isLoading } = usePendingScoresMatches();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Pending Scores
          </CardTitle>
          <CardDescription>
            Matches awaiting score reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div className="space-y-1">
                    <div className="w-20 h-4 bg-muted rounded" />
                    <div className="w-16 h-3 bg-muted rounded" />
                  </div>
                  <div className="w-4 h-4 bg-muted rounded-full mx-2" />
                  <div className="w-8 h-8 bg-muted rounded-full" />
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
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Pending Scores
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-muted-foreground">All caught up!</p>
          <p className="text-sm text-muted-foreground mt-1">No pending score reports</p>
        </CardContent>
      </Card>
    );
  }

  const selectedMatch = matches.find(m => m.id === selectedMatchId);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Pending Scores
          </CardTitle>
          <CardDescription>
            {matches.length} match{matches.length !== 1 ? 'es' : ''} awaiting score reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Team 1 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {match.team1_logo && (
                      <img 
                        src={match.team1_logo} 
                        alt={`${match.team1_name} logo`}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{match.team1_name}</p>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="flex-shrink-0">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Team 2 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{match.team2_name}</p>
                    </div>
                    {match.team2_logo && (
                      <img 
                        src={match.team2_logo} 
                        alt={`${match.team2_name} logo`}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                  </div>
                </div>

                {/* Match Info & Action */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-xs text-muted-foreground text-right">
                    <div>{formatDate(match.date)}</div>
                    <div>{formatTime(match.date)}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedMatchId(match.id)}
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