import React from 'react';

import BracketCreationDialog from '@/components/playoffs/BracketCreationDialog';
import DeleteBracketDialog from '@/components/playoffs/DeleteBracketDialog';
import TeamDivisionDialog from '@/components/playoffs/TeamDivisionDialog';
import { Division, Team } from '@/types';

interface PlayoffDialogsProps {
  // Team division dialog
  teamDialogOpen: boolean;
  setTeamDialogOpen: (open: boolean) => void;
  teamsByDivision: Record<string, Team[]>;
  availableDivisions: string[];
  teamsLoading: boolean;
  onTeamDivisionChange: (teamId: string, divisionName: string) => Promise<void>;

  // Bracket creation dialog
  bracketDialogOpen: boolean;
  setBracketDialogOpen: (open: boolean) => void;
  divisions: Division[];
  teams: Team[];
  onBracketCreated: () => void;
  seasonId?: string | null;

  // Delete bracket dialog
  deletingBracket: { id: string; name: string } | null;
  setDeletingBracket: (value: { id: string; name: string } | null) => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

const PlayoffDialogs: React.FC<PlayoffDialogsProps> = ({
  // Team division dialog props
  teamDialogOpen,
  setTeamDialogOpen,
  teamsByDivision,
  availableDivisions,
  teamsLoading,
  onTeamDivisionChange,

  // Bracket creation dialog props
  bracketDialogOpen,
  setBracketDialogOpen,
  divisions,
  teams,
  onBracketCreated,
  seasonId,

  // Delete bracket dialog props
  deletingBracket,
  setDeletingBracket,
  onConfirmDelete,
  isDeleting,
}) => {
  return (
    <>
      {/* Team Division Dialog */}
      <TeamDivisionDialog
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        teamsByDivision={teamsByDivision}
        availableDivisions={availableDivisions}
        teamsLoading={teamsLoading}
        onTeamDivisionChange={onTeamDivisionChange}
      />

      {/* Bracket Creation Dialog */}
      <BracketCreationDialog
        open={bracketDialogOpen}
        onOpenChange={setBracketDialogOpen}
        divisions={divisions || []}
        teams={teams || []}
        onBracketCreated={onBracketCreated}
        seasonId={seasonId}
      />

      {/* Delete Bracket Confirmation Dialog */}
      <DeleteBracketDialog
        open={Boolean(deletingBracket)}
        onOpenChange={(open) => {
          if (!open) setDeletingBracket(null);
        }}
        bracketName={deletingBracket?.name || ''}
        onConfirm={onConfirmDelete}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default PlayoffDialogs;
