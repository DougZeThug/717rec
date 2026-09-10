import type { TeamRequestWithTeam } from '@/types/teamRequest';
import { formatWithPattern } from '@/utils/formatDateSafe';
import { BYE_SLOT, describeBlock, parseRequestedBlock } from '@/utils/timeslotMove';

/** What an approval hands to the Timeslots section. */
export interface TimeslotHandoff {
  /** The query string to open Timeslots at, including its leading `?`. */
  search: string;
  /** The line of the toast that says what is left to do. */
  description: string;
}

/**
 * The night, the team and the block an approved request points at.
 *
 * Approving a request writes a status and nothing else — the schedule does not
 * move, and it should not: the change is made on the screen that shows the
 * night, so a clash or a time typed wrong is seen before anything is written.
 * What this does is carry every fact that screen needs, so making the change
 * is one more press instead of six.
 *
 * A time change points at the block that was asked for. A bye request and an
 * emergency cancellation both point at a bye: either way the team is not
 * playing that night.
 *
 * See UX audit A-05 and L4.
 */
export const buildTimeslotHandoff = (request: TeamRequestWithTeam): TimeslotHandoff => {
  const teamName = request.teams?.name ?? 'the team';
  const wantsBye = request.request_type !== 'TIME_CHANGE';
  const block = wantsBye ? BYE_SLOT : parseRequestedBlock(request.requested_timeslot);

  const params = new URLSearchParams();
  if (request.match_date) params.set('date', request.match_date);
  params.set('team', request.team_id);
  if (block) params.set('slot', block);

  const nightLabel = request.match_date
    ? ` on ${formatWithPattern(request.match_date, 'MMM d')}`
    : '';

  // The time the team typed is free text, so it can be anything. Naming what
  // could not be read beats silently opening on no block at all.
  if (!block) {
    const asked = request.requested_timeslot?.trim();
    return {
      search: `?${params.toString()}`,
      description: asked
        ? `${teamName} asked for "${asked}", which is not one of the blocks. Open Timeslots to pick one${nightLabel}.`
        : `The request did not say which time was wanted. Open Timeslots to pick a block for ${teamName}${nightLabel}.`,
    };
  }

  const action = wantsBye
    ? `give ${teamName} a bye`
    : `move ${teamName} to the ${describeBlock(block)} block`;

  return {
    search: `?${params.toString()}`,
    description: request.match_date
      ? `Open Timeslots to ${action}${nightLabel}. Approving does not move it.`
      : `Open Timeslots to ${action}. The request did not name a night, so check the one shown.`,
  };
};
