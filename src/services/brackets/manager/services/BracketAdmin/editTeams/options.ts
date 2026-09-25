import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError, ValidationError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';

import type { OpponentSide } from '../shapes';
import type { BracketAdminDeps } from '../types';
import type { EditTeamsContext } from './context';
import { loadEditTeamsContext } from './context';
import { teamPosition } from './occupancy';
import { assertEditableMatch, roundOneLocationOf } from './plan';
import { matchLabel, occupantId, occupantOf, participantName } from './rules';

/** One side of the edited match, as the screen shows it. */
interface EditTeamsSlot {
  side: OpponentSide;
  kind: 'team' | 'bye' | 'tbd';
  teamId: string | null;
  name: string | null;
}

/**
 * How a league team can be picked:
 * - 'here'      — already in this match
 * - 'trade'     — in another unplayed round 1 match; picking it trades places
 * - 'available' — in no match (a team new to the bracket gets added)
 * - 'taken'     — plays somewhere it can't be moved from; not pickable
 */
type CandidateGroup = 'here' | 'trade' | 'available' | 'taken';

interface EditTeamsCandidate {
  teamId: string;
  name: string;
  group: CandidateGroup;
  /** For 'trade' and 'taken': the match the team sits in now. */
  where: string | null;
  /** For 'taken': why it can't move, e.g. "has already been played". */
  reason: string | null;
  /** Whether the team belongs to the bracket's division (listed first). */
  sameDivision: boolean;
}

export interface EditTeamsOptions {
  ok: boolean;
  /** Why this match can't be edited, when it can't. */
  reason: string | null;
  matchLabel: string;
  slots: [EditTeamsSlot, EditTeamsSlot];
  /** The concurrency token the save sends back (see EditMatchTeamsParams). */
  expectedOpponent1Id: number | null;
  expectedOpponent2Id: number | null;
  expectedPickLocations: Record<string, number | null>;
  candidates: EditTeamsCandidate[];
}

const GROUP_ORDER: CandidateGroup[] = ['here', 'trade', 'available', 'taken'];

/** Why Edit teams can't change this match, or null when it can. Only refusals are caught. */
function editableReason(ctx: EditTeamsContext): string | null {
  try {
    assertEditableMatch(ctx);
    return null;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BusinessLogicError) {
      return error.message;
    }
    throw error;
  }
}

/** Read-only: can Edit teams change this match, and if not, why not. Drives the button. */
export async function checkEditTeamsEligibility(
  deps: BracketAdminDeps,
  matchId: number
): Promise<{ ok: boolean; reason: string | null }> {
  const reason = editableReason(await loadEditTeamsContext(deps, matchId));
  return { ok: reason === null, reason };
}

async function loadLeagueTeams(): Promise<
  { id: string; name: string; division_id: string | null }[]
> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, division_id')
    .order('name', { ascending: true });
  if (error) handleDatabaseError(error, 'Failed to read the teams');
  return data ?? [];
}

async function loadBracketDivision(bracketId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('brackets')
    .select('division_id')
    .eq('id', bracketId)
    .maybeSingle();
  if (error) handleDatabaseError(error, 'Failed to read the bracket');
  return (data as { division_id: string | null } | null)?.division_id ?? null;
}

/**
 * Read-only: everything the Edit teams screen needs, loaded fresh when it
 * opens — the match's two sides, every league team grouped by how it can be
 * picked (with a reason when it can't), and the concurrency token the save
 * sends back. A bracket's division is only a label (teams from any division
 * may play), so other divisions' teams are listed after the bracket's own.
 */
export async function getEditTeamsOptions(
  deps: BracketAdminDeps,
  matchId: number
): Promise<EditTeamsOptions> {
  const ctx = await loadEditTeamsContext(deps, matchId);
  const { match, stage } = ctx;
  const reason = editableReason(ctx);

  const slotOf = (side: OpponentSide): EditTeamsSlot => {
    const occupant = occupantOf(ctx, match[side]);
    const participant =
      occupant.kind === 'team'
        ? ctx.participants.find((p) => p.id === occupant.participantId)
        : undefined;
    return {
      side,
      kind: occupant.kind,
      teamId: participant?.team_id ?? null,
      name: occupant.kind === 'team' ? participantName(ctx, occupant.participantId) : null,
    };
  };

  const base = {
    reason,
    matchLabel: matchLabel(ctx, match),
    slots: [slotOf('opponent1'), slotOf('opponent2')] as [EditTeamsSlot, EditTeamsSlot],
    expectedOpponent1Id: occupantId(occupantOf(ctx, match.opponent1)),
    expectedOpponent2Id: occupantId(occupantOf(ctx, match.opponent2)),
  };
  if (reason !== null) {
    return { ...base, ok: false, expectedPickLocations: {}, candidates: [] };
  }

  const [teams, divisionId] = await Promise.all([
    loadLeagueTeams(),
    loadBracketDivision(stage.tournament_id),
  ]);
  const expectedPickLocations: Record<string, number | null> = {};
  const candidates = teams.map((team): EditTeamsCandidate => {
    expectedPickLocations[team.id] = roundOneLocationOf(ctx, team.id);
    const candidate = {
      teamId: team.id,
      name: team.name,
      where: null as string | null,
      reason: null as string | null,
      sameDivision: divisionId !== null && team.division_id === divisionId,
    };
    const participant = ctx.participants.find((p) => p.team_id === team.id);
    if (!participant) return { ...candidate, group: 'available' };
    const position = teamPosition(ctx, participant.id);
    if (position.kind === 'here') return { ...candidate, group: 'here' };
    if (position.kind === 'free') return { ...candidate, group: 'available' };
    if (position.kind === 'trade') {
      return { ...candidate, group: 'trade', where: matchLabel(ctx, position.match) };
    }
    return {
      ...candidate,
      group: 'taken',
      where: matchLabel(ctx, position.match),
      reason: position.reason,
    };
  });
  candidates.sort(
    (a, b) =>
      GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) ||
      Number(b.sameDivision) - Number(a.sameDivision) ||
      a.name.localeCompare(b.name)
  );

  return { ...base, ok: true, expectedPickLocations, candidates };
}
