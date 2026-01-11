import {
  Award,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Minus,
  Shield,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamSeasonBreakdown } from '@/hooks/useTeamSeasonBreakdown';
import { cn } from '@/lib/utils';
import { SeasonBreakdown } from '@/types/teamAdvancedStats';

interface TeamAdvancedStatsSectionProps {
  teamId: string;
}

const getDivisionBadgeColor = (division: string) => {
  const name = division.toLowerCase();
  if (name.includes('competitive') || name.includes('hidden'))
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (name.includes('intermediate')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (name.includes('recreational')) return 'bg-green-500/20 text-green-400 border-green-500/30';
  return 'bg-muted text-muted-foreground';
};

const getWinPctColor = (pct: number) => {
  if (pct >= 70) return 'text-emerald-500';
  if (pct >= 55) return 'text-blue-500';
  if (pct >= 45) return 'text-yellow-500';
  return 'text-red-500';
};

const getPowerScoreColor = (score: number | null) => {
  if (score === null) return 'text-muted-foreground';
  if (score >= 70) return 'text-emerald-500';
  if (score >= 55) return 'text-blue-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
};

const SeasonRow = ({
  season,
  isExpanded,
  onToggle,
}: {
  season: SeasonBreakdown;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const hasDivisionRecords =
    season.divisionRecords.competitive.wins + season.divisionRecords.competitive.losses > 0 ||
    season.divisionRecords.intermediate.wins + season.divisionRecords.intermediate.losses > 0 ||
    season.divisionRecords.recreational.wins + season.divisionRecords.recreational.losses > 0;

  return (
    <>
      <tr
        className={cn(
          'border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer',
          isExpanded && 'bg-muted/20'
        )}
        onClick={onToggle}
      >
        {/* Season & Division */}
        <td className="py-3 px-2 md:px-4">
          <div className="flex items-center gap-2">
            {hasDivisionRecords ? (
              isExpanded ? (
                <ChevronDown size={14} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={14} className="text-muted-foreground" />
              )
            ) : (
              <div className="w-[14px]" />
            )}
            <div>
              <div className="font-medium text-sm">{season.seasonName}</div>
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded border',
                  getDivisionBadgeColor(season.divisionName)
                )}
              >
                {season.divisionName}
              </span>
            </div>
          </div>
        </td>

        {/* Record */}
        <td className="py-3 px-2 md:px-4 text-center">
          <div className="font-mono text-sm font-medium">
            {season.matchWins}-{season.matchLosses}
          </div>
          <div className={cn('text-xs font-medium', getWinPctColor(season.winPct))}>
            {season.winPct.toFixed(0)}%
          </div>
        </td>

        {/* Games */}
        <td className="py-3 px-2 md:px-4 text-center hidden md:table-cell">
          <div className="font-mono text-sm">
            {season.gameWins}-{season.gameLosses}
          </div>
          <div className={cn('text-xs', getWinPctColor(season.gameWinPct))}>
            {season.gameWinPct.toFixed(0)}%
          </div>
        </td>

        {/* Power Score */}
        <td className="py-3 px-2 md:px-4 text-center">
          <div
            className={cn('font-mono text-sm font-medium', getPowerScoreColor(season.powerScore))}
          >
            {season.powerScore !== null ? season.powerScore.toFixed(1) : '-'}
          </div>
        </td>

        {/* Playoff */}
        <td className="py-3 px-2 md:px-4 text-center hidden lg:table-cell">
          {season.playoffRank !== null ? (
            <div className="flex items-center justify-center gap-1">
              {season.isChampion && <Trophy size={14} className="text-yellow-500" />}
              {season.isRunnerUp && <Award size={14} className="text-slate-400" />}
              <span
                className={cn(
                  'font-mono text-sm font-medium',
                  season.isChampion
                    ? 'text-yellow-500'
                    : season.isTop3
                      ? 'text-emerald-500'
                      : 'text-foreground'
                )}
              >
                #{season.playoffRank}
              </span>
              <span className="text-xs text-muted-foreground">
                ({season.playoffWins}-{season.playoffLosses})
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </td>

        {/* Sweeps & Close */}
        <td className="py-3 px-2 md:px-4 text-center hidden xl:table-cell">
          <div className="text-xs">
            <span className="font-medium">{season.sweeps}</span>
            <span className="text-muted-foreground"> sweeps</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {season.closeWins}W / {season.closeLosses}L close
          </div>
        </td>
      </tr>

      {/* Expanded division breakdown */}
      {isExpanded && hasDivisionRecords && (
        <tr className="bg-muted/10">
          <td colSpan={6} className="py-2 px-4 md:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {season.divisionRecords.competitive.wins + season.divisionRecords.competitive.losses >
                0 && (
                <DivisionRecordCard
                  tier="competitive"
                  record={season.divisionRecords.competitive}
                />
              )}
              {season.divisionRecords.intermediate.wins +
                season.divisionRecords.intermediate.losses >
                0 && (
                <DivisionRecordCard
                  tier="intermediate"
                  record={season.divisionRecords.intermediate}
                />
              )}
              {season.divisionRecords.recreational.wins +
                season.divisionRecords.recreational.losses >
                0 && (
                <DivisionRecordCard
                  tier="recreational"
                  record={season.divisionRecords.recreational}
                />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const DivisionRecordCard = ({
  tier,
  record,
}: {
  tier: 'competitive' | 'intermediate' | 'recreational';
  record: { wins: number; losses: number; gameWins: number; gameLosses: number };
}) => {
  const icons = {
    competitive: <Shield size={14} className="text-red-500" />,
    intermediate: <Users size={14} className="text-blue-500" />,
    recreational: <Star size={14} className="text-green-500" />,
  };

  const labels = {
    competitive: 'vs Competitive',
    intermediate: 'vs Intermediate',
    recreational: 'vs Recreational',
  };

  const total = record.wins + record.losses;
  const winPct = total > 0 ? (record.wins / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-border/50">
      {icons[tier]}
      <div>
        <div className="text-xs text-muted-foreground">{labels[tier]}</div>
        <div className="font-mono text-sm font-medium">
          {record.wins}-{record.losses}
          <span className={cn('ml-2 text-xs', getWinPctColor(winPct))}>({winPct.toFixed(0)}%)</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Games: {record.gameWins}-{record.gameLosses}
        </div>
      </div>
    </div>
  );
};

const TeamAdvancedStatsSection: React.FC<TeamAdvancedStatsSectionProps> = ({ teamId }) => {
  const { advancedStats, isLoading } = useTeamSeasonBreakdown(teamId);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());

  const toggleSeason = (seasonId: string) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonId)) {
        next.delete(seasonId);
      } else {
        next.add(seasonId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <CollapsibleSection
        title="Advanced Stats"
        icon={BarChart3}
        iconColor="text-indigo-500"
        defaultOpen={false}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-full"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded w-full"></div>
          ))}
        </div>
      </CollapsibleSection>
    );
  }

  if (!advancedStats || advancedStats.seasons.length === 0) {
    return (
      <CollapsibleSection
        title="Advanced Stats"
        icon={BarChart3}
        iconColor="text-indigo-500"
        defaultOpen={false}
      >
        <div className="text-center py-8">
          <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No advanced stats available</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Stats will appear after completing seasons
          </p>
        </div>
      </CollapsibleSection>
    );
  }

  const TrendIcon =
    advancedStats.powerScoreTrend === 'improving'
      ? TrendingUp
      : advancedStats.powerScoreTrend === 'declining'
        ? TrendingDown
        : Minus;

  const trendColor =
    advancedStats.powerScoreTrend === 'improving'
      ? 'text-emerald-500'
      : advancedStats.powerScoreTrend === 'declining'
        ? 'text-red-500'
        : 'text-muted-foreground';

  return (
    <CollapsibleSection
      title="Advanced Stats"
      icon={BarChart3}
      iconColor="text-indigo-500"
      defaultOpen={false}
    >
      <Tabs defaultValue="seasons" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="seasons" className="text-xs md:text-sm">
            Season-by-Season
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs md:text-sm">
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="seasons">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Target size={14} className="text-blue-500" />
                <span className="text-xs text-muted-foreground">Seasons Played</span>
              </div>
              <div className="font-mono text-lg font-semibold">{advancedStats.seasons.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-amber-500" />
                <span className="text-xs text-muted-foreground">Avg Power Score</span>
              </div>
              <div
                className={cn(
                  'font-mono text-lg font-semibold',
                  getPowerScoreColor(advancedStats.averagePowerScore)
                )}
              >
                {advancedStats.averagePowerScore.toFixed(1)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <TrendIcon size={14} className={trendColor} />
                <span className="text-xs text-muted-foreground">Trend</span>
              </div>
              <div className={cn('font-medium text-sm capitalize', trendColor)}>
                {advancedStats.powerScoreTrend}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={14} className="text-yellow-500" />
                <span className="text-xs text-muted-foreground">Championships</span>
              </div>
              <div className="font-mono text-lg font-semibold">
                {advancedStats.seasons.filter((s) => s.isChampion).length}
              </div>
            </div>
          </div>

          {/* Season Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 px-2 md:px-4 font-medium text-muted-foreground">Season</th>
                  <th className="py-2 px-2 md:px-4 font-medium text-muted-foreground text-center">
                    Record
                  </th>
                  <th className="py-2 px-2 md:px-4 font-medium text-muted-foreground text-center hidden md:table-cell">
                    Games
                  </th>
                  <th className="py-2 px-2 md:px-4 font-medium text-muted-foreground text-center">
                    Power
                  </th>
                  <th className="py-2 px-2 md:px-4 font-medium text-muted-foreground text-center hidden lg:table-cell">
                    Playoff
                  </th>
                  <th className="py-2 px-2 md:px-4 font-medium text-muted-foreground text-center hidden xl:table-cell">
                    Quality
                  </th>
                </tr>
              </thead>
              <tbody>
                {advancedStats.seasons.map((season) => (
                  <SeasonRow
                    key={season.seasonId}
                    season={season}
                    isExpanded={expandedSeasons.has(season.seasonId)}
                    onToggle={() => toggleSeason(season.seasonId)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <div className="space-y-4">
            {/* Best Season */}
            {advancedStats.bestSeason && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={16} className="text-emerald-500" />
                  <span className="font-medium text-emerald-400">Best Season</span>
                </div>
                <div className="text-lg font-semibold">{advancedStats.bestSeason.seasonName}</div>
                <div className="text-sm text-muted-foreground">
                  {advancedStats.bestSeason.matchWins}-{advancedStats.bestSeason.matchLosses} record
                  {advancedStats.bestSeason.isChampion && ' • Champion'}
                  {advancedStats.bestSeason.powerScore !== null &&
                    ` • ${advancedStats.bestSeason.powerScore.toFixed(1)} Power Score`}
                </div>
              </div>
            )}

            {/* Best/Worst Division */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {advancedStats.bestDivisionTier && (
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-emerald-500" />
                    <span className="font-medium text-sm">Strongest Against</span>
                  </div>
                  <div className="text-lg font-semibold capitalize">
                    {advancedStats.bestDivisionTier}
                  </div>
                </div>
              )}
              {advancedStats.worstDivisionTier &&
                advancedStats.worstDivisionTier !== advancedStats.bestDivisionTier && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown size={16} className="text-red-500" />
                      <span className="font-medium text-sm">Toughest Matchup</span>
                    </div>
                    <div className="text-lg font-semibold capitalize">
                      {advancedStats.worstDivisionTier}
                    </div>
                  </div>
                )}
            </div>

            {/* Championship History */}
            {advancedStats.seasons.some((s) => s.isChampion || s.isRunnerUp) && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Award size={16} className="text-yellow-500" />
                  <span className="font-medium text-sm">Championship History</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {advancedStats.seasons
                    .filter((s) => s.isChampion || s.isRunnerUp)
                    .map((s) => (
                      <div
                        key={s.seasonId}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5',
                          s.isChampion
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-slate-500/20 text-slate-400'
                        )}
                      >
                        {s.isChampion ? <Trophy size={12} /> : <Award size={12} />}
                        {s.seasonName}
                        <span className="text-xs opacity-70">({s.divisionName})</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </CollapsibleSection>
  );
};

export default TeamAdvancedStatsSection;
