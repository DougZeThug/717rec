import { Trash2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DestructiveIconButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  size?: 'default' | 'sm' | 'icon';
}

/**
 * Standardized icon-only delete/remove button with consistent destructive styling.
 * Uses ghost variant with red icon and destructive hover state.
 */
const DestructiveIconButton: React.FC<DestructiveIconButtonProps> = ({
  onClick,
  disabled = false,
  title = 'Remove',
  icon,
  className,
  size = 'icon',
}) => {
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'hover:bg-destructive/10 hover:text-destructive',
        'disabled:opacity-30',
        className
      )}
    >
      {icon || <Trash2 className="h-4 w-4 text-destructive" />}
    </Button>
  );
};

export { DestructiveIconButton };
