import { GraduationCap } from 'lucide-react';
import React, { useState } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ReportCardMode, useTeamReportCard } from '@/hooks/useTeamReportCard';
import { cn } from '@/lib/utils';
import { useChartColors } from '@/utils/charts/chartStyleUtils';
import {
  getGradeBgColor,
  getGradeChartColor,
  getGradeColor,
  GradeCategory,
} from '@/utils/reportCardUtils';

import ReportCardLeaderboard from './ReportCardLeaderboard';

interface TeamReportCardProps {
  teamId: string;
}

const GradeCard: React.FC<{ category: GradeCategory }> = ({ category }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        getGradeBgColor(category.grade)
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{category.label}</p>
        <p className="text-xs text-muted-foreground truncate">{category.description}</p>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <span className="text-xs text-muted-foreground">{category.percentile}th</span>
        <span className={cn('text-2xl font-bold font-mono', getGradeColor(category.grade))}>
          {category.grade}
        </span>
      </div>
    </div>
  );
};

const GPADisplay: React.FC<{ gpa: number }> = ({ gpa }) => {
  const getGpaColor = () => {
    if (gpa >= 3.5) return 'text-emerald-600 dark:text-emerald-400';
    if (gpa >= 3.0) return 'text-blue-600 dark:text-blue-400';
    if (gpa >= 2.0) return 'text-amber-600 dark:text-amber-400';
    if (gpa >= 1.0) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-muted/50 border">
      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">GPA</span>
      <span className={cn('text-3xl font-bold font-mono', getGpaColor())}>{gpa.toFixed(2)}</span>
      <span className="text-sm text-muted-foreground">/ 4.00</span>
    </div>
  );
};

const ReportCardRadar: React.FC<{
  grades: {
    overall: GradeCategory;
    offense: GradeCategory;
    clutch: GradeCategory;
    schedule: GradeCategory;
    consistency: GradeCategory;
    games: GradeCategory;
  };
}> = ({ grades }) => {
  const colors = useChartColors();
  const overallColor = getGradeChartColor(grades.overall.grade);

  const data = [
    { category: 'Overall', value: grades.overall.percentile },
    { category: 'Offense', value: grades.offense.percentile },
    { category: 'Clutch', value: grades.clutch.percentile },
    { category: 'Schedule', value: grades.schedule.percentile },
    { category: 'Consistency', value: grades.consistency.percentile },
    { category: 'Games', value: grades.games.percentile },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke={colors.gridColor} />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: colors.textColor, fontSize: 11, fontWeight: 500 }}
        />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          dataKey="value"
          stroke={overallColor}
          fill={overallColor}
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

const ModeToggle: React.FC<{
  mode: ReportCardMode;
  onModeChange: (mode: ReportCardMode) => void;
}> = ({ mode, onModeChange }) => {
  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(value) => {
        if (value) onModeChange(value as ReportCardMode);
      }}
      className="justify-start"
      size="sm"
    >
      <ToggleGroupItem value="season" className="text-xs px-3">
        Season
      </ToggleGroupItem>
      <ToggleGroupItem value="career" className="text-xs px-3">
        Career
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

const TeamReportCard: React.FC<TeamReportCardProps> = ({ teamId }) => {
  const [mode, setMode] = useState<ReportCardMode>('season');
  const { grades, isLoading } = useTeamReportCard(teamId, mode);

  return (
    <CollapsibleSection
      title="Report Card"
      icon={GraduationCap}
      iconColor="text-violet-500"
      defaultOpen={false}
      headingId="report-card-heading"
      isLoading={isLoading}
      loadingContent={
        <div className="space-y-3">
          <Skeleton className="h-[260px] w-full rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      }
      isEmpty={!grades}
      emptyContent={
        <p className="text-sm text-muted-foreground text-center py-4">
          Not enough data to generate a report card yet. Play some matches first!
        </p>
      }
    >
      {grades && (
        <div className="space-y-4">
          {/* Mode Toggle */}
          <ModeToggle mode={mode} onModeChange={setMode} />

           {/* GPA + Leaderboard */}
           <div className="flex items-center gap-2">
             <div className="flex-1">
               <GPADisplay gpa={grades.gpa} />
             </div>
             <ReportCardLeaderboard teamId={teamId} initialMode={mode} />
           </div>

          {/* Radar Chart */}
          <ReportCardRadar grades={grades} />

          {/* Grade Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <GradeCard category={grades.overall} />
            <GradeCard category={grades.offense} />
            <GradeCard category={grades.clutch} />
            <GradeCard category={grades.schedule} />
            <GradeCard category={grades.consistency} />
            <GradeCard category={grades.games} />
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
};

export default TeamReportCard;
