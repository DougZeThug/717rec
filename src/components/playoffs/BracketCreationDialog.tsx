
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Team } from "@/types";
import BracketForm, { BracketFormValues } from "./BracketForm";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BracketFormat } from "@/constants/brackets";
import { SimpleBracketCreationService } from "@/services/brackets/services/SimpleBracketCreationService";
import { BracketValidationService } from "@/services/brackets/validation/BracketValidationService";
import { BracketFormData } from "@/services/brackets/types/BracketFormData";

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
  
  // Handle form submission with enhanced validation and proper typing
  const handleSubmit = async (data: BracketFormValues) => {
    try {
      setIsSubmitting(true);
      console.log("BracketCreationDialog: Starting bracket creation with SimpleBracketCreationService");
      
      // Convert to BracketFormData for validation
      const bracketFormData: BracketFormData = {
        title: data.title,
        divisionId: data.divisionId || '',
        format: data.format,
        teams: data.teams
      };
      
      // Final validation before submission
      const validation = BracketValidationService.validateForSubmission(bracketFormData);
      if (!validation.isValid) {
        console.error("BracketCreationDialog: Validation failed:", validation.errors);
        toast({
          title: "Validation Error",
          description: validation.errors[0],
          variant: "destructive"
        });
        return;
      }
      
      // Type assertion for divisionId since validation passed
      const divisionId = data.divisionId as string;
      
      console.log('BracketCreationDialog: Creating bracket with validated data using SimpleBracketCreationService');
      
      const bracketId = await SimpleBracketCreationService.createBracket(
        data.format as BracketFormat,
        data.title,
        divisionId,
        data.teams
      );
      
      console.log('BracketCreationDialog: Bracket created successfully with ID:', bracketId);
      
      toast({
        title: "Bracket Created",
        description: `The ${data.format} bracket has been created successfully.`
      });
      
      if (onBracketCreated) {
        onBracketCreated(bracketId);
      }
      
      onOpenChange(false);
      navigate(`/playoffs?bracketId=${bracketId}`);
      
    } catch (error: any) {
      console.error("BracketCreationDialog: Error creating bracket with SimpleBracketCreationService:", error);
      
      let errorMessage = "An unexpected error occurred";
      let errorTitle = "Bracket Creation Failed";
      
      if (error.message.includes('Teams not found')) {
        errorTitle = "Teams Not Found";
        errorMessage = "Some selected teams no longer exist. Please refresh and try again.";
      } else if (error.message.includes('Division not found')) {
        errorTitle = "Division Not Found";
        errorMessage = "The selected division no longer exists. Please refresh and try again.";
      } else if (error.message.includes('validation failed')) {
        errorTitle = "Data Validation Error";
        errorMessage = "Invalid data detected. Please check your selections and try again.";
      } else {
        errorMessage = error.message;
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
