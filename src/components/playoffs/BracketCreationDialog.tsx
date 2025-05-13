import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Team } from "@/types";
import { BracketService } from "@/services/BracketService";
import { ChallongeService } from "@/services/ChallongeService";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import BracketForm, { BracketFormValues } from "./BracketForm";

interface BracketCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  divisions: { id: string; name: string }[];
  teams: Team[];
  onBracketCreated: () => void;
}

const BracketCreationDialog: React.FC<BracketCreationDialogProps> = ({
  open,
  onOpenChange,
  divisions,
  teams,
  onBracketCreated
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { isAdminAccessGranted } = useAdminAccess();
  
  const handleSubmit = async (data: BracketFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Ensure user has admin access
      if (!isAdminAccessGranted) {
        toast({
          title: "Access Denied",
          description: "Only admins can create brackets.",
          variant: "destructive",
        });
        return;
      }

      let challongeTournamentId = null;
      let challongeTournamentUrl = null;
      
      // If using Challonge, create tournament there first
      if (data.useChallonge) {
        try {
          const challongeTournament = await ChallongeService.createTournament({
            name: data.title,
            tournamentType: data.format === "Double Elimination" ? "double elimination" : "single elimination",
            description: `Division: ${divisions.find(d => d.id === data.divisionId)?.name}`,
          });
          
          challongeTournamentId = challongeTournament.id.toString();
          challongeTournamentUrl = challongeTournament.url;
          
          // Add teams to the Challonge tournament
          const selectedTeams = teams.filter(team => data.teams.includes(team.id));
          await ChallongeService.addTeamsToTournament(challongeTournamentId, selectedTeams);
          
          toast({
            title: "Challonge Tournament Created",
            description: `Tournament "${data.title}" created on Challonge.`,
          });
        } catch (error) {
          console.error("Error creating Challonge tournament:", error);
          toast({
            title: "Challonge Error",
            description: "Failed to create tournament on Challonge. Creating local bracket only.",
            variant: "destructive",
          });
        }
      }
      
      // Create bracket using the BracketService
      await BracketService.createBracket({
        title: data.title,
        divisionId: data.divisionId,
        format: data.format as "Single Elimination" | "Double Elimination",
        teamIds: data.teams,
        challongeTournamentId,
        challongeTournamentUrl,
      });
      
      toast({
        title: "Bracket Created",
        description: `${data.title} bracket has been successfully created.`,
      });
      
      // Close dialog
      onOpenChange(false);
      
      // Trigger refresh of brackets
      onBracketCreated();
    } catch (error) {
      console.error("Error creating bracket:", error);
      toast({
        title: "Creation Failed",
        description: "There was an error creating the bracket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Playoff Bracket</DialogTitle>
          <DialogDescription>
            Create a new playoff bracket and select the teams to participate.
          </DialogDescription>
        </DialogHeader>
        
        <BracketForm
          divisions={divisions}
          teams={teams}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
};

export default BracketCreationDialog;
