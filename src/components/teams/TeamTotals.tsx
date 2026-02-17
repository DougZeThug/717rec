import {
  Award,
  BarChart,
  
  Scale,
  Shield,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wind,
  Zap,
} from 'lucide-react';
import React from 'react';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { PercentileFromResult } from '@/components/ui/PercentileBadge';
import { useLeaguePercentiles } from '@/hooks/useLeaguePercentiles';
import { useTeamTotals } from '@/hooks/useTeamTotals';
import { getPowerScoreColor, getSosColor, getSweepRateColor } from '@/utils/colors';

interface TeamTotalsProps {
  teamId: string;
}

const TeamTotals: React.FC<TeamTotalsProps> = ({ teamId }) => {
  const { totals, isLoading } = useTeamTotals(teamId);
  const { getTeamPercentiles, isLoading: percentilesLoading } = useLeaguePercentiles();

  const percentiles = getTeamPercentiles(teamId);

  if (isLoading) {
    return (
      <CollapsibleSection
        title="Career Statistics"
        icon={BarChart}
        iconColor="text-purple-500"
        defaultOpen={false}
      >
        <div className="animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>
    );
  }

  if (!totals) {
    return (
      <CollapsibleSection
        title="Career Statistics"
        icon={BarChart}
        iconColor="text-purple-500"
        defaultOpen={false}
      >
        <div className="text-center py-8">
          <BarChart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            No career statistics available
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Stats will appear after playing matches
          </p>
        </div>
      </CollapsibleSection>
    );
  }

  // Calculate win percentage for division records
  const getWinPct = (wins: number, losses: number): string => {
    const total = wins + losses;
    if (total === 0) return '-';
    return ((wins / total) * 100).toFixed(0) + '%';
  };

  const getWinPctColor = (wins: number, losses: number): string => {
    const total = wins + losses;
    if (total === 0) return 'text-muted-foreground';
    const pct = (wins / total) * 100;
    if (pct >= 60) return 'text-emerald-500';
    if (pct >= 50) return 'text-blue-500';
    if (pct >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const hasDivisionRecords =
    totals.division_records &&
    (totals.division_records.competitive.wins + totals.division_records.competitive.losses > 0 ||
      totals.division_records.intermediate.wins + totals.division_records.intermediate.losses > 0 ||
      totals.division_records.recreational.wins + totals.division_records.recreational.losses > 0);

  return (
    <CollapsibleSection
      title="Career Statistics"
      icon={BarChart}
      iconColor="text-purple-500"
      defaultOpen={false}
      headingId="career-heading"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 md:gap-6">
        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground">
            Career Record
          </span>
          <div className="font-mono text-base md:text-lg font-medium tabular-nums text-foreground flex items-center gap-2">
            <Trophy size={16} className="text-emerald-500 flex-shrink-0" />
            {totals.career_match_wins}-{totals.career_match_losses}
            {percentiles && (
              <PercentileFromResult result={percentiles.winPercentage} statName="Win %" />
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground">
            Career Games
          </span>
          <div className="font-mono text-base md:text-lg font-medium tabular-nums text-foreground flex items-center">
            <Target size={16} className="text-blue-500 mr-2" />
            {totals.career_game_wins}-{totals.career_game_losses}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground">
            Playoff Record
          </span>
          <div className="font-mono text-base md:text-lg font-medium tabular-nums text-foreground flex items-center">
            <Trophy size={16} className="text-purple-500 mr-2" />
            {totals.career_playoff_wins}-{totals.career_playoff_losses}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground">
            Championships
          </span>
          <div className="font-mono text-base md:text-lg font-medium tabular-nums text-foreground flex items-center">
            <Award size={16} className="text-yellow-500 mr-2" />
            {totals.championships || 0}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground">
            Runner-ups
          </span>
          <div className="font-mono text-base md:text-lg font-medium tabular-nums text-foreground flex items-center">
            <TrendingUp size={16} className="text-orange-500 mr-2" />
            {totals.runner_ups || 0}
          </div>
        </div>


        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground">
            Career Power Score
          </span>
          <div
            className={`font-mono text-base md:text-lg font-medium tabular-nums flex items-center gap-2 ${getPowerScoreColor(totals.career_power_score)}`}
          >
            <Zap size={16} className="flex-shrink-0" />
            {totals.career_power_score.toFixed(1)}
            {percentiles && (
              <PercentileFromResult result={percentiles.powerScore} statName="Power Score" />
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground">
            Career Sweep Rate
          </span>
          <div
            className={`font-mono text-base md:text-lg font-medium tabular-nums flex items-center gap-2 ${getSweepRateColor(totals.career_sweep_rate)}`}
          >
            <Wind size={16} className="flex-shrink-0" />
            {totals.career_sweep_rate.toFixed(1)}%
          </div>
          <span className="text-xs tabular-nums text-muted-foreground mt-1">
            {totals.career_sweeps} sweeps / {totals.career_match_wins + totals.career_match_losses}{' '}
            matches
          </span>
        </div>

        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground">
            Career SOS
          </span>
          <div
            className={`font-mono text-base md:text-lg font-medium tabular-nums flex items-center gap-2 ${totals.career_sos > 0 ? getSosColor(totals.career_sos) : 'text-muted-foreground'}`}
          >
            <Scale size={16} className="flex-shrink-0" />
            {totals.career_match_wins + totals.career_match_losses > 0
              ? totals.career_sos.toFixed(3)
              : 'N/A'}
            {percentiles && totals.career_match_wins + totals.career_match_losses > 0 && (
              <PercentileFromResult result={percentiles.sos} statName="Strength of Schedule" />
            )}
          </div>
        </div>
      </div>

      {hasDivisionRecords && (
        <div className="mt-4 md:mt-6 pt-4 border-t border-border">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground mb-3 block">
            Records by Division
          </span>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {totals.division_records.competitive.wins + totals.division_records.competitive.losses >
              0 && (
              <div className="flex flex-col p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={14} className="text-red-500" />
                  <span className="text-xs font-medium text-muted-foreground">Competitive</span>
                </div>
                <div className="font-mono text-base md:text-lg font-semibold tabular-nums">
                  {totals.division_records.competitive.wins}-
                  {totals.division_records.competitive.losses}
                </div>
                <span
                  className={`text-xs font-medium ${getWinPctColor(totals.division_records.competitive.wins, totals.division_records.competitive.losses)}`}
                >
                  {getWinPct(
                    totals.division_records.competitive.wins,
                    totals.division_records.competitive.losses
                  )}
                </span>
              </div>
            )}
            {totals.division_records.intermediate.wins +
              totals.division_records.intermediate.losses >
              0 && (
              <div className="flex flex-col p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={14} className="text-blue-500" />
                  <span className="text-xs font-medium text-muted-foreground">Intermediate</span>
                </div>
                <div className="font-mono text-base md:text-lg font-semibold tabular-nums">
                  {totals.division_records.intermediate.wins}-
                  {totals.division_records.intermediate.losses}
                </div>
                <span
                  className={`text-xs font-medium ${getWinPctColor(totals.division_records.intermediate.wins, totals.division_records.intermediate.losses)}`}
                >
                  {getWinPct(
                    totals.division_records.intermediate.wins,
                    totals.division_records.intermediate.losses
                  )}
                </span>
              </div>
            )}
            {totals.division_records.recreational.wins +
              totals.division_records.recreational.losses >
              0 && (
              <div className="flex flex-col p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Star size={14} className="text-green-500" />
                  <span className="text-xs font-medium text-muted-foreground">Recreational</span>
                </div>
                <div className="font-mono text-base md:text-lg font-semibold tabular-nums">
                  {totals.division_records.recreational.wins}-
                  {totals.division_records.recreational.losses}
                </div>
                <span
                  className={`text-xs font-medium ${getWinPctColor(totals.division_records.recreational.wins, totals.division_records.recreational.losses)}`}
                >
                  {getWinPct(
                    totals.division_records.recreational.wins,
                    totals.division_records.recreational.losses
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {totals.playoff_finishes && totals.playoff_finishes.length > 0 && (
        <div className="mt-4 md:mt-6 pt-4 border-t border-border">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground mb-3 block">
            Recent Playoff Finishes
          </span>
          <div className="flex flex-wrap gap-2">
            {totals.playoff_finishes.slice(0, 8).map((finish, index) => (
              <div
                key={index}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-muted-foreground"
              >
                #{finish.rank} <span className="text-xs opacity-70">({finish.division_name})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
};

export default React.memo(TeamTotals);
