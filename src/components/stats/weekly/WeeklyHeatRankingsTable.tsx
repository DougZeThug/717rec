
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { WeeklyHeatRanking } from '@/hooks/weekly';
import TeamLogo from '@/components/shared/TeamLogo';

interface WeeklyHeatRankingsTableProps {
  rankings: WeeklyHeatRanking[];
  isLoading?: boolean;
  weekOf?: string;
}

const getHeatColor = (score: number) => {
  if (score >= 8) return 'text-red-600 bg-red-50';
  if (score >= 5) return 'text-orange-600 bg-orange-50';
  if (score >= 2) return 'text-yellow-600 bg-yellow-50';
  if (score >= 0) return 'text-blue-600 bg-blue-50';
  return 'text-gray-600 bg-gray-50';
};

const getStreakIcon = (streakType: string, streakCount: number) => {
  if (streakCount < 2) return null;
  
  return streakType === 'win' ? (
    <TrendingUp className="h-4 w-4 text-green-500" />
  ) : (
    <TrendingDown className="h-4 w-4 text-red-500" />
  );
};

const WeeklyHeatRankingsTable: React.FC<WeeklyHeatRankingsTableProps> = ({
  rankings,
  isLoading,
  weekOf
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Weekly Heat Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rankings.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Weekly Heat Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No heat rankings available for this week.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Weekly Heat Rankings
          {weekOf && (
            <span className="text-sm font-normal text-muted-foreground">
              Week of {new Date(weekOf).toLocaleDateString()}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-center">Heat Score</TableHead>
              <TableHead className="text-center">Record</TableHead>
              <TableHead className="text-center">Upsets</TableHead>
              <TableHead className="text-center">Streak</TableHead>
              <TableHead className="text-center">Bonus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.map((ranking, index) => (
              <TableRow key={ranking.id}>
                <TableCell className="font-bold text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <TeamLogo 
                      logoUrl={ranking.team?.logo_url}
                      teamName={ranking.team?.name || 'Unknown'}
                      size="sm"
                    />
                    <div>
                      <div className="font-medium">{ranking.team?.name}</div>
                      {ranking.team?.divisionName && (
                        <div className="text-xs text-muted-foreground">
                          {ranking.team.divisionName}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="secondary" 
                    className={`font-bold ${getHeatColor(ranking.heat_score)}`}
                  >
                    {ranking.heat_score.toFixed(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-sm">
                    <span className="text-green-600 font-medium">{ranking.wins}</span>
                    <span className="text-muted-foreground mx-1">-</span>
                    <span className="text-red-600 font-medium">{ranking.losses}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {ranking.upsets > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      {ranking.upsets}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {ranking.current_streak >= 2 ? (
                    <div className="flex items-center justify-center gap-1">
                      {getStreakIcon(ranking.streak_type, ranking.current_streak)}
                      <span className="text-sm font-medium">
                        {ranking.current_streak}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {ranking.streak_bonus > 0 ? (
                    <span className="text-xs text-green-600 font-medium">
                      +{ranking.streak_bonus.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default WeeklyHeatRankingsTable;
