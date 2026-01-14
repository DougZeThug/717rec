import { AlertCircle, Loader2, RotateCcw, Save, X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditModeToolbarProps {
  hasChanges: boolean;
  isSaving: boolean;
  changeCount: number;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
}

export const EditModeToolbar: React.FC<EditModeToolbarProps> = ({
  hasChanges,
  isSaving,
  changeCount,
  onSave,
  onCancel,
  onReset,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl',
        'bg-primary/5 border-2 border-primary/20'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
            hasChanges
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          )}
        >
          {hasChanges ? (
            <>
              <AlertCircle className="h-4 w-4" />
              {changeCount} unsaved change{changeCount !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              No changes
            </>
          )}
        </div>

        <span className="text-sm text-muted-foreground hidden sm:block">
          Drag teams between divisions to reorganize
        </span>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        {hasChanges && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isSaving}
            className="flex-1 sm:flex-none"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 sm:flex-none"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          disabled={!hasChanges || isSaving}
          className="flex-1 sm:flex-none"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default EditModeToolbar;
