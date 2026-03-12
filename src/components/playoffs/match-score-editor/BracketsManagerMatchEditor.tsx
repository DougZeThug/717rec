import { Loader2 } from 'lucide-react';
import React from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  bracketId: _bracketId,
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

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
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

  if (isBye && byeWinner) {
    return (
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
        />
      </Dialog>
    );
  }

  // Regular match
  return (
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
      />
    </Dialog>
  );
};

export const BracketsManagerMatchEditor = React.memo(BracketsManagerMatchEditorComponent);
