import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { useAllTeamsCareerPowerScores, TeamCareerData } from '@/hooks/useAllTeamsCareerPowerScores';
import { getTeamColor } from '@/utils/colors/teamColors';
import { useTheme } from 'next-themes';
import { useIsMobile } from '@/hooks/use-mobile';
import { MultiSelect } from '@/components/ui/multi-select';
import { Skeleton } from '@/components/ui/skeleton';

const transformDataForChart = (teamsData?: TeamCareerData[]) => {
  if (!teamsData) return [];

  const allSeasons = new Set<string>();
  const seasonOrderMap = new Map<string, number>();

  teamsData.forEach(team => {
    team.seasonData.forEach(s => {
      allSeasons.add(s.seasonName);
      seasonOrderMap.set(s.seasonName, s.seasonOrder);
    });
  });

  return Array.from(allSeasons)
    .sort((a, b) => (seasonOrderMap.get(a) || 0) - (seasonOrderMap.get(b) || 0))
    .map(seasonName => {
      const dataPoint: any = { seasonName };
      
      teamsData.forEach(team => {
        const seasonStat = team.seasonData.find(s => s.seasonName === seasonName);
        dataPoint[`team_${team.teamId}`] = seasonStat?.powerScore || null;
      });

      return dataPoint;
    });
};

interface CustomTooltipProps extends TooltipProps<number, string> {
  teamsData?: TeamCareerData[];
  selectedTeamIds: string[];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, teamsData, selectedTeamIds }) => {
  if (!active || !payload || payload.length === 0) return null;

  const seasonName = payload[0]?.payload?.seasonName;
  
  // Show only selected teams in tooltip if any are selected, otherwise show all
  const visibleTeams = payload
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
            :{' '}
            <span className="font-bold">{entry.value?.toFixed(1)}</span>
          </p>
        );
      })}
    </div>
  );
};

export const AllTeamsCareerPowerScoreChart: React.FC = () => {
  const { data: teamsData, isLoading } = useAllTeamsCareerPowerScores();
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const chartData = useMemo(() => transformDataForChart(teamsData), [teamsData]);

  const teamOptions = useMemo(
    () => teamsData?.map(t => ({
      value: t.teamId,
      label: t.teamName
    })).sort((a, b) => a.label.localeCompare(b.label)) || [],
    [teamsData]
  );

  if (isLoading) {
    return (
      <Card className="mt-8">
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-8">
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <CardTitle>Career Power Score Trends (All Teams)</CardTitle>
                <CardDescription>
                  Compare team performance across multiple seasons
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
              content={<CustomTooltip teamsData={teamsData} selectedTeamIds={selectedTeamIds} />} 
              wrapperStyle={{ pointerEvents: "auto" }}
            />
                
                {teamsData?.map(team => {
                  const isSelected = selectedTeamIds.includes(team.teamId);
                  const color = isSelected 
                    ? getTeamColor(team.teamId, isDark)
                    : '#9ca3af';
                  
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
                {selectedTeamIds.map(teamId => {
                  const team = teamsData?.find(t => t.teamId === teamId);
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
