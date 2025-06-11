import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, ArrowRight } from 'lucide-react';
import { useLatestWeeklyDigest } from '@/hooks/weekly';
import { RouterLink } from '@/components/navigation';
import { TeamLogo } from '@/components/shared/TeamLogo';

const WeeklyHeatTeaser = () => {
  const { data: digest, isLoading } = useLatestWeeklyDigest();

  if (isLoading || !digest) {
    return null;
  }

  const { digest_data } = digest;

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
          <Flame className="h-5 w-5" />
          Weekly Heat Index
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Hottest Team */}
          {digest_data.hottest_team && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                🔥 Hottest Team
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium truncate">
                  {digest_data.hottest_team.name}
                </div>
              </div>
              <Badge variant="destructive" className="text-xs">
                {digest_data.hottest_team.heat_score.toFixed(1)} heat
              </Badge>
            </div>
          )}

          {/* Key Stats */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              📊 This Week
            </div>
            <div className="space-y-1">
              <div className="text-sm">
                <span className="font-medium">{digest_data.total_matches}</span> matches
              </div>
              <div className="text-sm">
                <span className="font-medium text-orange-600">{digest_data.total_upsets}</span> upsets
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-orange-200 dark:border-orange-800">
          <RouterLink to="/stats">
            <Button variant="ghost" size="sm" className="w-full justify-between text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/20">
              View Full Heat Rankings
              <ArrowRight className="h-4 w-4" />
            </Button>
          </RouterLink>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyHeatTeaser;
