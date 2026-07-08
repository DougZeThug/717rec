import { supabase } from '@/integrations/supabase/client';

import type { LiveScoringClient } from './dbTypes';

// The generated Database type does not know the live-scoring tables yet (the
// migration is applied out-of-band in Lovable), so live-scoring services use
// this cast wrapper — the ONLY place the cast happens.
//
// TODO(live-scoring): delete this file together with dbTypes.ts once types.ts
// has been regenerated, and import `supabase` directly instead.
export const liveDb = supabase as unknown as LiveScoringClient;
