import { supabase } from '@/integrations/supabase/client';
import { SupportTicketService } from '@/services/support/SupportTicketService';
import { handleDatabaseError } from '@/utils/errorHandler';

export interface LastPowerSnapshot {
  created_at: string;
  snapshot_date: string;
  week_number: number;
  season_id: string;
  row_count: number;
}

export interface PendingOpsCounts {
  pendingScoreSubmissions: number;
  pendingTeamRequests: number;
  /** Unresolved league requests from the home page panel. */
  newContactRequests: number;
  /** Unresolved support tickets from /contact. */
  newSupportTickets: number;
  /**
   * Everything unresolved in the admin Contact Inbox. The inbox lists both
   * sources, so the tile that links to it must count both.
   */
  newInboxMessages: number;
}

export const OpsHealthService = {
  fetchLastPowerSnapshot: async (): Promise<LastPowerSnapshot | null> => {
    const { data, error } = await supabase
      .from('power_score_snapshots')
      .select('created_at, snapshot_date, week_number, season_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to fetch last power snapshot');
    if (!data || !data.created_at) return null;

    const createdAt = data.created_at;

    const { count, error: countError } = await supabase
      .from('power_score_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('created_at', createdAt);

    if (countError) handleDatabaseError(countError, 'Failed to count power snapshot rows');

    return {
      created_at: createdAt,
      snapshot_date: data.snapshot_date,
      week_number: data.week_number,
      season_id: data.season_id,
      row_count: count ?? 0,
    };
  },

  fetchPendingOpsCounts: async (): Promise<PendingOpsCounts> => {
    const [ss, tr, cr, st] = await Promise.all([
      supabase
        .from('score_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('team_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
      supabase
        .from('contact_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new'),
      // Owns the untyped binding for a table missing from the generated types,
      // and yields 0 rather than throwing when the migration is not applied.
      SupportTicketService.countNew(),
    ]);

    if (ss.error) handleDatabaseError(ss.error, 'Failed to count pending score submissions');
    if (tr.error) handleDatabaseError(tr.error, 'Failed to count pending team requests');
    if (cr.error) handleDatabaseError(cr.error, 'Failed to count new contact requests');

    const newContactRequests = cr.count ?? 0;

    return {
      pendingScoreSubmissions: ss.count ?? 0,
      pendingTeamRequests: tr.count ?? 0,
      newContactRequests,
      newSupportTickets: st,
      newInboxMessages: newContactRequests + st,
    };
  },
};
