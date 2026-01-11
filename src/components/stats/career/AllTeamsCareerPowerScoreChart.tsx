import { ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { TooltipProps } from 'recharts';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MultiSelect } from '@/components/ui/multi-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { TeamCareerData, useAllTeamsCareerPowerScores } from '@/hooks/useAllTeamsCareerPowerScores';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { gradients } from '@/styles/design-system';
import { getTeamColor } from '@/utils/colors/teamColors';

const transformDataForChart = (teamsData?: TeamCareerData[]) => {
  if (!teamsData) return [];

  const allSeasons = new Set<string>();
  const seasonOrderMap = new Map<string, number>();

  teamsData.forEach((team) => {
    team.seasonData.forEach((s) => {
      allSeasons.add(s.seasonName);
      seasonOrderMap.set(s.seasonName, s.seasonOrder);
    });
  });

  return Array.from(allSeasons)
    .sort((a, b) => (seasonOrderMap.get(a) || 0) - (seasonOrderMap.get(b) || 0))
    .map((seasonName) => {
      const dataPoint: any = { seasonName };

      teamsData.forEach((team) => {
        const seasonStat = team.seasonData.find((s) => s.seasonName === seasonName);
        dataPoint[`team_${team.teamId}`] =
          seasonStat?.powerScore != null ? seasonStat.powerScore * 100 : null;
      });

      return dataPoint;
    });
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<any>;
  teamsData?: TeamCareerData[];
  selectedTeamIds: string[];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  teamsData,
  selectedTeamIds,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const seasonName = payload[0]?.payload?.seasonName;

  // Show only selected teams in tooltip if any are selected, otherwise show all
  const visibleTeams = (payload ?? [])
    .filter((p: any) => p.value !== null)
    .filter((p: any) => {
      if (selectedTeamIds.length === 0) return true;
      const teamId = p.dataKey.replace('team_', '');
      return selectedTeamIds.includes(teamId);
    })
    .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-h-64 overflow-y-auto">
      <p className="font-semibold text-sm mb-2">{seasonName}</p>
      {visibleTeams.map((entry: any, index: number) => {
        const teamId = entry.dataKey.replace('team_', '');
        const team = teamsData?.find((t: TeamCareerData) => t.teamId === teamId);
        return (
          <p key={index} className="text-xs">
            <Link
              to={`/teams/${teamId}`}
              className="hover:underline transition-colors"
              style={{ color: entry.stroke }}
              onClick={(e) => e.stopPropagation()}
            >
              {team?.teamName}
            </Link>
            : <span className="font-bold">{entry.value?.toFixed(1)}</span>
          </p>
        );
      })}
    </div>
  );
};

export const AllTeamsCareerPowerScoreChart: React.FC = () => {
  const { data: teamsData, isLoading } = useAllTeamsCareerPowerScores();
  const { theme, resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const { isWinterTheme } = useSeasonalThemeBase();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const chartData = useMemo(() => transformDataForChart(teamsData), [teamsData]);
  const isLight = !isWinterTheme && resolvedTheme === 'light';

  const teamOptions = useMemo(
    () =>
      teamsData
        ?.map((t) => ({
          value: t.teamId,
          label: t.teamName,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)) || [],
    [teamsData]
  );

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!teamsData || teamsData.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <Card
        className={cn(
          'border-t-2',
          isWinterTheme
            ? 'border-frost-border/50 bg-[hsl(var(--card))]'
            : 'border-blue-300 dark:border-blue-700/80',
          'shadow-lg hover:shadow-xl transition-shadow duration-300',
          isLight ? gradients.card.blueOrange : ''
        )}
      >
        <CollapsibleTrigger className="w-full">
          <CardHeader
            className={cn(
              isMobile ? 'py-2.5 px-3' : 'py-4',
              isWinterTheme
                ? 'bg-[hsl(var(--card))]'
                : isLight
                  ? 'bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30'
                  : 'bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-900/80',
              isWinterTheme
                ? 'border-b border-frost-border/30'
                : 'border-b border-blue-100 dark:border-blue-900/30',
              'rounded-t-lg cursor-pointer hover:bg-muted/50 transition-colors'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <CardTitle
                  className={cn(
                    'font-bebas uppercase tracking-wide',
                    isMobile ? 'text-lg' : 'text-xl sm:text-2xl',
                    'bg-gradient-to-br from-blue-800 via-blue-700 to-amber-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-400',
                    'heading-winter'
                  )}
                  style={{ letterSpacing: '0.5px' }}
                >
                  Career Power Score Trends
                </CardTitle>
                {!isMobile && (
                  <CardDescription
                    className={cn(
                      isLight ? 'text-gray-600 font-medium font-inter' : 'text-gray-400 font-inter'
                    )}
                  >
                    Compare team performance across multiple seasons
                  </CardDescription>
                )}
              </div>
              <ChevronDown className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent>
            <div className="mb-4">
              <MultiSelect
                options={teamOptions}
                selected={selectedTeamIds}
                onChange={setSelectedTeamIds}
                placeholder="Select teams to highlight..."
              />
            </div>

            {selectedTeamIds.length === 0 && (
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Select teams above to highlight their trends
              </p>
            )}

            <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="seasonName"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  label={{ value: 'Power Score', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  content={
                    <CustomTooltip teamsData={teamsData} selectedTeamIds={selectedTeamIds} />
                  }
                  wrapperStyle={{ pointerEvents: 'auto' }}
                />

                {teamsData?.map((team) => {
                  const isSelected = selectedTeamIds.includes(team.teamId);
                  const color = isSelected ? getTeamColor(team.teamId, isDark) : '#9ca3af';

                  return (
                    <Line
                      key={team.teamId}
                      type="monotone"
                      dataKey={`team_${team.teamId}`}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 1}
                      opacity={isSelected ? 1 : 0.2}
                      dot={false}
                      connectNulls={false}
                      name={team.teamName}
                      isAnimationActive={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>

            {selectedTeamIds.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {selectedTeamIds.map((teamId) => {
                  const team = teamsData?.find((t) => t.teamId === teamId);
                  if (!team) return null;
                  const color = getTeamColor(teamId, isDark);
                  return (
                    <div key={teamId} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-0.5" style={{ backgroundColor: color }} />
                      <Link
                        to={`/teams/${teamId}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer"
                      >
                        {team.teamName}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
