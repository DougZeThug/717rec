import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { handleDatabaseError } from '@/utils/errorHandler';

export type ContactRequestRow = Tables<'contact_requests'>;

export type ContactRequestType =
  | 'timeslot'
  | 'score'
  | 'join_league'
  | 'general'
  | 'other';

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

export const ContactRequestService = {
  submit: async (input: SubmitContactRequestInput): Promise<void> => {
    const { error } = await supabase.functions.invoke('submit-contact-request', {
      body: input,
    });
    if (error) throw new Error(error.message || 'Failed to submit request');
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

  markResolved: async (id: string, resolvedBy: string | null): Promise<void> => {
    const { error } = await supabase
      .from('contact_requests')
      .update({
        status: 'resolved',
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) handleDatabaseError(error, 'Failed to mark resolved');
  },

  reopen: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('contact_requests')
      .update({ status: 'new', resolved_by: null, resolved_at: null })
      .eq('id', id);
    if (error) handleDatabaseError(error, 'Failed to reopen request');
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('contact_requests').delete().eq('id', id);
    if (error) handleDatabaseError(error, 'Failed to delete request');
  },
};