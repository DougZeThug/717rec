import { AlertCircle, Clock, Settings, Trophy } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SeedStatusBadgeProps {
  seed: number;
  isManual?: boolean;
  hasConflict?: boolean;
  isPending?: boolean;
  onEdit?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const SeedStatusBadge: React.FC<SeedStatusBadgeProps> = ({
  seed,
  isManual = false,
  hasConflict = false,
  isPending = false,
  onEdit,
  size = 'md',
}) => {
  const getVariant = () => {
    if (hasConflict) return 'destructive';
    if (isPending) return 'outline';
    if (isManual) return 'default';
    return 'secondary';
  };

  const getIcon = () => {
    if (hasConflict) return AlertCircle;
    if (isPending) return Clock;
    if (isManual) return Settings;
    return Trophy;
  };

  const Icon = getIcon();
  const variant = getVariant();

  const badge = (
    <Badge
      variant={variant}
      className={`
        flex items-center gap-1 font-medium
        ${size === 'sm' ? 'text-xs px-1.5 py-0.5' : ''}
        ${size === 'lg' ? 'text-base px-3 py-1' : ''}
        ${hasConflict ? 'animate-pulse' : ''}
        ${isPending ? 'border-dashed' : ''}
      `}
    >
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
      <span>#{seed}</span>
      {size !== 'sm' && isManual && !hasConflict && <span className="text-xs opacity-75">Manual</span>}
      {size !== 'sm' && hasConflict && <span className="text-xs opacity-75">Conflict</span>}
      {size !== 'sm' && isPending && <span className="text-xs opacity-75">Pending</span>}
    </Badge>
  );

  if (onEdit) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="h-auto p-0 hover:bg-transparent"
      >
        {badge}
      </Button>
    );
  }

  return badge;
};
