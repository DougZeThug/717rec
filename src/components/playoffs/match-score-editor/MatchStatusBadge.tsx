import { CheckCircle2, Clock, Lock, PlayCircle, Unlock } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';

/**
 * Brackets-manager numeric status meanings:
 *   1 = Waiting (opponents not yet decided)
 *   2 = Ready   (both opponents known, no score yet)
 *   3 = Running (score partially entered)
 *   4 = Completed
 *   5 = Archived (a downstream round has progressed — locked by the library)
 *
 * Admins can still edit Archived matches because BracketUpdateService
 * temporarily flips status 5 -> 4 before applying updates.
 */
interface MatchStatusBadgeProps {
  status: number | undefined;
}

interface StatusDisplay {
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  editable: boolean;
}

const getStatusDisplay = (status: number | undefined): StatusDisplay => {
  switch (status) {
    case 0:
      return {
        label: 'Locked',
        description:
          'Earlier matches feeding into this one have not finished yet. Saving will be allowed once both teams are confirmed.',
        Icon: Lock,
        variant: 'outline',
        editable: false,
      };
    case 1:
      return {
        label: 'Waiting',
        description:
          'The bracket has not promoted this match to Ready yet. If both teams are shown above, saving will unlock it automatically.',
        Icon: Clock,
        variant: 'outline',
        editable: true,
      };
    case 2:
      return {
        label: 'Ready',
        description: 'Ready for score entry',
        Icon: Unlock,
        variant: 'secondary',
        editable: true,
      };
    case 3:
      return {
        label: 'In Progress',
        description: 'Score entry in progress',
        Icon: PlayCircle,
        variant: 'secondary',
        editable: true,
      };
    case 4:
      return {
        label: 'Completed',
        description: 'Final score recorded — can still be edited',
        Icon: CheckCircle2,
        variant: 'default',
        editable: true,
      };
    case 5:
      return {
        label: 'Archived',
        description:
          'A later round has progressed. Saving will temporarily unlock this match so the score can be corrected.',
        Icon: Lock,
        variant: 'destructive',
        editable: true,
      };
    default:
      return {
        label: 'Unknown',
        description: 'Status not available',
        Icon: Clock,
        variant: 'outline',
        editable: false,
      };
  }
};

export const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({ status }) => {
  const { label, description, Icon, variant, editable } = getStatusDisplay(status);

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={variant} className="gap-1">
          <Icon className="h-3 w-3" />
          {label}
        </Badge>
        <span
          className={`text-xs font-medium ${
            editable ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
          }`}
        >
          {editable ? '• Editable now' : '• Not editable yet'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-snug">{description}</p>
    </div>
  );
};

export default MatchStatusBadge;
