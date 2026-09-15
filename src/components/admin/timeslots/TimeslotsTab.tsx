import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import React, { useState } from 'react';

import TimeslotAssignment from '@/components/timeslots/TimeslotAssignment';
import TimeslotList from '@/components/timeslots/TimeslotList';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorDisplay } from '@/components/ui/error-display';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTeamsQuery } from '@/hooks/teams';
import { useTimeslotPrefill } from '@/hooks/timeslots/useTimeslotPrefill';
import { useTimeslots } from '@/hooks/useTimeslots';
import { useToast } from '@/hooks/useToast';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { nextThursday } from '@/utils/leagueNight';
import { errorLog } from '@/utils/logger';
import { buildMovePlan, describeBlock } from '@/utils/timeslotMove';

import TimeslotMoveCard from './TimeslotMoveCard';

/**
 * The assignment column, which is a booking form or one of two stand-ins.
 *
 * Its own component so the three states are three plain returns, and so
 * `TimeslotsTab` does not carry their branches on top of everything else it
 * already decides. React Doctor flags that function for complexity otherwise.
 */
const AssignmentColumn = ({
  isLoading,
  hasFailed,
  onRetry,
  children,
}: {
  isLoading: boolean;
  /** The team list never arrived. A failed *refresh* is not this. */
  hasFailed: boolean;
  onRetry: () => void;
  /** The booking form. One element, so it can be returned as it is. */
  children: React.ReactElement;
}) => {
  if (isLoading) return <p>Loading teams...</p>;
  // Only this column needs the team list. The current timeslots beside it still
  // read fine, so the failure stays local rather than blanking the whole tab.
  if (hasFailed) {
    return <ErrorDisplay error="We couldn't load the teams. Please try again." onRetry={onRetry} />;
  }
  return children;
};

const TimeslotsTab = () => {
  const { toast } = useToast();
  const prefill = useTimeslotPrefill();
  // League night, not today: Timeslots is used to set up the next Thursday.
  // A night named in the address wins, because something asked for it.
  const [selectedDate, setSelectedDate] = useState<Date>(() => prefill.date ?? nextThursday());

  // A second approval can arrive while this section is already open, naming a
  // different night. Following it during render rather than in an effect keeps
  // the calendar and the card from disagreeing for a frame.
  const [openedNight, setOpenedNight] = useState<string | null>(prefill.dateKey);
  if (prefill.dateKey && prefill.dateKey !== openedNight) {
    setOpenedNight(prefill.dateKey);
    if (prefill.date) setSelectedDate(prefill.date);
  }

  const {
    data: loadedTeams,
    isLoading: isLoadingTeams,
    error: teamsError,
    refetch: refetchTeams,
  } = useTeamsQuery();
  const teams = loadedTeams ?? [];
  // A refetch that fails after a good load keeps the rows and sets the error
  // beside them; only a load that never landed leaves nothing to work with.
  const teamsNeverLoaded = loadedTeams === undefined;

  /** One team by name, several by count — an admin books both ways. */
  const describeTeams = (teamIds: string[]): string => {
    if (teamIds.length === 1) {
      const team = teams.find((candidate) => candidate.id === teamIds[0]);
      if (team) return team.name;
    }
    return `${teamIds.length} team${teamIds.length === 1 ? '' : 's'}`;
  };

  const {
    timeslots,
    isLoading: isLoadingTimeslots,
    isSubmitting,
    addTimeslot,
    deleteTimeslot,
    batchAssignTimeslots,
    batchAssignDoubleHeaders,
    assignByeWeek,
    batchAssignByeWeeks,
    removeByeWeek,
    moveTeamBooking,
    isNightLoaded,
  } = useTimeslots(selectedDate);

  const handleTimeslotAssign = async (teamId: string, timeslot: string) => {
    try {
      if (timeslot === 'BYE') {
        // Handle bye week assignment separately
        await assignByeWeek(selectedDate, teamId);
        toast({
          title: 'Bye Week Assigned',
          description: 'Team bye week has been successfully assigned.',
        });
      } else {
        // Use existing timeslot service for regular timeslots
        await addTimeslot(selectedDate, teamId, timeslot);
        toast({
          title: 'Timeslot Assigned',
          description: 'Team timeslot has been successfully assigned.',
        });
      }
    } catch (error) {
      errorLog('Error assigning timeslot:', error);
      toast({
        title: 'Error',
        description: getUIErrorMessage(error, 'Failed to assign timeslot'),
        variant: 'destructive',
      });
    }
  };

  const handleBatchTimeslotAssign = async (teamIds: string[], timeslot: string) => {
    try {
      if (timeslot === 'BYE') {
        // Handle bye week batch assignment separately
        await batchAssignByeWeeks(selectedDate, teamIds);
        toast({
          title: 'Bye Weeks Assigned',
          description: `${teamIds.length} team bye weeks have been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
        });
      } else {
        // Use existing batch assignment function for regular timeslots
        await batchAssignTimeslots(selectedDate, teamIds, timeslot);
        toast({
          title: 'Block booked',
          description: `${describeTeams(teamIds)} booked for the ${describeBlock(timeslot)} block on ${format(selectedDate, 'MMMM d, yyyy')}`,
        });
      }
    } catch (error) {
      errorLog('Error during batch assignment:', error);
      toast({
        title: 'Error',
        description: getUIErrorMessage(error, 'Failed to assign timeslots'),
        variant: 'destructive',
      });
    }
  };

  const handleBatchDoubleHeaderAssign = async (teamIds: string[], slot1: string, slot2: string) => {
    try {
      await batchAssignDoubleHeaders(selectedDate, teamIds, slot1, slot2);
      toast({
        title: 'Double Headers Assigned',
        description: `${teamIds.length} team double headers (${slot1} & ${slot2}) have been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
      });
    } catch (error) {
      errorLog('Error during double header assignment:', error);
      toast({
        title: 'Error',
        description: getUIErrorMessage(error, 'Failed to assign double header timeslots'),
        variant: 'destructive',
      });
    }
  };

  const handleTimeslotDelete = async (id: string) => {
    // Only ever applied to this night's own rows, for the same reason as the
    // move plan below. While a newly chosen night loads, `timeslots` still
    // holds the night before's rows, and removal goes by row id — so a press
    // here would clear a booking on a night nobody was looking at. The list
    // greys its own buttons out too; this is the guard that has to hold when a
    // dialog was already open as the date changed.
    if (!isNightLoaded) return;

    // An id this night's rows do not hold came from a list that has since been
    // replaced — a confirmation left open across a change of date. Removal goes
    // by id, and for a back-to-back row by team and date, so acting on it would
    // clear a booking on the night before.
    const timeslotToDelete = timeslots.find((ts) => ts.id === id);
    if (!timeslotToDelete) return;

    try {
      if (timeslotToDelete.timeslot === 'BYE') {
        // Handle bye week deletion separately
        await removeByeWeek(id);
        toast({
          title: 'Bye Week Removed',
          description: 'Bye week assignment has been removed.',
        });
      } else {
        // Use existing deletion service for regular timeslots
        await deleteTimeslot(id);
        toast({
          title: 'Timeslot Removed',
          description: 'Timeslot assignment has been removed.',
        });
      }
    } catch (error) {
      errorLog('Error removing timeslot:', error);
      toast({
        title: 'Error',
        description: getUIErrorMessage(error, 'Failed to remove timeslot'),
        variant: 'destructive',
      });
    }
  };

  // ── The change an approved request asked for ───────────────────────────────

  const prefillTeam = prefill.teamId ? teams.find((team) => team.id === prefill.teamId) : undefined;
  // A team hidden from the public list still has rows, so fall back to the
  // name on the booking rather than showing an id or nothing.
  const prefillTeamName =
    prefillTeam?.name ??
    timeslots.find((row) => row.team_id === prefill.teamId)?.teams?.name ??
    'This team';

  // Only ever planned against this night's own rows. While a newly chosen night
  // loads, `timeslots` still holds the night before's rows, and clearing by
  // their ids would delete bookings on a night nobody was looking at.
  const movePlan =
    prefill.hasPrefill && prefill.teamId && isNightLoaded
      ? buildMovePlan(timeslots, prefill.teamId, prefill.slot)
      : null;

  const handleMove = async () => {
    if (!movePlan || !prefill.teamId || !movePlan.target) return;

    try {
      const outcome = await moveTeamBooking(
        selectedDate,
        prefill.teamId,
        movePlan.target,
        movePlan.removeIds
      );

      // A refusal already said why, and the card stays so the admin can change
      // the night and try again. A part-done move already named its repair.
      if (outcome !== 'moved') return;

      toast({
        title: movePlan.target === 'BYE' ? 'Bye Week Assigned' : 'Block booked',
        description:
          movePlan.target === 'BYE'
            ? `${prefillTeamName} is not playing on ${format(selectedDate, 'MMMM d, yyyy')}`
            : `${prefillTeamName} booked for the ${describeBlock(movePlan.target)} block on ${format(selectedDate, 'MMMM d, yyyy')}`,
      });
      prefill.clear();
    } catch (error) {
      // moveTeamBooking already raised the reason. Adding a second toast here
      // would replace it with a generic one.
      errorLog('Error moving a booking:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Assign Timeslots</CardTitle>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] pl-3 text-left font-normal">
                <CalendarIcon className="mr-2 size-4" />
                {format(selectedDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        {movePlan && (
          <TimeslotMoveCard
            plan={movePlan}
            teamName={prefillTeamName}
            dateLabel={format(selectedDate, 'EEEE, d MMMM')}
            requestedText={prefill.askedFor}
            isSubmitting={isSubmitting}
            onMove={handleMove}
            onDismiss={prefill.clear}
          />
        )}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-medium mb-4">Assign a New Timeslot</h3>
            <AssignmentColumn
              isLoading={isLoadingTeams}
              hasFailed={Boolean(teamsError) && teamsNeverLoaded}
              onRetry={() => refetchTeams()}
            >
              <TimeslotAssignment
                selectedDate={selectedDate}
                teams={teams}
                existingTimeslots={timeslots}
                onAssign={handleTimeslotAssign}
                onBatchAssign={handleBatchTimeslotAssign}
                onBatchAssignDoubleHeaders={handleBatchDoubleHeaderAssign}
                isSubmitting={isSubmitting}
              />
            </AssignmentColumn>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Current Timeslots</h3>
            {isLoadingTimeslots ? (
              <p>Loading timeslots...</p>
            ) : (
              <div className="bg-card p-4 rounded-md border border-border">
                <TimeslotList
                  timeslots={timeslots}
                  teams={teams}
                  onDelete={handleTimeslotDelete}
                  canDelete={isNightLoaded}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeslotsTab;
