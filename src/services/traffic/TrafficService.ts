import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

export interface DailyTrafficRow {
  day: string; // YYYY-MM-DD (America/New_York)
  visitors: number;
  pageviews: number;
  ios_visitors: number;
  android_visitors: number;
  other_visitors: number;
}

export const TrafficService = {
  /**
   * Fetches per-day traffic aggregates from `v_daily_traffic` (admin-only view).
   * Returns rows for the last `days` days, oldest first, with zero-fill omitted
   * — callers decide whether to fill missing days for charting.
   */
  fetchDailyTraffic: async (days = 30): Promise<DailyTrafficRow[]> => {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    const sinceIso = since.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('v_daily_traffic')
      .select('day, visitors, pageviews, ios_visitors, android_visitors, other_visitors')
      .gte('day', sinceIso)
      .order('day', { ascending: true });

    if (error) handleDatabaseError(error, 'Failed to fetch daily traffic');
    return (data ?? []) as DailyTrafficRow[];
  },
};
