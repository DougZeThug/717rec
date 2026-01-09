import React from "react";
import { 
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import MatchFormRHF from "./MatchFormRHF";
import { Match, Team } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface MatchFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  match?: Match;
  teams: Team[];
  onSubmit: (match: Omit<Match, "id">) => void;
  /** Whether teams are still loading (for lazy-loaded teams) */
  isLoadingTeams?: boolean;
}

const MatchFormDialog: React.FC<MatchFormDialogProps> = ({
  isOpen,
  onClose,
  match,
  teams,
  onSubmit,
  isLoadingTeams = false,
}) => {
  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[550px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{match ? "Edit Match" : "Create New Match"}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        {isLoadingTeams ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/2" />
          </div>
        ) : (
          <MatchFormRHF 
            match={match}
            teams={teams}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default MatchFormDialog;
