
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, TrendingUp, Target } from 'lucide-react';
import { WeeklyDigest } from '@/hooks/weekly';

interface WeeklyOverviewProps {
  digest: WeeklyDigest;
}

const WeeklyOverview: React.FC<WeeklyOverviewProps> = ({ digest }) => {
  const { digest_data } = digest;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Matches */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{digest_data.total_matches}</div>
          <p className="text-xs text-muted-foreground">
            Week of {new Date(digest_data.week_of).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      {/* Total Upsets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upsets</CardTitle>
          <Trophy className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {digest_data.total_upsets}
          </div>
          <p className="text-xs text-muted-foreground">
            Division weight differences
          </p>
        </CardContent>
      </Card>

      {/* Hottest Team */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hottest Team</CardTitle>
          <Flame className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          {digest_data.hottest_team ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-sm font-medium truncate">
                  {digest_data.hottest_team.name}
                </div>
              </div>
              <Badge variant="destructive" className="text-xs">
                {digest_data.hottest_team.heat_score.toFixed(1)} heat
              </Badge>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No data</div>
          )}
        </CardContent>
      </Card>

      {/* Coolest Team */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Coolest Team</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          {digest_data.coolest_team ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-sm font-medium truncate">
                  {digest_data.coolest_team.name}
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {digest_data.coolest_team.heat_score.toFixed(1)} heat
              </Badge>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No data</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyOverview;
