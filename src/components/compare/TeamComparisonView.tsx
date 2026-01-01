import React from "react";
import { TeamComparisonSide } from "@/hooks/useTeamComparison";
import { ComparisonStatRow } from "./ComparisonStatRow";
import { HeadToHeadSection } from "./HeadToHeadSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal } from "lucide-react";

interface TeamComparisonViewProps {
  team1: TeamComparisonSide;
  team2: TeamComparisonSide;
  headToHead: {
    team1Wins: number;
    team2Wins: number;
    gameWins1: number;
    gameWins2: number;
    lastPlayed: string | null;
    isFirstMeeting: boolean;
  } | null;
}

const TeamHeader: React.FC<{ team: TeamComparisonSide; align: "left" | "right" }> = ({
  team,
  align,
}) => (
  <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse" : ""}`}>
    <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-border">
      <AvatarImage src={team.logoUrl || undefined} alt={team.name} />
      <AvatarFallback className="text-lg font-bold bg-muted">
        {team.name.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className={`flex flex-col ${align === "right" ? "items-end" : "items-start"}`}>
      <h3 className="font-bold text-lg sm:text-xl line-clamp-1">{team.name}</h3>
      {team.totals && (
        <span className="text-sm text-muted-foreground">
          {team.totals.career_match_wins}-{team.totals.career_match_losses}
        </span>
      )}
    </div>
  </div>
);

export const TeamComparisonView: React.FC<TeamComparisonViewProps> = ({
  team1,
  team2,
  headToHead,
}) => {
  const t1 = team1.totals;
  const t2 = team2.totals;
  const p1 = team1.percentiles;
  const p2 = team2.percentiles;

  const formatRecord = (wins: number, losses: number) => `${wins}-${losses}`;
  const formatPct = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Team Headers */}
      <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
        <TeamHeader team={team1} align="left" />
        <TeamHeader team={team2} align="right" />
      </div>

      {/* Core Stats */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3 text-center uppercase tracking-wide">
          Career Statistics
        </h4>

        <ComparisonStatRow
          label="Win %"
          value1={formatPct(team1.winPct)}
          value2={formatPct(team2.winPct)}
          numericValue1={team1.winPct}
          numericValue2={team2.winPct}
          percentile1={p1?.winPercentage}
          percentile2={p2?.winPercentage}
        />

        <ComparisonStatRow
          label="Game Win %"
          value1={formatPct(team1.gameWinPct)}
          value2={formatPct(team2.gameWinPct)}
          numericValue1={team1.gameWinPct}
          numericValue2={team2.gameWinPct}
          percentile1={p1?.gameWinPercentage}
          percentile2={p2?.gameWinPercentage}
        />

        <ComparisonStatRow
          label="Power Score"
          value1={(t1?.career_power_score || 0).toFixed(1)}
          value2={(t2?.career_power_score || 0).toFixed(1)}
          numericValue1={t1?.career_power_score || 0}
          numericValue2={t2?.career_power_score || 0}
          percentile1={p1?.powerScore}
          percentile2={p2?.powerScore}
        />

        <ComparisonStatRow
          label="SOS"
          value1={(t1?.career_sos || 0).toFixed(3)}
          value2={(t2?.career_sos || 0).toFixed(3)}
          numericValue1={t1?.career_sos || 0}
          numericValue2={t2?.career_sos || 0}
          percentile1={p1?.sos}
          percentile2={p2?.sos}
        />

        <ComparisonStatRow
          label="Sweep Rate"
          value1={formatPct(t1?.career_sweep_rate || 0)}
          value2={formatPct(t2?.career_sweep_rate || 0)}
          numericValue1={t1?.career_sweep_rate || 0}
          numericValue2={t2?.career_sweep_rate || 0}
          showPercentiles={false}
        />
      </div>

      {/* Playoff Stats */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3 text-center uppercase tracking-wide">
          Playoff Performance
        </h4>

        <ComparisonStatRow
          label="Playoff Record"
          value1={formatRecord(t1?.career_playoff_wins || 0, t1?.career_playoff_losses || 0)}
          value2={formatRecord(t2?.career_playoff_wins || 0, t2?.career_playoff_losses || 0)}
          numericValue1={t1?.career_playoff_wins || 0}
          numericValue2={t2?.career_playoff_wins || 0}
          showPercentiles={false}
        />

        <div className="grid grid-cols-3 gap-2 py-3 border-b border-border/50">
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="font-semibold">{t1?.championships || 0}</span>
          </div>
          <div className="text-center text-sm text-muted-foreground">Championships</div>
          <div className="flex items-center justify-end gap-1">
            <span className="font-semibold">{t2?.championships || 0}</span>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3">
          <div className="flex items-center gap-1">
            <Medal className="h-4 w-4 text-slate-400" />
            <span className="font-semibold">{t1?.runner_ups || 0}</span>
          </div>
          <div className="text-center text-sm text-muted-foreground">Runner-ups</div>
          <div className="flex items-center justify-end gap-1">
            <span className="font-semibold">{t2?.runner_ups || 0}</span>
            <Medal className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Division Records */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3 text-center uppercase tracking-wide">
          vs Division Tiers
        </h4>

        <ComparisonStatRow
          label="vs Competitive"
          value1={formatRecord(t1?.division_records.competitive.wins || 0, t1?.division_records.competitive.losses || 0)}
          value2={formatRecord(t2?.division_records.competitive.wins || 0, t2?.division_records.competitive.losses || 0)}
          numericValue1={t1?.division_records.competitive.wins || 0}
          numericValue2={t2?.division_records.competitive.wins || 0}
          showPercentiles={false}
        />

        <ComparisonStatRow
          label="vs Intermediate"
          value1={formatRecord(t1?.division_records.intermediate.wins || 0, t1?.division_records.intermediate.losses || 0)}
          value2={formatRecord(t2?.division_records.intermediate.wins || 0, t2?.division_records.intermediate.losses || 0)}
          numericValue1={t1?.division_records.intermediate.wins || 0}
          numericValue2={t2?.division_records.intermediate.wins || 0}
          showPercentiles={false}
        />

        <ComparisonStatRow
          label="vs Recreational"
          value1={formatRecord(t1?.division_records.recreational.wins || 0, t1?.division_records.recreational.losses || 0)}
          value2={formatRecord(t2?.division_records.recreational.wins || 0, t2?.division_records.recreational.losses || 0)}
          numericValue1={t1?.division_records.recreational.wins || 0}
          numericValue2={t2?.division_records.recreational.wins || 0}
          showPercentiles={false}
        />
      </div>

      {/* Head-to-Head */}
      {headToHead && (
        <HeadToHeadSection
          team1Name={team1.name}
          team2Name={team2.name}
          team1Wins={headToHead.team1Wins}
          team2Wins={headToHead.team2Wins}
          gameWins1={headToHead.gameWins1}
          gameWins2={headToHead.gameWins2}
          lastPlayed={headToHead.lastPlayed}
          isFirstMeeting={headToHead.isFirstMeeting}
        />
      )}
    </div>
  );
};
