import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, Users } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

interface SortableTeamItemProps {
  id: string;
  name: string;
  seed: number;
  logoUrl?: string | null;
  disabled?: boolean;
  showSeedInput?: boolean;
  hasConflict?: boolean;
  onSeedChange?: (seed: number | null) => void;
}

export const SortableTeamItem: React.FC<SortableTeamItemProps> = ({
  id,
  name,
  seed,
  logoUrl,
  disabled = false,
  showSeedInput = false,
  hasConflict = false,
  onSeedChange,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({
      id,
      disabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
        isDragging && 'z-50 shadow-lg ring-2 ring-primary/50 bg-card scale-[1.02]',
        isOver && !isDragging && 'border-primary/50 bg-primary/5',
        !disabled && 'hover:bg-muted/80 cursor-grab active:cursor-grabbing',
        disabled && 'bg-background cursor-default opacity-60',
        hasConflict && 'border-destructive/50 bg-destructive/5'
      )}
    >
      {/* Drag Handle */}
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="touch-none p-1 -m-1 rounded hover:bg-muted-foreground/10 transition-colors"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      {/* Seed Badge */}
      <div
        className={cn(
          'flex items-center justify-center min-w-[2rem] h-7 rounded-md text-sm font-bold',
          'bg-primary/10 text-primary'
        )}
      >
        #{seed}
      </div>

      {/* Team Info */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {logoUrl ? (
          <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
            <img
              src={logoUrl}
              alt={`${name} logo`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        )}
        <span className="font-medium truncate">{name}</span>
      </div>

      {/* Seed Input for Manual Mode */}
      {showSeedInput && onSeedChange && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground hidden sm:inline">Seed:</span>
          <input
            type="number"
            min="1"
            value={seed}
            onChange={(e) => onSeedChange(parseInt(e.target.value) || null)}
            onClick={(e) => e.stopPropagation()}
            placeholder="#"
            className={cn(
              'w-16 h-9 text-center text-sm font-semibold rounded-md border-2',
              'bg-background transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
              'hover:border-primary/50',
              hasConflict && 'border-destructive bg-destructive/10 focus:ring-destructive/50 focus:border-destructive'
            )}
            aria-label={`Seed for ${name}`}
          />
          {hasConflict && (
            <span className="text-xs text-destructive font-medium">Duplicate</span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default SortableTeamItem;
