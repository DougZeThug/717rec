
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
  
  const handleSubmit = async (data: BracketFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Create bracket using the BracketService
      await BracketService.createBracket({
        title: data.title,
        divisionId: data.divisionId,
        format: data.format as "Single Elimination" | "Double Elimination",
        teamIds: data.teams,
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
