import { Loader2 } from 'lucide-react';
import React, { useState } from 'react';

import EditMatchParticipantsDialog from '@/components/playoffs/admin/EditMatchParticipantsDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePlayoffTeams } from '@/hooks/playoffs/usePlayoffTeams';

import { ByeMatchEditor } from './ByeMatchEditor';
import { RegularMatchEditor } from './RegularMatchEditor';
import { useMatchEditorState } from './useMatchEditorState';

interface BracketsManagerMatchEditorProps {
  matchId: number | null;
  bracketId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const BracketsManagerMatchEditorComponent: React.FC<BracketsManagerMatchEditorProps> = ({
  matchId,
  bracketId,
  isOpen,
  onClose,
  onSaved,
}) => {
  const {
    matchData,
    isLoading,
    error,
    opponent1Score,
    setOpponent1Score,
    opponent2Score,
    setOpponent2Score,
    isSaving,
    isTogglingStatus,
    byeEligible,
    handleSave,
    handleToggleByeStatus,
  } = useMatchEditorState({ matchId, onClose, onSaved });

  const { data: teams } = usePlayoffTeams();
  const [isEditTeamsOpen, setIsEditTeamsOpen] = useState(false);

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="size-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !matchData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-destructive">Failed to load match data. Please try again.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Detect BYE match
  const isBye = !matchData.opponent1 || !matchData.opponent2;
  const byeWinner = matchData.opponent1 || matchData.opponent2;

  // A match is safe to reassign teams on only if it hasn't been played yet
  const canEditTeams =
    matchData.status !== 4 &&
    matchData.opponent1?.result !== 'win' &&
    matchData.opponent1?.result !== 'loss' &&
    matchData.opponent2?.result !== 'win' &&
    matchData.opponent2?.result !== 'loss';

  const editTeamsDialog =
    matchId !== null ? (
      <EditMatchParticipantsDialog
        open={isEditTeamsOpen}
        onOpenChange={setIsEditTeamsOpen}
        bracketId={bracketId}
        matchId={matchId}
        currentTeam1Id={matchData.opponent1?.team_id ?? null}
        currentTeam2Id={matchData.opponent2?.team_id ?? null}
        teams={teams ?? []}
      />
    ) : null;

  if (isBye && byeWinner) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <ByeMatchEditor
            byeWinner={byeWinner}
            hasOpponent1={!!matchData.opponent1}
            opponent1Score={opponent1Score}
            opponent2Score={opponent2Score}
            setOpponent1Score={setOpponent1Score}
            setOpponent2Score={setOpponent2Score}
            byeEligible={byeEligible}
            isSaving={isSaving}
            isTogglingStatus={isTogglingStatus}
            onSave={handleSave}
            onClose={onClose}
            onToggleByeStatus={handleToggleByeStatus}
            status={matchData.status}
          />
        </Dialog>
        {editTeamsDialog}
      </>
    );
  }

  // Regular match
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <RegularMatchEditor
          opponent1Name={matchData.opponent1?.name || 'Team 1'}
          opponent2Name={matchData.opponent2?.name || 'Team 2'}
          opponent1Score={opponent1Score}
          opponent2Score={opponent2Score}
          setOpponent1Score={setOpponent1Score}
          setOpponent2Score={setOpponent2Score}
          games={matchData.games}
          isSaving={isSaving}
          onSave={handleSave}
          onClose={onClose}
          onEditTeams={() => setIsEditTeamsOpen(true)}
          canEditTeams={canEditTeams}
          status={matchData.status}
        />
      </Dialog>
      {editTeamsDialog}
    </>
  );
};

export const BracketsManagerMatchEditor = React.memo(BracketsManagerMatchEditorComponent);
