
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BracketCreationDialog from "@/components/playoffs/BracketCreationDialog";
import TeamDivisionDialog from "@/components/playoffs/TeamDivisionDialog";
import DeleteBracketDialog from "@/components/playoffs/DeleteBracketDialog";
import { MatchScoreEditor, QuickScoreEditor } from "@/components/playoffs/match-score-editor";
import { Division, PlayoffMatch, Team } from "@/types";

interface PlayoffDialogsProps {
  // Team division dialog
  teamDialogOpen: boolean;
  setTeamDialogOpen: (open: boolean) => void;
  teamsByDivision: Record<string, any>;
  availableDivisions: string[];
  teamsLoading: boolean;
  onTeamDivisionChange: (teamId: string, divisionName: string) => Promise<void>;

  // Bracket creation dialog
  bracketDialogOpen: boolean;
  setBracketDialogOpen: (open: boolean) => void;
  divisions: Division[];
  teams: Team[];
  onBracketCreated: () => void;

  // Match score editor - Updated to include refetchBrackets parameter
  editingMatch: PlayoffMatch | null;
  isQuickEdit: boolean;
  onCloseMatchEditor: () => void;
  onSaveMatchScore: (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number,
    refetchBrackets: () => Promise<any>
  ) => Promise<void>;

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

  // Match score editor props
  editingMatch,
  isQuickEdit,
  onCloseMatchEditor,
  onSaveMatchScore,

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
      />

      {/* Match Score Editor Dialog */}
      <Dialog
        open={!!editingMatch}
        onOpenChange={(open) => {
          if (!open) onCloseMatchEditor();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {isQuickEdit ? "Quick Score Update" : "Edit Match Score"}
            </DialogTitle>
            <DialogDescription>
              {isQuickEdit 
                ? "Update the match score quickly" 
                : "Edit match details and game-by-game scores"}
            </DialogDescription>
          </DialogHeader>

          {editingMatch && isQuickEdit && (
            <QuickScoreEditor
              match={editingMatch}
              teams={teams || []}
              onSave={onSaveMatchScore}
              onCancel={onCloseMatchEditor}
            />
          )}

          {editingMatch && !isQuickEdit && (
            <MatchScoreEditor
              match={editingMatch}
              teams={teams || []}
              onSave={onSaveMatchScore}
              onCancel={onCloseMatchEditor}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Bracket Confirmation Dialog */}
      <DeleteBracketDialog
        open={!!deletingBracket}
        onOpenChange={(open) => {
          if (!open) setDeletingBracket(null);
        }}
        bracketName={deletingBracket?.name || ""}
        onConfirm={onConfirmDelete}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default PlayoffDialogs;
