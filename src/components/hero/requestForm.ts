import type { TeamRequestType } from '@/types/teamRequest';

/** What the date field is called, per kind of request. */
export const DATE_FIELD_LABEL: Record<TeamRequestType, string> = {
  TIME_CHANGE: 'Match date',
  BYE_REQUEST: 'Date to skip',
  EMERGENCY_CANCEL: 'Match date',
};

/** Only a cancellation has to say why. */
export const REASON_FIELD_LABEL: Record<TeamRequestType, string> = {
  TIME_CHANGE: 'Reason (optional)',
  BYE_REQUEST: 'Reason (optional)',
  EMERGENCY_CANCEL: 'Reason (required)',
};

/** Everything the form holds, before it is turned into a request. */
export interface RequestFormValues {
  teamId: string;
  type: TeamRequestType | null;
  matchDate: string;
  currentTimeslot: string;
  requestedTimeslot: string;
  reason: string;
}

/**
 * Whether the form is missing something the league could not act on.
 *
 * A cancellation with no reason and a time change with no time are both
 * requests an admin can do nothing with, so neither can be sent.
 */
export const isRequestIncomplete = (values: RequestFormValues): boolean => {
  if (!values.teamId || !values.type) return true;
  if (values.type === 'EMERGENCY_CANCEL') return !values.reason;
  if (values.type === 'TIME_CHANGE') return !values.requestedTimeslot;
  return false;
};

/** An empty field is an absent one: the request stores nothing rather than ''. */
const orNothing = (value: string): string | undefined => value || undefined;

/**
 * The request a filled-in form makes.
 *
 * Returns null when the form could not make one, so the caller has a single
 * thing to check rather than repeating the rules.
 */
export const buildRequestPayload = (values: RequestFormValues, teamName?: string) => {
  if (isRequestIncomplete(values) || !values.type) return null;

  return {
    team_id: values.teamId,
    request_type: values.type,
    match_date: orNothing(values.matchDate),
    current_timeslot: orNothing(values.currentTimeslot),
    requested_timeslot: orNothing(values.requestedTimeslot),
    reason: orNothing(values.reason),
    submitted_by_name: teamName,
  };
};

/** Which parts of the request card are on screen. */
export interface RequestCardPanels {
  showHistoryButton: boolean;
  showTypePicker: boolean;
  /** The kind of request the form is for, or null when there is no form. */
  formType: TeamRequestType | null;
  showHistory: boolean;
}

/**
 * What the card shows, as one decision.
 *
 * These four used to be four separate conditions in the render, each repeating
 * "a team is chosen" and "history is not open". Four expressions that have to
 * agree with each other is a rule waiting to be broken; this is the rule.
 */
export const selectRequestPanels = (state: {
  hasTeam: boolean;
  type: TeamRequestType | null;
  isHistoryOpen: boolean;
  pastRequestCount: number;
}): RequestCardPanels => {
  const base = {
    showHistoryButton: state.hasTeam && state.pastRequestCount > 0,
    showTypePicker: false,
    formType: null,
    showHistory: false,
  };

  if (!state.hasTeam) return base;
  if (state.isHistoryOpen) return { ...base, showHistory: true };

  // The type picker stays above the form rather than being replaced by it, so
  // the reader can change their mind without starting again.
  return { ...base, showTypePicker: true, formType: state.type };
};
