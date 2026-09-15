import { Clock, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DestructiveIconButton } from '@/components/ui/destructive-icon-button';
import { InlineEmptyState } from '@/components/ui/inline-empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Team, TeamTimeslot } from '@/types';

/** The table's column headings, lifted out to keep the table's tree shallow. */
const TimeslotTableHead: React.FC = () => (
  <TableHeader>
    <TableRow>
      <TableHead>Time</TableHead>
      <TableHead>Team</TableHead>
      <TableHead className="w-[100px]">Actions</TableHead>
    </TableRow>
  </TableHeader>
);

interface TimeslotRowProps {
  timeslot: TeamTimeslot;
  teamName: string;
  canDelete: boolean;
  onRemove: () => void;
}

/** One assigned timeslot, with the control that removes it. */
const TimeslotRow: React.FC<TimeslotRowProps> = ({ timeslot, teamName, canDelete, onRemove }) => (
  <TableRow>
    <TableCell className="font-medium">{timeslot.timeslot}</TableCell>
    <TableCell>{teamName}</TableCell>
    <TableCell>
      <DestructiveIconButton onClick={onRemove} title="Remove timeslot" disabled={!canDelete} />
    </TableCell>
  </TableRow>
);

interface TimeslotListProps {
  timeslots: TeamTimeslot[];
  teams: Team[];
  onDelete: (id: string) => void;
  /**
   * False while the rows on screen still belong to a **previously** chosen
   * night. Removal goes by row id, so a press during that window would clear a
   * booking on the night the admin has just left. Defaults to true for callers
   * that never show another night's rows.
   */
  canDelete?: boolean;
}

const TimeslotList: React.FC<TimeslotListProps> = ({
  timeslots,
  teams,
  onDelete,
  canDelete = true,
}) => {
  const [deletingTimeslotId, setDeletingTimeslotId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper function to get team name by ID
  const getTeamName = (timeslot: TeamTimeslot): string => {
    // Prefer the joined team name from the timeslot query — it always
    // resolves, even when the public teams list filters out hidden/opted-out
    // teams. Fall back to the teams prop, then to a friendly placeholder.
    if (timeslot.teams?.name) return timeslot.teams.name;
    if (!timeslot.team_id) return 'Unknown Team';
    const team = teams.find((t) => t.id === timeslot.team_id);
    return team ? team.name : 'Unknown Team';
  };

  // Sort timeslots by time
  const sortedTimeslots = [...timeslots].sort((a, b) => {
    if (a.timeslot < b.timeslot) return -1;
    if (a.timeslot > b.timeslot) return 1;
    return 0;
  });

  // The row the confirmation names, looked up in the rows on screen *now*. A
  // confirmation can outlive the rows it was opened against — the admin picks
  // another date while it is open — and `canDelete` only greys Remove out while
  // the new night loads, so it would be handed back the moment those rows
  // arrive, still naming a row from the night before. Reading the row rather
  // than the id means the dialog simply is not open once its row is gone.
  const timeslotToDelete = deletingTimeslotId
    ? (timeslots.find((t) => t.id === deletingTimeslotId) ?? null)
    : null;

  const handleConfirmDelete = async () => {
    if (!timeslotToDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(timeslotToDelete.id);
      setDeletingTimeslotId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (timeslots.length === 0) {
    return (
      <InlineEmptyState
        icon={Clock}
        message="No Timeslots Assigned"
        description="Use the form above to assign team timeslots for this date."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TimeslotTableHead />
          <TableBody>
            {sortedTimeslots.map((timeslot) => (
              <TimeslotRow
                key={timeslot.id}
                timeslot={timeslot}
                teamName={getTeamName(timeslot)}
                canDelete={canDelete}
                onRemove={() => setDeletingTimeslotId(timeslot.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={timeslotToDelete !== null}
        onOpenChange={(open) => !open && setDeletingTimeslotId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Timeslot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the timeslot
              {timeslotToDelete ? (
                <>
                  {' '}
                  for <strong>{getTeamName(timeslotToDelete)}</strong> at{' '}
                  <strong>{timeslotToDelete.timeslot}</strong>
                </>
              ) : (
                ''
              )}
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting || !canDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TimeslotList;
