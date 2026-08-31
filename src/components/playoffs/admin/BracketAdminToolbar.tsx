import { useQuery } from '@tanstack/react-query';
import {
  Edit,
  ListOrdered,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Shuffle,
  Trash,
  Wrench,
} from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRecalculateStandings } from '@/hooks/useRecalculateStandings';
import { useRepairBracket } from '@/hooks/useRepairBracket';
import { cn } from '@/lib/utils';
import { fetchFinalStandings } from '@/services/brackets/BracketReadService';
import { PlayoffBracket } from '@/utils/playoffs/playoffTypes';

interface BracketAdminToolbarProps {
  bracket: PlayoffBracket;
  bracketId: string;
  onRearrange: () => void;
  onUpdateSeeding: () => void;
  onEdit: () => void;
  onDeleteBracket?: (bracketId: string, bracketName: string) => void;
}

/** One admin control, described once and rendered twice. */
interface BracketAction {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  /** Whether the control applies to this bracket at all. */
  show: boolean;
  disabled?: boolean;
  /** A long-running action is in flight: spinner instead of the icon. */
  pending?: boolean;
  destructive?: boolean;
}

/** The icon slot, so the button and the menu item agree on the pending state. */
const ActionIcon: React.FC<{ action: BracketAction }> = ({ action }) =>
  action.pending ? (
    <Loader2 className="size-4 mr-2 animate-spin" />
  ) : (
    <action.icon className="size-4 mr-2" />
  );

/**
 * The admin controls above a bracket.
 *
 * Everything these buttons need — whether the bracket is completed, whether it
 * still lacks final standings, whether it can be rearranged, and the pending
 * state of the two long-running actions — is derived here rather than passed
 * in. That keeps the conditions next to the buttons they govern, and means the
 * standings query only runs for the admins who can act on it.
 *
 * Each action is described once and rendered twice: as a button row on a wide
 * screen, and behind a single overflow menu on a phone. Deriving them once is
 * the point — the menu cannot drift out of step with the buttons.
 */
const BracketAdminToolbar: React.FC<BracketAdminToolbarProps> = ({
  bracket,
  bracketId,
  onRearrange,
  onUpdateSeeding,
  onEdit,
  onDeleteBracket,
}) => {
  const isCompleted = bracket.state === 'completed';

  // Final standings are only worth checking once the bracket is finished; if
  // they are missing, an admin can trigger a manual recalculation.
  const { data: existingStandings } = useQuery({
    queryKey: ['final-standings', bracketId],
    queryFn: () => fetchFinalStandings(bracketId),
    enabled: Boolean(bracketId) && isCompleted,
  });
  const standingsMissing = isCompleted && (!existingStandings || existingStandings.length === 0);

  const { recalculate, isRecalculating } = useRecalculateStandings(bracketId);
  const { repair, isRepairing } = useRepairBracket(bracketId);

  // Rearranging needs a losers bracket managed by brackets-manager; the
  // format field is a display string ("Double Elimination"), so match loosely.
  const canRearrange =
    bracket.uses_brackets_manager === true &&
    (bracket.format ?? '').toLowerCase().includes('double');

  const allActions: BracketAction[] = [
    {
      key: 'recalculate',
      label: 'Recalculate Standings',
      icon: RefreshCw,
      onSelect: () => {
        recalculate();
      },
      show: standingsMissing,
      pending: isRecalculating,
      disabled: isRecalculating,
    },
    {
      key: 'repair',
      label: 'Repair Bracket',
      icon: Wrench,
      onSelect: () => {
        repair();
      },
      show: !isCompleted,
      pending: isRepairing,
      disabled: isRepairing,
    },
    {
      key: 'rearrange',
      label: 'Rearrange Teams',
      icon: Shuffle,
      onSelect: onRearrange,
      show: canRearrange,
      disabled: isCompleted,
    },
    {
      key: 'seeding',
      label: 'Update Seeding',
      icon: ListOrdered,
      onSelect: onUpdateSeeding,
      show: true,
      disabled: isCompleted,
    },
    { key: 'edit', label: 'Edit Bracket', icon: Edit, onSelect: onEdit, show: true },
    {
      key: 'delete',
      label: 'Delete',
      icon: Trash,
      onSelect: () => onDeleteBracket?.(bracketId, bracket.name || ''),
      show: Boolean(onDeleteBracket),
      destructive: true,
    },
  ];

  const actions = allActions.filter((action) => action.show);

  return (
    <div className="flex items-center gap-2">
      {/* Wide screens: one button per action. */}
      <div className="hidden md:flex gap-2">
        {actions.map((action) => (
          <Button
            key={action.key}
            variant={action.destructive ? 'destructive' : 'outline'}
            size="sm"
            onClick={action.onSelect}
            disabled={action.disabled}
          >
            <ActionIcon action={action} />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Phone: the same actions behind one button. Playoff night is when an
          admin needs these, and a phone is the likely device. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Bracket actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.key}
              onClick={action.onSelect}
              disabled={action.disabled}
              className={cn(
                'cursor-pointer',
                action.destructive && 'text-destructive focus:text-destructive'
              )}
            >
              <ActionIcon action={action} />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default BracketAdminToolbar;
