
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Team } from "@/types";
import BracketForm, { BracketFormValues } from "./BracketForm";
import { BracketService } from "@/services/BracketService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ParticipantOperationError } from "@/services/brackets/adapter/types/ParticipantTypes";
import { BracketFormat } from "@/constants/brackets";
import { validateBracketFormData, sanitizeBracketFormData } from "@/utils/bracketValidation";
import { isValidUUID } from "@/utils/validation";

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
  
  // Handle form submission with enhanced validation
  const handleSubmit = async (data: BracketFormValues) => {
    try {
      setIsSubmitting(true);
      console.log("BracketCreationDialog: Starting bracket creation with raw data:", data);
      
      // Sanitize the form data first
      const sanitizedData = sanitizeBracketFormData(data);
      console.log("BracketCreationDialog: Sanitized data:", sanitizedData);
      
      // Comprehensive validation before service call
      const validation = validateBracketFormData(sanitizedData);
      if (!validation.isValid) {
        console.error('Pre-submission validation failed:', validation.errors);
        toast({
          title: "Validation Error",
          description: validation.errors[0],
          variant: "destructive"
        });
        return;
      }
      
      // Additional safety checks for UUID format
      if (!isValidUUID(sanitizedData.divisionId)) {
        console.error('Division ID is not a valid UUID:', sanitizedData.divisionId);
        toast({
          title: "Invalid Division",
          description: "The selected division is invalid. Please refresh and try again.",
          variant: "destructive"
        });
        return;
      }
      
      // Check all team IDs are valid UUIDs
      const invalidTeamIds = sanitizedData.teams.filter(id => !isValidUUID(id));
      if (invalidTeamIds.length > 0) {
        console.error('Found invalid team IDs:', invalidTeamIds);
        toast({
          title: "Invalid Team Selection",
          description: "Some selected teams have invalid data. Please refresh and reselect teams.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('All pre-submission validations passed, calling BracketService...');
      
      const bracketId = await BracketService.createBracket(
        sanitizedData.format as BracketFormat,
        sanitizedData.title,
        sanitizedData.divisionId,
        sanitizedData.teams
      );
      
      console.log('Bracket created successfully with ID:', bracketId);
      
      toast({
        title: "Bracket Created",
        description: `The ${sanitizedData.format} bracket has been created successfully.`
      });
      
      if (onBracketCreated) {
        onBracketCreated(bracketId);
      }
      
      // Close dialog and navigate to new bracket
      onOpenChange(false);
      navigate(`/playoffs?bracketId=${bracketId}`);
      
    } catch (error: any) {
      console.error("BracketCreationDialog: Error creating bracket:", error);
      
      let errorMessage = "An unexpected error occurred";
      let errorTitle = "Bracket Creation Failed";
      
      if (error instanceof ParticipantOperationError) {
        errorTitle = "Team Assignment Error";
        errorMessage = error.message;
      } else if (error instanceof Error) {
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
        } else {
          errorMessage = error.message;
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
