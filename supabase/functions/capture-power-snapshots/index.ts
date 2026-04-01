import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamPowerScore {
  team_id: string;
  power_score: number;
  sos: number;
  wins: number;
  losses: number;
  game_wins: number;
  game_losses: number;
  division_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate webhook secret for cron calls
  const webhookSecret = Deno.env.get('CRON_WEBHOOK_SECRET');
  const authHeader = req.headers.get('Authorization');

  if (!webhookSecret) {
    console.error('[capture-power-snapshots] CRON_WEBHOOK_SECRET not configured');
    return new Response(JSON.stringify({ success: false, error: 'Server configuration error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  if (authHeader !== `Bearer ${webhookSecret}`) {
    console.warn('[capture-power-snapshots] Unauthorized request attempt');
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[capture-power-snapshots] Starting weekly snapshot capture...');

    // 1. Get active season
    const { data: activeSeason, error: seasonError } = await supabase
      .from('seasons')
      .select('id, name, start_date')
      .eq('is_active', true)
      .single();

    if (seasonError || !activeSeason) {
      console.error('[capture-power-snapshots] No active season found:', seasonError);
      return new Response(JSON.stringify({ success: false, error: 'No active season found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(
      `[capture-power-snapshots] Active season: ${activeSeason.name} (${activeSeason.id})`
    );

    // 2. Calculate current week number
    const { data: weekData, error: weekError } = await supabase.rpc('get_season_week_number', {
      p_season_id: activeSeason.id,
      p_date: new Date().toISOString().split('T')[0],
    });

    if (weekError) {
      console.error('[capture-power-snapshots] Error calculating week number:', weekError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to calculate week number' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const weekNumber = weekData as number;
    console.log(`[capture-power-snapshots] Current week number: ${weekNumber}`);

    // 3. Fetch season-scoped power scores via RPC (filters matches by season)
    const { data: teams, error: teamsError } = await supabase
      .rpc('get_season_team_power_scores', { p_season_id: activeSeason.id });

    if (teamsError) {
      console.error('[capture-power-snapshots] Error fetching team data:', teamsError);
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch team data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`[capture-power-snapshots] Found ${teams?.length || 0} teams with power scores`);

    if (!teams || teams.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No teams with power scores to snapshot',
          count: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamIds = teams.map((t) => t.team_id);

    // 4. Check which teams already have snapshots for this week
    const { data: existingSnapshots } = await supabase
      .from('power_score_snapshots')
      .select('team_id')
      .eq('season_id', activeSeason.id)
      .eq('week_number', weekNumber)
      .in('team_id', teamIds);

    const teamsWithSnapshots = new Set(existingSnapshots?.map((s) => s.team_id) || []);
    const teamsNeedingSnapshots = teams.filter((t) => !teamsWithSnapshots.has(t.team_id));

    // If all teams already have snapshots, skip
    if (teamsNeedingSnapshots.length === 0) {
      console.log(
        `[capture-power-snapshots] Snapshots already exist for all ${teamIds.length} teams in week ${weekNumber}`
      );
      return new Response(
        JSON.stringify({
          success: true,
          message: `Snapshots already exist for all ${teamIds.length} teams in week ${weekNumber}`,
          skipped: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(
      `[capture-power-snapshots] ${teamsWithSnapshots.size} teams already have snapshots, creating for ${teamsNeedingSnapshots.length} remaining teams`
    );

    // 5. Prepare snapshot records only for teams that don't have one
    const snapshotDate = new Date().toISOString().split('T')[0];
    const snapshots = teamsNeedingSnapshots.map((team) => ({
      team_id: team.team_id,
      season_id: activeSeason.id,
      week_number: weekNumber,
      snapshot_date: snapshotDate,
      power_score: team.power_score,
      sos: team.sos,
      match_wins: team.wins || 0,
      match_losses: team.losses || 0,
      game_wins: team.game_wins || 0,
      game_losses: team.game_losses || 0,
      division_id: team.division_id,
    }));

    // 6. Batch insert into power_score_snapshots
    const { error: insertError } = await supabase.from('power_score_snapshots').insert(snapshots);

    if (insertError) {
      console.error('[capture-power-snapshots] Error inserting snapshots:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to insert snapshots',
          details: insertError.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(
      `[capture-power-snapshots] Successfully captured ${snapshots.length} team snapshots for week ${weekNumber}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Captured ${snapshots.length} team snapshots`,
        season: activeSeason.name,
        week: weekNumber,
        count: snapshots.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[capture-power-snapshots] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Unexpected error', details: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
