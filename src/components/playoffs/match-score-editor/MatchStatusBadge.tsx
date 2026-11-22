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
 * Admins can still edit Archived matches: BracketUpdateService writes a
 * same-winner score correction directly to the columns, and only a winner flip
 * temporarily flips status 5 -> 4 to go through the library.
 */
interface MatchStatusBadgeProps {
  status: number | undefined;
  /** A person who cannot save scores: no "Editable now" and no "Saving will..." wording. */
  readOnly?: boolean;
}

interface StatusDisplay {
  label: string;
  description: string;
  /** Wording for someone who cannot save, where `description` talks about saving or editing. */
  readOnlyDescription?: string;
  Icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  editable: boolean;
}

/** Map a brackets-manager status code to its label, icon, badge variant, and editability. */
const getStatusDisplay = (status: number | undefined): StatusDisplay => {
  switch (status) {
    case 0:
      return {
        label: 'Locked',
        description:
          'Earlier matches feeding into this one have not finished yet. Saving will be allowed once both teams are confirmed.',
        readOnlyDescription: 'Earlier matches feeding into this one have not finished yet.',
        Icon: Lock,
        variant: 'outline',
        editable: false,
      };
    case 1:
      return {
        label: 'Waiting',
        description:
          'The bracket has not promoted this match to Ready yet. If both teams are shown above, saving will unlock it automatically.',
        readOnlyDescription: 'The bracket has not promoted this match to Ready yet.',
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
        readOnlyDescription: 'Final score recorded',
        Icon: CheckCircle2,
        variant: 'default',
        editable: true,
      };
    case 5:
      return {
        label: 'Archived',
        description:
          'A later round has progressed. Saving will temporarily unlock this match so the score can be corrected.',
        readOnlyDescription: 'A later round has progressed after this match.',
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

/** Shows a bracket match's status badge plus whether it can be edited and why. */
export const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({ status, readOnly = false }) => {
  const { label, description, readOnlyDescription, Icon, variant, editable } =
    getStatusDisplay(status);

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={variant} className="gap-1">
          <Icon className="size-3" />
          {label}
        </Badge>
        {!readOnly && (
          <span
            className={`text-xs font-medium ${
              editable ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
            }`}
          >
            {editable ? '• Editable now' : '• Not editable yet'}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-snug">
        {readOnly ? (readOnlyDescription ?? description) : description}
      </p>
    </div>
  );
};
