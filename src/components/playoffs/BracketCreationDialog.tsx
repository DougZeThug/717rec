
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Team } from "@/types";
import BracketForm, { BracketFormValues } from "./BracketForm";
import { BracketService } from "@/services/BracketService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ParticipantOperationError } from "@/services/brackets/adapter/types/ParticipantTypes";
import { BracketFormat } from "@/constants/brackets";
import { validateTeamIds, validateDivisionId } from "@/utils/validation";

interface BracketCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  divisions: { id: string; name: string }[] | undefined;
  teams: Team[] | undefined;
  onBracketCreated?: (bracketId: string) => void;
}

const BracketCreationDialog: React.FC<BracketCreationDialogProps> = ({
  open,
  onOpenChange,
  divisions,
  teams,
  onBracketCreated
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Handle form submission
  const handleSubmit = async (data: BracketFormValues) => {
    try {
      setIsSubmitting(true);
      console.log("BracketCreationDialog: Creating bracket with data:", {
        ...data,
        teamsDetailed: data.teams.map((id, index) => ({ index, id, type: typeof id, isEmpty: id === '' }))
      });
      
      // Pre-submission validation
      const divisionValidation = validateDivisionId(data.divisionId);
      if (!divisionValidation.isValid) {
        console.error('Pre-submission division validation failed:', divisionValidation.error);
        toast({
          title: "Invalid Division",
          description: divisionValidation.error,
          variant: "destructive"
        });
        return;
      }
      
      const teamValidation = validateTeamIds(data.teams);
      if (!teamValidation.isValid) {
        console.error('Pre-submission team validation failed:', teamValidation.errors);
        toast({
          title: "Invalid Teams",
          description: teamValidation.errors.join(', '),
          variant: "destructive"
        });
        return;
      }
      
      // Legacy validation checks
      if (!data.title) {
        toast({
          title: "Missing Title",
          description: "Please provide a title for the bracket",
          variant: "destructive"
        });
        console.warn("Missing title in form submission");
        return;
      }
      
      if (!data.divisionId) {
        toast({
          title: "Missing Division",
          description: "Please select a division for the bracket",
          variant: "destructive"
        });
        console.warn("Missing divisionId in form submission");
        return;
      }
      
      if (!data.teams.length) {
        toast({
          title: "No Teams Selected",
          description: "Please select teams for the bracket",
          variant: "destructive"
        });
        console.warn("No teams selected in form submission");
        return;
      }
      
      console.log('All pre-submission validations passed, calling BracketService...');
      
      const bracketId = await BracketService.createBracket(
        data.format as BracketFormat,
        data.title,
        data.divisionId,
        data.teams
      );
      
      console.log('Bracket created successfully with ID:', bracketId);
      
      toast({
        title: "Bracket Created",
        description: `The ${data.format} bracket has been created successfully.`
      });
      
      if (onBracketCreated) {
        onBracketCreated(bracketId);
      }
      
      // Close dialog and navigate to new bracket
      onOpenChange(false);
      navigate(`/playoffs?bracketId=${bracketId}`);
    } catch (error: any) {
      console.error("BracketCreationDialog: Error creating bracket:", error);
      console.error("Error stack:", error?.stack);
      
      let errorMessage = "Unknown error occurred";
      let errorDetails = undefined;
      
      if (error instanceof ParticipantOperationError) {
        errorMessage = `Participant error: ${error.message}`;
        errorDetails = error.details;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: `Bracket creation failed – ${errorMessage}`,
        variant: "destructive"
      });
      
      // Add additional toast with details if they exist
      if (errorDetails) {
        console.error("Additional error details:", errorDetails);
        toast({
          description: `Debug info: ${JSON.stringify(errorDetails)}`,
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Playoff Bracket</DialogTitle>
        </DialogHeader>
        <BracketForm
          divisions={divisions}
          teams={teams}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default BracketCreationDialog;
