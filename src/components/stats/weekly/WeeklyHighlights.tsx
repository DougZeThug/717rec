
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, TrendingUp } from 'lucide-react';
import { WeeklyDigest } from '@/hooks/weekly';

interface WeeklyHighlightsProps {
  weekOf?: string;
  digest?: WeeklyDigest;
}

const getHighlightIcon = (type: string) => {
  switch (type) {
    case 'upset':
      return <Trophy className="h-4 w-4 text-orange-500" />;
    case 'streak_continue':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    default:
      return <Flame className="h-4 w-4 text-blue-500" />;
  }
};

const getHighlightBadge = (type: string) => {
  switch (type) {
    case 'upset':
      return <Badge variant="destructive" className="text-xs">Upset</Badge>;
    case 'streak_continue':
      return <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">Streak</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>;
  }
};

const WeeklyHighlights: React.FC<WeeklyHighlightsProps> = ({ digest }) => {
  if (!digest?.digest_data.highlights?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-orange-500" />
            Weekly Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No highlights available for this week.
          </p>
        </CardContent>
      </Card>
    );
  }

  const highlights = digest.digest_data.highlights;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-orange-500" />
          Weekly Highlights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {highlights.map((highlight, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getHighlightIcon(highlight.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {getHighlightBadge(highlight.type)}
                  <span className="text-sm font-medium text-muted-foreground">
                    {highlight.team_name}
                  </span>
                </div>
                <p className="text-sm text-card-foreground">
                  {highlight.description}
                </p>
                {highlight.metadata && Object.keys(highlight.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {highlight.type === 'upset' && highlight.metadata.weight_difference && (
                      <span>
                        Division difference: {highlight.metadata.weight_difference.toFixed(2)}
                      </span>
                    )}
                    {highlight.type === 'streak_continue' && highlight.metadata.bonus_points && (
                      <span>
                        Bonus points: +{highlight.metadata.bonus_points.toFixed(1)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyHighlights;
