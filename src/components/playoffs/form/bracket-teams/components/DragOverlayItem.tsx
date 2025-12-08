import React from 'react';
import { GripVertical, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragOverlayItemProps {
  name: string;
  seed: number;
  logoUrl?: string | null;
}

export const DragOverlayItem: React.FC<DragOverlayItemProps> = ({
  name,
  seed,
  logoUrl,
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-2 border-primary",
        "bg-card shadow-2xl scale-105",
        "cursor-grabbing"
      )}
    >
      {/* Drag Handle */}
      <div className="p-1 -m-1">
        <GripVertical className="w-4 h-4 text-primary" />
      </div>

      {/* Seed Badge */}
      <div className={cn(
        "flex items-center justify-center min-w-[2rem] h-7 rounded-md text-sm font-bold",
        "bg-primary text-primary-foreground"
      )}>
        #{seed}
      </div>

      {/* Team Info */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {logoUrl ? (
          <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        )}
        <span className="font-semibold">{name}</span>
      </div>
    </div>
  );
};

export default DragOverlayItem;
