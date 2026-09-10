import { describe, expect, it } from 'vitest';

import {
  buildRequestPayload,
  DATE_FIELD_LABEL,
  isRequestIncomplete,
  REASON_FIELD_LABEL,
  type RequestFormValues,
  selectRequestPanels,
} from '../requestForm';

const values = (overrides: Partial<RequestFormValues> = {}): RequestFormValues => ({
  teamId: 'team-1',
  type: 'TIME_CHANGE',
  matchDate: '2026-09-17',
  currentTimeslot: '6:00 PM',
  requestedTimeslot: '7:00 PM',
  reason: '',
  ...overrides,
});

describe('isRequestIncomplete', () => {
  it('accepts a filled-in time change', () => {
    expect(isRequestIncomplete(values())).toBe(false);
  });

  // A time change that names no time is nothing an admin can act on.
  it('refuses a time change with no time', () => {
    expect(isRequestIncomplete(values({ requestedTimeslot: '' }))).toBe(true);
  });

  it('refuses a cancellation with no reason', () => {
    expect(isRequestIncomplete(values({ type: 'EMERGENCY_CANCEL', reason: '' }))).toBe(true);
  });

  it('accepts a cancellation that says why', () => {
    expect(isRequestIncomplete(values({ type: 'EMERGENCY_CANCEL', reason: 'Snow' }))).toBe(false);
  });

  // A bye names a night and needs nothing else.
  it('accepts a bye with nothing but a team', () => {
    expect(
      isRequestIncomplete(values({ type: 'BYE_REQUEST', requestedTimeslot: '', reason: '' }))
    ).toBe(false);
  });

  it('refuses a form with no team or no kind', () => {
    expect(isRequestIncomplete(values({ teamId: '' }))).toBe(true);
    expect(isRequestIncomplete(values({ type: null }))).toBe(true);
  });
});

describe('buildRequestPayload', () => {
  it('names the team that is asking', () => {
    expect(buildRequestPayload(values(), '3 Amigos')).toMatchObject({
      team_id: 'team-1',
      request_type: 'TIME_CHANGE',
      requested_timeslot: '7:00 PM',
      submitted_by_name: '3 Amigos',
    });
  });

  // Storing '' would make an unanswered field look like an answered one.
  it('stores nothing rather than an empty field', () => {
    const payload = buildRequestPayload(values({ matchDate: '', reason: '' }), '3 Amigos');

    expect(payload?.match_date).toBeUndefined();
    expect(payload?.reason).toBeUndefined();
  });

  it('builds nothing from a form that cannot be sent', () => {
    expect(buildRequestPayload(values({ requestedTimeslot: '' }), '3 Amigos')).toBeNull();
  });
});

describe('field labels', () => {
  it('asks a bye which night to skip, and a cancellation why', () => {
    expect(DATE_FIELD_LABEL.BYE_REQUEST).toBe('Date to skip');
    expect(DATE_FIELD_LABEL.TIME_CHANGE).toBe('Match date');
    expect(REASON_FIELD_LABEL.EMERGENCY_CANCEL).toBe('Reason (required)');
    expect(REASON_FIELD_LABEL.TIME_CHANGE).toBe('Reason (optional)');
  });
});

describe('selectRequestPanels', () => {
  const state = {
    hasTeam: true,
    type: 'TIME_CHANGE' as const,
    isHistoryOpen: false,
    pastRequestCount: 0,
  };

  it('shows nothing until a team is chosen', () => {
    const panels = selectRequestPanels({ ...state, hasTeam: false });

    expect(panels).toEqual({
      showHistoryButton: false,
      showTypePicker: false,
      formType: null,
      showHistory: false,
    });
  });

  it('asks what is needed once a team is chosen', () => {
    const panels = selectRequestPanels({ ...state, type: null });

    expect(panels.showTypePicker).toBe(true);
    expect(panels.formType).toBeNull();
  });

  // The picker stays above the form, so a reader can change their mind without
  // starting again.
  it('keeps the picker on screen beside the form', () => {
    const panels = selectRequestPanels(state);

    expect(panels.showTypePicker).toBe(true);
    expect(panels.formType).toBe('TIME_CHANGE');
  });

  it('replaces the whole form with the history', () => {
    const panels = selectRequestPanels({ ...state, isHistoryOpen: true });

    expect(panels.showHistory).toBe(true);
    expect(panels.showTypePicker).toBe(false);
    expect(panels.formType).toBeNull();
  });

  it('offers history only when there is some', () => {
    expect(selectRequestPanels(state).showHistoryButton).toBe(false);
    expect(selectRequestPanels({ ...state, pastRequestCount: 2 }).showHistoryButton).toBe(true);
    expect(
      selectRequestPanels({ ...state, hasTeam: false, pastRequestCount: 2 }).showHistoryButton
    ).toBe(false);
  });
});
