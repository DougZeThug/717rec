import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { BusinessLogicError } from '@/types/errors';
import { throwEdgeFunctionError } from '@/utils/edgeFunctionError';
import { handleDatabaseError } from '@/utils/errorHandler';

export type ContactRequestRow = Tables<'contact_requests'>;

export type ContactRequestType = 'timeslot' | 'score' | 'join_league' | 'general' | 'other';

export interface SubmitContactRequestInput {
  request_type: ContactRequestType;
  submitter_name: string;
  submitter_team?: string | null;
  submitter_contact?: string;
  players?: string | null;
  message: string;
  website?: string;
}

const COLUMNS =
  'id, request_type, submitter_name, submitter_team, submitter_contact, players, message, user_id, team_id, is_verified, status, admin_notes, resolved_by, resolved_at, created_at, updated_at';

const NOTHING_SAVED_MESSAGE =
  'Nothing was saved. This request may have been deleted, or your admin access may have changed. Refresh the page and try again.';

export const ContactRequestService = {
  submit: async (input: SubmitContactRequestInput): Promise<void> => {
    const { error } = await supabase.functions.invoke('submit-contact-request', {
      body: input,
    });
    if (error) await throwEdgeFunctionError(error, 'Failed to submit request');
  },

  fetchAll: async (limit = 100): Promise<ContactRequestRow[]> => {
    const { data, error } = await supabase
      .from('contact_requests')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) handleDatabaseError(error, 'Failed to fetch contact requests');
    return (data ?? []) as ContactRequestRow[];
  },

  /**
   * @throws {DatabaseError} When the database operation fails
   * @throws {BusinessLogicError} When no row was updated (the request was
   *   deleted, or admin access was removed so row-level security hid it)
   */
  markResolved: async (id: string, resolvedBy: string | null): Promise<void> => {
    const { data: updated, error } = await supabase
      .from('contact_requests')
      .update({
        status: 'resolved',
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) handleDatabaseError(error, 'Failed to mark resolved');
    if (!updated) throw new BusinessLogicError(NOTHING_SAVED_MESSAGE);
  },

  /**
   * @throws {DatabaseError} When the database operation fails
   * @throws {BusinessLogicError} When no row was updated (same cases as markResolved)
   */
  reopen: async (id: string): Promise<void> => {
    const { data: updated, error } = await supabase
      .from('contact_requests')
      .update({ status: 'new', resolved_by: null, resolved_at: null })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) handleDatabaseError(error, 'Failed to reopen request');
    if (!updated) throw new BusinessLogicError(NOTHING_SAVED_MESSAGE);
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('contact_requests').delete().eq('id', id);
    if (error) handleDatabaseError(error, 'Failed to delete request');
  },
};
