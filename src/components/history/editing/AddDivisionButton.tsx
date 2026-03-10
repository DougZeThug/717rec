import { Check, Plus, X } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddDivisionButtonProps {
  onAddDivision: (name: string) => void;
  existingDivisions: string[];
}

export const AddDivisionButton: React.FC<AddDivisionButtonProps> = ({
  onAddDivision,
  existingDivisions,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleStartAdd = () => {
    setNewName('');
    setError(null);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setNewName('');
    setError(null);
    setIsAdding(false);
  };

  const handleSave = () => {
    const trimmedName = newName.trim();

    if (!trimmedName) {
      setError('Division name cannot be empty');
      return;
    }

    if (existingDivisions.includes(trimmedName)) {
      setError('A division with this name already exists');
      return;
    }

    onAddDivision(trimmedName);
    setNewName('');
    setError(null);
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isAdding) {
    return (
      <div
        className={cn(
          'rounded-xl border-2 border-dashed p-4 transition-all duration-200',
          'border-primary/50 bg-primary/5'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              className={cn('h-9', error && 'border-destructive')}
              placeholder="Enter division name (e.g., Intermediate 2)"
            />
            {error && <p className="text-destructive text-xs mt-1">{error}</p>}
          </div>
          <Button variant="default" size="icon" className="h-9 w-9" onClick={handleSave}>
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      className={cn(
        'w-full h-24 rounded-xl border-2 border-dashed',
        'hover:border-primary/50 hover:bg-primary/5',
        'transition-all duration-200'
      )}
      onClick={handleStartAdd}
    >
      <Plus className="h-5 w-5 mr-2" />
      Add Division
    </Button>
  );
};

export default AddDivisionButton;
