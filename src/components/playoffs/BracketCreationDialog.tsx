
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Team } from "@/types";
import BracketForm from "./BracketForm";
import { BracketFormValues } from "./form/BracketFormSchema";
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
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { createBracket } = useChallongeAdmin();
  
  // EXPLICIT form submission handler - ONLY triggered by form submit button
  const handleSubmit = async (data: BracketFormValues) => {
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setDialogError(null);
      
      console.log("BracketCreationDialog: Starting bracket creation with data:", data);
      
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
      
      // Create tournament via E2E flow
      console.log("BracketCreationDialog: Creating bracket via Challonge...");
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
      
      console.log("BracketCreationDialog: Bracket created successfully:", bracket);
      
      // Show initial success message
      toast({
        title: "Bracket Created Successfully",
        description: `Tournament "${data.title}" has been created with ${selectedTeams.length} teams.`,
      });
      
      // Close dialog first
      onOpenChange(false);
      
      // Start data refresh process
      console.log("BracketCreationDialog: Starting data refresh...");
      setIsRefreshing(true);
      
      try {
        // Force complete data refresh
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['brackets'] }),
          queryClient.invalidateQueries({ queryKey: ['playoff-data'] }),
          queryClient.invalidateQueries({ queryKey: ['playoff-matches'] }),
          queryClient.refetchQueries({ queryKey: ['brackets'] }),
          queryClient.refetchQueries({ queryKey: ['playoff-data'] })
        ]);
        
        console.log("BracketCreationDialog: Data refresh completed");
        
        // Show refresh completion message
        toast({
          title: "Data Refreshed",
          description: "Bracket data has been updated. Your new bracket should now be visible.",
        });
        
        // Navigate to the created bracket after a short delay to ensure data is loaded
        setTimeout(() => {
          navigate(`/playoffs?division=${bracket.division_id}&bracket=${bracket.id}`);
        }, 1000);
        
      } catch (refreshError) {
        console.error("BracketCreationDialog: Data refresh failed:", refreshError);
        toast({
          title: "Refresh Warning",
          description: "Bracket created but data refresh failed. Please reload the page to see your new bracket.",
          variant: "destructive"
        });
      } finally {
        setIsRefreshing(false);
      }
      
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

  // Team validity change handler - ONLY updates state, NEVER submits
  const handleTeamsValidityChange = React.useCallback((isValid: boolean) => {
    setTeamsValid(isValid);
  }, []);

  // Enhanced error boundary reset
  const handleErrorReset = () => {
    setIsSubmitting(false);
    setDialogError(null);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Playoff Bracket</DialogTitle>
        </DialogHeader>
        
        {/* Show refreshing indicator */}
        {isRefreshing && (
          <div className="mb-4 p-4 border border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Refreshing bracket data...
              </p>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Your new bracket will appear in the division list once this completes.
            </p>
          </div>
        )}
        
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
            onTeamsValidityChange={handleTeamsValidityChange}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </BracketCreationErrorBoundary>
      </DialogContent>
    </Dialog>
  );
};

export default BracketCreationDialog;
