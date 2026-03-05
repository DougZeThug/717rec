import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ClipboardCheck } from 'lucide-react';
import React, { useState } from 'react';

import DeleteMatchDialog from '@/components/schedule/DeleteMatchDialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { reverseTeamStats } from '@/hooks/matches/updates/utils/statReversalUtils';
import { useToast } from '@/hooks/useToast';
import { deleteMatch, upsertTeamSeasonStats } from '@/services/matches/MatchWriteService';
import { errorLog } from '@/utils/logger';

import AdminSectionWrapper from './AdminSectionWrapper';
import ErrorAlert from './mass-score-entry/components/ErrorAlert';
import ScoreEntryToolbar from './mass-score-entry/components/ScoreEntryToolbar';
import SubmitButton from './mass-score-entry/components/SubmitButton';
import { useScoreEntryData } from './mass-score-entry/hooks/useScoreEntryData';
import MatchesTable from './mass-score-entry/MatchesTable';

const MassScoreEntryTool: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    matches,
    loading,
    submitting,
    failedMatches,
    errorMessages,
    brackets,
    filters,
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted,
    handleSubmitAll,
    clearErrors,
    setFilterDate,
    setBracketFilter,
    clearFilters,
  } = useScoreEntryData();

  const handleDeleteConfirm = async () => {
    if (!deleteMatchId) return;
    setIsDeleting(true);
    try {
      const matchToDelete = matches.find((m) => m.id === deleteMatchId);

      if (matchToDelete?.iscompleted && matchToDelete.winner_id && matchToDelete.loser_id) {
        const winnerGameWins = matchToDelete.winner_id === matchToDelete.team1Id
          ? matchToDelete.team1_game_wins || 0
          : matchToDelete.team2_game_wins || 0;
        const loserGameWins = matchToDelete.winner_id === matchToDelete.team1Id
          ? matchToDelete.team2_game_wins || 0
          : matchToDelete.team1_game_wins || 0;

        await reverseTeamStats(matchToDelete.winner_id, matchToDelete.loser_id, winnerGameWins, loserGameWins);
      }

      await deleteMatch(deleteMatchId);
      await upsertTeamSeasonStats();

      toast({ title: 'Match deleted', description: 'The match has been removed successfully.' });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['mass-score-entry'] });
    } catch (error) {
      errorLog('Failed to delete match:', error);
      toast({ title: 'Error', description: 'Failed to delete match. Please try again.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setDeleteMatchId(null);
    }
  };

  // Count edited matches that are valid
  const validEditedMatchesCount = matches.filter((m) => m.isEdited && m.isValid).length;

  // Determine if submission should be disabled
  const disableSubmit = submitting || validEditedMatchesCount === 0;

  // Create filter tags for active filters
  const hasActiveFilters = filters.date || filters.bracketId;
  const filterTags = [];

  if (filters.date) {
    filterTags.push({
      label: 'Date',
      value: filters.date.toLocaleDateString(),
    });
  }

  if (filters.bracketId) {
    const bracket = brackets.find((b) => b.id === filters.bracketId);
    if (bracket) {
      filterTags.push({
        label: 'Bracket',
        value: bracket.title,
      });
    }
  }

  return (
    <AdminSectionWrapper title="Mass Score Entry" icon={ClipboardCheck}>
      <Card className="rounded-xl shadow-md overflow-hidden">
        <CardHeader className="p-3 sm:p-4 bg-muted/20">
          <ScoreEntryToolbar
            filters={filters}
            brackets={brackets}
            onDateChange={setFilterDate}
            onBracketChange={setBracketFilter}
            onClearFilters={clearFilters}
          />

          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-wrap gap-2 mt-3"
            >
              {filterTags.map((tag, index) => (
                <div
                  key={index}
                  className="text-xs px-2 py-1 rounded-full bg-primary/10 flex items-center gap-1"
                >
                  <span className="font-medium">{tag.label}:</span>
                  <span>{tag.value}</span>
                </div>
              ))}
            </motion.div>
          )}
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          <ErrorAlert failedMatches={failedMatches} />

          <div className="w-full">
            <MatchesTable
              matches={matches}
              loading={loading}
              submitting={submitting}
              failedMatches={failedMatches}
              errorMessages={errorMessages}
              onScoreChange={handleScoreChange}
              onGameWinsChange={handleGameWinsChange}
              onMarkCompleted={handleMarkCompleted}
              onClearError={clearErrors}
              onDeleteMatch={(matchId) => setDeleteMatchId(matchId)}
            />
          </div>

          <div className="p-4 flex justify-end">
            <SubmitButton
              onClick={handleSubmitAll}
              submitting={submitting}
              disabled={disableSubmit}
              editedMatchCount={validEditedMatchesCount}
            />
          </div>
        </CardContent>
      </Card>

      <DeleteMatchDialog
        isOpen={!!deleteMatchId}
        onClose={() => setDeleteMatchId(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </AdminSectionWrapper>
  );
};

export default MassScoreEntryTool;
