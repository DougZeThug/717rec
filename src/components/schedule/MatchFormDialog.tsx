
import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{match ? "Edit Match" : "Create New Match"}</DialogTitle>
        </DialogHeader>
        <MatchFormRHF 
          match={match}
          teams={teams}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default MatchFormDialog;
