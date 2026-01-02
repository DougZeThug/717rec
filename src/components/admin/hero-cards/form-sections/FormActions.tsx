import React from "react";
import { Button } from "@/components/ui/button";
import { X, Plus, Save, Loader2 } from "lucide-react";

interface FormActionsProps {
  isSubmitting: boolean;
  isEditing: boolean;
  onCancel: () => void;
}

export const FormActions: React.FC<FormActionsProps> = ({
  isSubmitting,
  isEditing,
  onCancel,
}) => {
  return (
    <div className="flex justify-end gap-3 pt-6 border-t mt-6">
      <Button type="button" variant="outline" onClick={onCancel}>
        <X className="h-4 w-4 mr-2" />
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : isEditing ? (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Create Card
          </>
        )}
      </Button>
    </div>
  );
};
