import { Check, Pencil, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface EditableDivisionHeaderProps {
  divisionName: string;
  teamCount: number;
  onRename: (newName: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  existingDivisions: string[];
}

export const EditableDivisionHeader: React.FC<EditableDivisionHeaderProps> = ({
  divisionName,
  teamCount,
  onRename,
  onRemove,
  canRemove,
  existingDivisions,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(divisionName);
  const [error, setError] = useState<string | null>(null);

  const handleStartEdit = () => {
    setEditValue(divisionName);
    setError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditValue(divisionName);
    setError(null);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    const trimmedValue = editValue.trim();

    if (!trimmedValue) {
      setError('Division name cannot be empty');
      return;
    }

    if (trimmedValue !== divisionName && existingDivisions.includes(trimmedValue)) {
      setError('A division with this name already exists');
      return;
    }

    onRename(trimmedValue);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="flex items-center justify-between gap-2">
      {isEditing ? (
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1">
            <Input
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              className={cn('h-9', error && 'border-destructive')}
              autoFocus
              placeholder="Division name"
            />
            {error && <p className="text-destructive text-xs mt-1">{error}</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveEdit}>
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelEdit}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-semibold text-foreground">{divisionName}</h4>
            <span className="text-sm text-muted-foreground">({teamCount})</span>
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rename division</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onRemove}
                    disabled={!canRemove}
                  >
                    <Trash2
                      className={cn(
                        'h-4 w-4',
                        canRemove
                          ? 'text-destructive hover:text-destructive'
                          : 'text-muted-foreground/50'
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {canRemove ? 'Remove empty division' : 'Move all teams before removing'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </>
      )}
    </div>
  );
};

export default EditableDivisionHeader;
