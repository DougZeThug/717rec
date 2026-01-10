import React from 'react';

import { cn } from '@/lib/utils';

interface CharacterCounterProps {
  current: number;
  max: number;
}

const CharacterCounter: React.FC<CharacterCounterProps> = ({ current, max }) => {
  const remaining = max - current;
  const isNearLimit = remaining < 50 && remaining >= 0;
  const isOverLimit = remaining < 0;

  return (
    <span
      className={cn(
        'text-xs',
        isNearLimit ? 'text-yellow-500' : 'text-muted-foreground',
        isOverLimit ? 'text-red-500' : ''
      )}
    >
      {remaining} left
    </span>
  );
};

export default CharacterCounter;
