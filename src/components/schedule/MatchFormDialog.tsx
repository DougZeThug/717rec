
import React from "react";
import { 
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import MatchFormRHF from "./MatchFormRHF";
import { Match, Team } from "@/types";

interface MatchFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  match?: Match;
  teams: Team[];
  onSubmit: (match: Omit<Match, "id">) => void;
}

const MatchFormDialog: React.FC<MatchFormDialogProps> = ({
  isOpen,
  onClose,
  match,
  teams,
  onSubmit
}) => {
  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[550px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{match ? "Edit Match" : "Create New Match"}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <MatchFormRHF 
          match={match}
          teams={teams}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default MatchFormDialog;
