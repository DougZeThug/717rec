import { Loader2, Plus, Save, X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

interface FormActionsProps {
  isSubmitting: boolean;
  isEditing: boolean;
  /** Blocks the save for something the form already explains on screen. */
  disabled?: boolean;
  onCancel: () => void;
}

export const FormActions: React.FC<FormActionsProps> = ({
  isSubmitting,
  isEditing,
  disabled = false,
  onCancel,
}) => {
  return (
    <div className="flex justify-end gap-3 pt-6 border-t mt-6">
      <Button type="button" variant="outline" onClick={onCancel}>
        <X className="size-4 mr-2" />
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting || disabled}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : isEditing ? (
          <>
            <Save className="size-4 mr-2" />
            Save Changes
          </>
        ) : (
          <>
            <Plus className="size-4 mr-2" />
            Create Card
          </>
        )}
      </Button>
    </div>
  );
};
