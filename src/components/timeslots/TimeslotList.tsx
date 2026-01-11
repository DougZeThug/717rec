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

interface TimeslotListProps {
  timeslots: TeamTimeslot[];
  teams: Team[];
  onDelete: (id: string) => void;
}

const TimeslotList: React.FC<TimeslotListProps> = ({ timeslots, teams, onDelete }) => {
  const [deletingTimeslotId, setDeletingTimeslotId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper function to get team name by ID
  const getTeamName = (teamId: string | null): string => {
    if (!teamId) return 'Unknown Team';
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  // Sort timeslots by time
  const sortedTimeslots = [...timeslots].sort((a, b) => {
    if (a.timeslot < b.timeslot) return -1;
    if (a.timeslot > b.timeslot) return 1;
    return 0;
  });

  const timeslotToDelete = deletingTimeslotId
    ? timeslots.find((t) => t.id === deletingTimeslotId)
    : null;

  const handleConfirmDelete = async () => {
    if (!deletingTimeslotId) return;
    setIsDeleting(true);
    try {
      await onDelete(deletingTimeslotId);
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
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTimeslots.map((timeslot) => (
              <TableRow key={timeslot.id}>
                <TableCell className="font-medium">{timeslot.timeslot}</TableCell>
                <TableCell>{getTeamName(timeslot.team_id)}</TableCell>
                <TableCell>
                  <DestructiveIconButton
                    onClick={() => setDeletingTimeslotId(timeslot.id)}
                    title="Remove timeslot"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deletingTimeslotId}
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
                  for <strong>{getTeamName(timeslotToDelete.team_id)}</strong> at{' '}
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
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
