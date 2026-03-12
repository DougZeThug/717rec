import { AlertCircle } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface SeedInputFieldProps {
  teamId: string;
  teamName: string;
  seed: number;
  isManualMode: boolean;
  hasConflict: boolean;
  onSeedChange: (teamId: string, seed: number | null) => void;
}

export const SeedInputField: React.FC<SeedInputFieldProps> = ({
  teamId,
  teamName: _teamName,
  seed,
  isManualMode,
  hasConflict,
  onSeedChange,
}) => {
  const handleSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const seedNumber = value === '' ? null : parseInt(value, 10);

    if (seedNumber === null || (!isNaN(seedNumber) && seedNumber > 0)) {
      onSeedChange(teamId, seedNumber);
    }
  };

  if (!isManualMode) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          #{seed}
        </Badge>
        <span className="text-xs text-muted-foreground">Auto</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Input
          type="number"
          min="1"
          value={seed}
          onChange={handleSeedChange}
          className={`w-16 h-8 text-center ${
            hasConflict ? 'border-destructive bg-destructive/10' : ''
          }`}
          placeholder="#"
        />
        {hasConflict && (
          <AlertCircle className="absolute -right-1 -top-1 w-4 h-4 text-destructive" />
        )}
      </div>

      {hasConflict && <span className="text-xs text-destructive">Duplicate</span>}
    </div>
  );
};
