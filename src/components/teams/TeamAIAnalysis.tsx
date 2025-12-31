import React from "react";
import { Sparkles, Trophy, Target, TrendingUp, Swords, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { useTeamAIAnalysis, TeamAnalysis } from "@/hooks/useTeamAIAnalysis";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TeamAIAnalysisProps {
  teamId: string;
  teamName: string;
}

const ConfidenceBadge = ({ confidence }: { confidence: TeamAnalysis['confidence'] }) => {
  const colors = {
    high: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
    medium: 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30',
    low: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span className={cn(
      "text-xs px-2 py-0.5 rounded-full border font-medium uppercase tracking-wide",
      colors[confidence]
    )}>
      {confidence} confidence
    </span>
  );
};

const AnalysisSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-4 w-full" />
    </div>
  </div>
);

const AnalysisContent = ({ 
  analysis, 
  onRefresh, 
  isRefetching,
  isAdmin
}: { 
  analysis: TeamAnalysis; 
  onRefresh: () => void;
  isRefetching: boolean;
  isAdmin: boolean;
}) => (
  <motion.div 
    className="space-y-4 p-4"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    {/* Header with confidence and conditional refresh */}
    <div className="flex items-center justify-between flex-wrap gap-2">
      <ConfidenceBadge confidence={analysis.confidence} />
      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefetching}
          className="text-xs h-7"
        >
          <RefreshCw className={cn("h-3 w-3 mr-1", isRefetching && "animate-spin")} />
          Regenerate
        </Button>
      )}
    </div>

    {/* Overall Assessment */}
    <div className="bg-gradient-to-br from-primary/5 to-accent/10 rounded-lg p-4 border border-primary/20">
      <p className="text-sm leading-relaxed">{analysis.overall}</p>
    </div>

    {/* Strengths and Weaknesses Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Strengths */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-green-500" />
          <h4 className="font-semibold text-sm uppercase tracking-wide">Strengths</h4>
        </div>
        <ul className="space-y-1.5">
          {analysis.strengths.map((strength, i) => (
            <motion.li 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-2 text-sm"
            >
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{strength}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Weaknesses */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-amber-500" />
          <h4 className="font-semibold text-sm uppercase tracking-wide">Areas to Improve</h4>
        </div>
        <ul className="space-y-1.5">
          {analysis.weaknesses.map((weakness, i) => (
            <motion.li 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-start gap-2 text-sm"
            >
              <span className="text-amber-500 mt-0.5">→</span>
              <span>{weakness}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>

    {/* Trends */}
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-blue-500" />
        <h4 className="font-semibold text-sm uppercase tracking-wide">Current Form</h4>
      </div>
      <p className="text-sm text-muted-foreground">{analysis.trends}</p>
    </div>

    {/* Rivalry Insights */}
    {analysis.rivalryInsights && (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-purple-500" />
          <h4 className="font-semibold text-sm uppercase tracking-wide">Rivalry Insights</h4>
        </div>
        <p className="text-sm text-muted-foreground">{analysis.rivalryInsights}</p>
      </div>
    )}
  </motion.div>
);

const ErrorState = ({ error, onRetry, isAdmin }: { error: Error; onRetry: () => void; isAdmin: boolean }) => (
  <div className="p-4 flex flex-col items-center justify-center text-center space-y-3">
    <AlertCircle className="h-8 w-8 text-destructive/60" />
    <div>
      <p className="text-sm font-medium text-destructive">Failed to generate analysis</p>
      <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
    </div>
    {isAdmin ? (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try Again
      </Button>
    ) : (
      <p className="text-xs text-muted-foreground">
        Please contact an admin to refresh the analysis.
      </p>
    )}
  </div>
);

const TeamAIAnalysis: React.FC<TeamAIAnalysisProps> = ({ teamId, teamName }) => {
  const { data: analysis, isLoading, error, refetch, isRefetching } = useTeamAIAnalysis(teamId);
  const { isAdminAccessGranted } = useAdminAccess();

  return (
    <section id="ai-analysis">
      <CollapsibleSection
        title="AI Team Analysis"
        icon={Sparkles}
        iconColor="text-purple-500"
        defaultOpen={true}
      >
        {isLoading ? (
          <AnalysisSkeleton />
        ) : error ? (
          <ErrorState error={error as Error} onRetry={() => refetch()} isAdmin={isAdminAccessGranted} />
        ) : analysis ? (
          <AnalysisContent 
            analysis={analysis} 
            onRefresh={() => refetch()}
            isRefetching={isRefetching}
            isAdmin={isAdminAccessGranted}
          />
        ) : null}
      </CollapsibleSection>
    </section>
  );
};

export default TeamAIAnalysis;
