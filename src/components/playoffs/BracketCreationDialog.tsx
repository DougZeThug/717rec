
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Team } from "@/types";
import BracketForm, { BracketFormValues } from "./BracketForm";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BracketValidationService } from "@/services/brackets/validation/BracketValidationService";
import { BracketFormData } from "@/services/brackets/types/BracketFormData";
import { useChallongeAdmin } from "@/hooks/useChallongeAdmin";

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
  const { createBracket } = useChallongeAdmin();
  
  // Handle form submission with Challonge integration
  const handleSubmit = async (data: BracketFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Validate the form data
      const validation = BracketValidationService.validateFormData(data as BracketFormData);
      if (!validation.isValid) {
        toast({
          title: "Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive"
        });
        return;
      }
      
      // Map UI format to internal format
      const internalFormat = FORMAT_MAP[data.format as keyof typeof FORMAT_MAP];
      const selectedTeams = (teams || []).filter(team => data.teams.includes(team.id));
      
      // Create tournament via Challonge with all required parameters
      const bracketId = await createBracket.mutateAsync({
        name: data.title,
        format: internalFormat,
        teams: selectedTeams.map(team => ({ id: team.id, name: team.name })),
        divisionId: data.divisionId
      });
      
      toast({
        title: "Bracket Created",
        description: `Tournament "${data.title}" has been created successfully.`,
      });
      
      // Close dialog and notify parent
      onOpenChange(false);
      if (onBracketCreated) {
        onBracketCreated(bracketId);
      }
      
    } catch (error: any) {
      console.error("BracketCreationDialog: Error creating bracket:", error);
      
      toast({
        title: "Bracket Creation Failed",
        description: error?.message || "An unexpected error occurred",
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
