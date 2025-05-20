
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Team } from "@/types";
import BracketForm, { BracketFormValues } from "./BracketForm";
import { BracketService } from "@/services/BracketService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface BracketCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  divisions: { id: string; name: string }[] | undefined; // Make divisions possibly undefined
  teams: Team[] | undefined; // Make teams possibly undefined
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
      console.log("Creating bracket with data:", data);
      
      // Log validation data
      if (!data.title) console.warn("Missing title in form submission");
      if (!data.divisionId) console.warn("Missing divisionId in form submission");
      if (!data.teams.length) console.warn("No teams selected in form submission");
      
      const bracketId = await BracketService.createBracket(
        data.title,
        data.format,
        data.divisionId,
        data.teams
      );
      
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
    } catch (error) {
      console.error("Error creating bracket:", error);
      toast({
        title: "Error",
        description: `Bracket creation failed – ${error?.message || 'unknown error'}`,
        variant: "destructive"
      });
      
      // Add additional toast with details if they exist
      if (error && 'details' in error) {
        toast({
          description: error.details as string,
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
