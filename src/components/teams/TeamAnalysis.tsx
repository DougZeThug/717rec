import { motion } from 'framer-motion';
import { AlertCircle, Edit, FileText, Swords, Target, TrendingUp, Trophy } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { TeamAnalysis as TeamAnalysisType, useTeamAnalysis } from '@/hooks/useTeamAnalysis';

import { TeamAnalysisEditForm } from './TeamAnalysisEditForm';

interface TeamAnalysisProps {
  teamId: string;
  teamName: string;
}

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
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  </div>
);

const AnalysisContent = ({
  analysis,
  onEdit,
  isAdmin,
}: {
  analysis: TeamAnalysisType;
  onEdit: () => void;
  isAdmin: boolean;
}) => (
  <motion.div
    className="space-y-4 p-4"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    {/* Header with edit button */}
    {isAdmin && (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs h-7">
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
      </div>
    )}

    {/* Overall Assessment */}
    {analysis.overall && (
      <div className="bg-gradient-to-br from-primary/5 to-accent/10 rounded-lg p-4 border border-primary/20">
        <p className="text-sm leading-relaxed">{analysis.overall}</p>
      </div>
    )}

    {/* Strengths and Weaknesses Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Strengths */}
      {analysis.strengths && analysis.strengths.length > 0 && (
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
      )}

      {/* Weaknesses */}
      {analysis.weaknesses && analysis.weaknesses.length > 0 && (
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
      )}
    </div>

    {/* Trends */}
    {analysis.trends && (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <h4 className="font-semibold text-sm uppercase tracking-wide">Current Form</h4>
        </div>
        <p className="text-sm text-muted-foreground">{analysis.trends}</p>
      </div>
    )}

    {/* Rivalry Insights */}
    {analysis.rivalry_insights && (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-purple-500" />
          <h4 className="font-semibold text-sm uppercase tracking-wide">Rivalry Insights</h4>
        </div>
        <p className="text-sm text-muted-foreground">{analysis.rivalry_insights}</p>
      </div>
    )}
  </motion.div>
);

const EmptyState = ({ onEdit, isAdmin }: { onEdit: () => void; isAdmin: boolean }) => (
  <div className="p-6 flex flex-col items-center justify-center text-center space-y-3">
    <FileText className="h-10 w-10 text-muted-foreground/40" />
    <div>
      <p className="text-sm text-muted-foreground">No analysis available for this team yet.</p>
    </div>
    {isAdmin && (
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Edit className="h-4 w-4 mr-1" /> Add Analysis
      </Button>
    )}
  </div>
);

const ErrorState = ({ error }: { error: Error }) => (
  <div className="p-4 flex flex-col items-center justify-center text-center space-y-3">
    <AlertCircle className="h-8 w-8 text-destructive/60" />
    <div>
      <p className="text-sm font-medium text-destructive">Failed to load analysis</p>
      <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
    </div>
  </div>
);

const TeamAnalysisComponent: React.FC<TeamAnalysisProps> = ({ teamId, teamName }) => {
  const { analysis, isLoading, error, saveAnalysis, isSaving } = useTeamAnalysis(teamId);
  const { isAdminAccessGranted } = useAdminAccess();
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (input: Parameters<typeof saveAnalysis>[0]) => {
    saveAnalysis(input, {
      onSuccess: () => setIsEditing(false),
    });
  };

  const hasContent =
    analysis &&
    (analysis.overall ||
      (analysis.strengths && analysis.strengths.length > 0) ||
      (analysis.weaknesses && analysis.weaknesses.length > 0) ||
      analysis.trends ||
      analysis.rivalry_insights);

  // Hide the entire section for non-admins when there's no content
  if (!isLoading && !error && !hasContent && !isAdminAccessGranted) {
    return null;
  }

  return (
    <section id="team-analysis">
      <CollapsibleSection
        title="Team Analysis"
        icon={FileText}
        iconColor="text-purple-500"
        defaultOpen={true}
      >
        {isLoading ? (
          <AnalysisSkeleton />
        ) : error ? (
          <ErrorState error={error as Error} />
        ) : isEditing ? (
          <TeamAnalysisEditForm
            analysis={analysis}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
            isSaving={isSaving}
          />
        ) : hasContent ? (
          <AnalysisContent
            analysis={analysis!}
            onEdit={() => setIsEditing(true)}
            isAdmin={isAdminAccessGranted}
          />
        ) : (
          <EmptyState onEdit={() => setIsEditing(true)} isAdmin={isAdminAccessGranted} />
        )}
      </CollapsibleSection>
    </section>
  );
};

export default TeamAnalysisComponent;
