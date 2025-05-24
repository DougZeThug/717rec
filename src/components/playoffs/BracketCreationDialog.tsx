
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Team } from "@/types";
import BracketForm, { BracketFormValues } from "./BracketForm";
import { BracketService } from "@/services/BracketService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ParticipantOperationError } from "@/services/brackets/adapter/types/ParticipantTypes";
import { BracketFormat } from "@/constants/brackets";
import { validateTeamIds, validateDivisionId, isValidUUID } from "@/utils/validation";

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
  
  // Handle form submission with comprehensive validation
  const handleSubmit = async (data: BracketFormValues) => {
    try {
      setIsSubmitting(true);
      console.log("BracketCreationDialog: Starting bracket creation with data:", {
        ...data,
        teamsDetailed: data.teams.map((id, index) => ({ 
          index, 
          id, 
          type: typeof id, 
          isEmpty: id === '',
          isUndefined: id === 'undefined',
          isNull: id === 'null',
          isValidUUID: isValidUUID(id)
        }))
      });
      
      // Pre-submission safety checks
      if (!data.title?.trim()) {
        toast({
          title: "Missing Title",
          description: "Please provide a title for the bracket",
          variant: "destructive"
        });
        return;
      }
      
      if (!data.divisionId?.trim()) {
        toast({
          title: "Missing Division",
          description: "Please select a division for the bracket",
          variant: "destructive"
        });
        return;
      }
      
      if (!data.teams || data.teams.length === 0) {
        toast({
          title: "No Teams Selected",
          description: "Please select teams for the bracket",
          variant: "destructive"
        });
        return;
      }
      
      // Enhanced validation before service call
      const divisionValidation = validateDivisionId(data.divisionId);
      if (!divisionValidation.isValid) {
        console.error('Pre-submission division validation failed:', divisionValidation.error);
        toast({
          title: "Invalid Division",
          description: "The selected division is invalid. Please refresh and try again.",
          variant: "destructive"
        });
        return;
      }
      
      const teamValidation = validateTeamIds(data.teams);
      if (!teamValidation.isValid) {
        console.error('Pre-submission team validation failed:', teamValidation.errors);
        toast({
          title: "Invalid Teams",
          description: "One or more selected teams are invalid. Please refresh and try again.",
          variant: "destructive"
        });
        return;
      }
      
      // Check for any problematic team IDs
      const problematicTeams = data.teams.filter(id => 
        !id || 
        typeof id !== 'string' || 
        id.trim() === '' || 
        id === 'undefined' || 
        id === 'null' ||
        !isValidUUID(id)
      );
      
      if (problematicTeams.length > 0) {
        console.error('Found problematic team IDs:', problematicTeams);
        toast({
          title: "Invalid Team Selection",
          description: "Some selected teams have invalid data. Please refresh and reselect teams.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('All pre-submission validations passed, calling BracketService...');
      
      const bracketId = await BracketService.createBracket(
        data.format as BracketFormat,
        data.title.trim(),
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
      let errorTitle = "Error";
      
      if (error instanceof ParticipantOperationError) {
        errorTitle = "Participant Error";
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide user-friendly messages for common errors
        if (error.message.includes('invalid input syntax for type uuid')) {
          errorTitle = "Data Format Error";
          errorMessage = "Invalid data detected. Please refresh the page and try again.";
        } else if (error.message.includes('Teams not found')) {
          errorTitle = "Teams Not Found";
          errorMessage = "Some selected teams no longer exist. Please refresh and try again.";
        } else if (error.message.includes('Division not found')) {
          errorTitle = "Division Not Found";
          errorMessage = "The selected division no longer exists. Please refresh and try again.";
        } else if (error.message.includes('violates foreign key constraint')) {
          errorTitle = "Data Integrity Error";
          errorMessage = "The selected data is no longer valid. Please refresh and try again.";
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
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
