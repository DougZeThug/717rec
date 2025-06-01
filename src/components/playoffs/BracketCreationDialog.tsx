
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Team } from "@/types";
import BracketForm, { BracketFormValues } from "./BracketForm";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BracketValidationService } from "@/services/brackets/validation/BracketValidationService";
import { BracketFormData } from "@/services/brackets/types/BracketFormData";
import { useChallongeAdmin } from "@/hooks/useChallongeAdmin";
import { BracketCreationErrorBoundary } from "./BracketCreationErrorBoundary";
import { useQueryClient } from "@tanstack/react-query";
import type { BracketRecord } from "@/types/bracketRecord";

// Format mapping from UI strings to internal format
const FORMAT_MAP = {
  "Single Elimination": "singleElim",
  "Double Elimination": "doubleElim",
} as const;

interface BracketCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  divisions: { id: string; name: string }[] | undefined;
  teams: Team[] | undefined;
  onBracketCreated?: (bracket: BracketRecord) => void;
}

const BracketCreationDialog: React.FC<BracketCreationDialogProps> = ({
  open,
  onOpenChange,
  divisions,
  teams,
  onBracketCreated
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [teamsValid, setTeamsValid] = React.useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { createBracket } = useChallongeAdmin();
  
  // Enhanced form submission with E2E flow - EXPLICIT SUBMISSION ONLY
  const handleSubmit = async (data: BracketFormValues) => {
    console.log("BracketCreationDialog: Explicit form submission initiated", data);
    
    try {
      setIsSubmitting(true);
      setDialogError(null);
      
      // Enhanced validation
      const validation = BracketValidationService.validateFormData(data as BracketFormData);
      if (!validation.isValid) {
        const validationErrors = validation.errors.join(", ");
        console.error("BracketCreationDialog: Validation failed", validation.errors);
        setDialogError(`Validation failed: ${validationErrors}`);
        toast({
          title: "Validation Error",
          description: validationErrors,
          variant: "destructive"
        });
        return;
      }
      
      // Validate teams are available
      if (!teams || teams.length === 0) {
        const error = "No teams available for bracket creation";
        setDialogError(error);
        toast({
          title: "Teams Required",
          description: "Please add teams to your divisions before creating a bracket.",
          variant: "destructive"
        });
        return;
      }
      
      // Map UI format to internal format
      const internalFormat = FORMAT_MAP[data.format as keyof typeof FORMAT_MAP];
      if (!internalFormat) {
        const error = `Invalid tournament format: ${data.format}`;
        setDialogError(error);
        toast({
          title: "Format Error",
          description: error,
          variant: "destructive"
        });
        return;
      }
      
      const selectedTeams = teams.filter(team => data.teams.includes(team.id));
      
      if (selectedTeams.length < 2) {
        const error = "At least 2 teams are required for a bracket";
        setDialogError(error);
        toast({
          title: "Insufficient Teams",
          description: error,
          variant: "destructive"
        });
        return;
      }

      if (selectedTeams.length > 64) {
        const error = "Maximum 64 teams allowed per bracket";
        setDialogError(error);
        toast({
          title: "Too Many Teams",
          description: error,
          variant: "destructive"
        });
        return;
      }
      
      console.log("BracketCreationDialog: Creating bracket via E2E flow:", {
        name: data.title,
        format: internalFormat,
        teamsCount: selectedTeams.length,
        divisionId: data.divisionId
      });
      
      // Create tournament via E2E flow
      const bracket = await createBracket.mutateAsync({
        name: data.title,
        format: internalFormat,
        teams: selectedTeams.map((team, index) => ({ 
          id: team.id, 
          name: team.name,
          seed: team.seed || (index + 1)
        })),
        divisionId: data.divisionId
      });
      
      toast({
        title: "Bracket Created Successfully",
        description: `Tournament "${data.title}" has been created with ${selectedTeams.length} teams and is ready for matches.`,
      });
      
      // Close dialog first
      onOpenChange(false);
      
      // Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['brackets'] });
      await queryClient.invalidateQueries({ queryKey: ['playoff-data'] });
      
      // Navigate to the created bracket
      navigate(`/playoffs?division=${bracket.division_id}&bracket=${bracket.id}`);
      
      // Call parent callback if provided
      if (onBracketCreated) {
        onBracketCreated(bracket);
      }
      
    } catch (error: any) {
      console.error("BracketCreationDialog: E2E bracket creation failed:", error);
      
      let errorMessage = "Failed to create bracket. Check your internet or try again.";
      
      // Categorize errors for better user experience
      if (error?.message) {
        if (error.message.includes("Challonge")) {
          errorMessage = `Challonge API Error: ${error.message}`;
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Network Error: Please check your internet connection and try again";
        } else if (error.message.includes("validation")) {
          errorMessage = `Validation Error: ${error.message}`;
        } else if (error.message.includes("database")) {
          errorMessage = `Database Error: ${error.message}`;
        } else if (error.message.includes("participant")) {
          errorMessage = `Team Setup Error: ${error.message}`;
        } else if (error.message.includes("Maximum") && error.message.includes("teams")) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      setDialogError(errorMessage);
      
      toast({
        title: "Bracket Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced error boundary reset
  const handleErrorReset = () => {
    console.log("BracketCreationDialog: Resetting after error");
    setIsSubmitting(false);
    setDialogError(null);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Playoff Bracket</DialogTitle>
        </DialogHeader>
        
        {dialogError && (
          <div className="mb-4 p-4 border border-destructive rounded-lg bg-destructive/10">
            <p className="text-sm text-destructive font-medium">Error Details:</p>
            <p className="text-sm text-destructive mt-1">{dialogError}</p>
          </div>
        )}
        
        <BracketCreationErrorBoundary onReset={handleErrorReset}>
          <BracketForm
            divisions={divisions}
            teams={teams}
            isSubmitting={isSubmitting}
            teamsValid={teamsValid}
            onTeamsValidityChange={setTeamsValid}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </BracketCreationErrorBoundary>
      </DialogContent>
    </Dialog>
  );
};

export default BracketCreationDialog;
