
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

interface BracketFormActionsProps {
  isSubmitting: boolean;
  teamsValid?: boolean;
  onCancel: () => void;
  form: UseFormReturn<any>;
}

export const BracketFormActions: React.FC<BracketFormActionsProps> = ({
  isSubmitting,
  teamsValid = false,
  onCancel,
  form
}) => {
  const isFormValid = form.formState.isValid && teamsValid;

  return (
    <div className="flex justify-end space-x-2 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        <X className="w-4 h-4 mr-2" />
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting || !isFormValid}
        className="min-w-[120px]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Create Bracket
          </>
        )}
      </Button>
    </div>
  );
};
