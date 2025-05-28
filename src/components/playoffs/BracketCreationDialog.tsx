
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Team } from "@/types";
import BracketForm, { BracketFormValues } from "./BracketForm";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BracketFormat } from "@/constants/brackets";
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
      console.warn("TODO: wire to ChallongeService in Phase-3");
      
      // Show user that this feature is not yet implemented
      toast({
        title: "Feature Not Available",
        description: "Bracket creation via Challonge not yet implemented.",
        variant: "destructive"
      });
      
      return;
      
    } catch (error: any) {
      console.error("BracketCreationDialog: Error creating bracket:", error);
      
      toast({
        title: "Bracket Creation Failed",
        description: "An unexpected error occurred",
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
