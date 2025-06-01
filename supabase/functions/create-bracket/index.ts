import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Inlined challongeFetch helper to avoid cross-function imports
async function challongeFetch(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body: Record<string, unknown> | null = null,
) {
  const apiKey = Deno.env.get("CHALLONGE_API_KEY");
  if (!apiKey) throw new Error("CHALLONGE_API_KEY missing");

  const url = `https://api.challonge.com/v1${path}.json?api_key=${apiKey}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!res.ok) {
    let msg = await res.text();
    try {
      const json = JSON.parse(msg);
      if (json.errors) {
        msg = Array.isArray(json.errors) ? json.errors.join(', ') : json.errors;
      }
    } catch (_) {
      // keep raw msg if JSON parsing fails
    }
    throw new Error(`Challonge ${res.status}: ${msg}`);
  }
  
  return await res.json();
}

interface CreateBracketPayload {
  name: string;
  divisionId: string;
  format: 'singleElim' | 'doubleElim';
  teams: Array<{
    id: string;
    name: string;
    seed?: number;
  }>;
}

interface BracketRecord {
  id: string;
  challonge_tournament_id: number;
  division_id: string;
  title: string;
  format: string;
  state: string;
  created_at: string;
  participants: unknown;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    const payload: CreateBracketPayload = await req.json();
    
    console.log('[BRACKET] Creating bracket with payload:', JSON.stringify(payload, null, 2));

    // Validate payload
    if (!payload.name || !payload.divisionId || !payload.teams || payload.teams.length < 2) {
      throw new Error('Invalid payload: name, divisionId, and at least 2 teams are required');
    }

    // Transform teams to Challonge participants
    const participants = payload.teams
      .sort((a, b) => (a.seed || 999) - (b.seed || 999))
      .map((team, index) => ({
        name: team.name,
        seed: team.seed || (index + 1),
        misc: JSON.stringify({ teamId: team.id })
      }));

    console.log('[BRACKET] Prepared participants:', JSON.stringify(participants, null, 2));

    // Check API key availability
    const challongeApiKey = Deno.env.get('CHALLONGE_API_KEY');
    if (!challongeApiKey) {
      throw new Error('Challonge API key not configured');
    }

    console.log('[CHALLONGE] API key configured, proceeding with tournament creation');

    const tournamentType = payload.format === 'singleElim' ? 'single elimination' : 'double elimination';
    const tournamentUrl = `${payload.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`;

    console.log('[CHALLONGE] Creating tournament with type:', tournamentType, 'and URL:', tournamentUrl);

    // Create tournament using v1 API with challongeFetch helper
    const tournamentData = await challongeFetch('POST', '/tournaments', {
      tournament: {
        name: payload.name,
        url: tournamentUrl,
        tournament_type: tournamentType,
        description: `Tournament created for ${payload.name}`
      }
    });

    console.log('[CHALLONGE] Tournament created successfully:', JSON.stringify(tournamentData, null, 2));

    const tournament = tournamentData.tournament;
    const tournamentId = tournament.id;
    const tournamentUrlSlug = tournament.url;

    console.log('[CHALLONGE] Tournament details - ID:', tournamentId, 'URL:', tournamentUrlSlug);

    // Add participants to tournament using v1 API
    console.log('[CHALLONGE] Adding participants to tournament...');
    
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      console.log(`[CHALLONGE] Adding participant ${i + 1}/${participants.length}:`, participant.name);
      
      try {
        const participantData = await challongeFetch('POST', `/tournaments/${tournamentId}/participants`, {
          participant: {
            name: participant.name,
            seed: participant.seed,
            misc: participant.misc
          }
        });
        
        console.log(`[CHALLONGE] Successfully added participant:`, participantData.participant?.name || 'Unknown');
      } catch (error) {
        console.error(`[CHALLONGE] Failed to add participant ${participant.name}:`, error);
        throw new Error(`Failed to add participant ${participant.name}: ${error.message}`);
      }
    }

    console.log('[CHALLONGE] All participants added successfully');

    // Start tournament using v1 API - Use tournament URL, not ID
    console.log('[CHALLONGE] Starting tournament using URL:', tournamentUrlSlug);
    
    try {
      const startData = await challongeFetch('POST', `/tournaments/${tournamentUrlSlug}/start`);
      console.log('[CHALLONGE] Tournament started successfully:', startData.tournament?.state || 'Unknown state');
    } catch (error) {
      console.error('[CHALLONGE] Failed to start tournament:', error);
      console.log('[CHALLONGE] Tournament will remain in pending state and can be started manually later');
      // Don't throw here - allow bracket creation to continue even if starting fails
    }

    // Create Supabase admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[DATABASE] Inserting bracket record...');

    // Insert bracket record into Supabase
    const { data: bracketData, error: insertError } = await supabaseAdmin
      .from('brackets')
      .insert({
        title: payload.name,
        division_id: payload.divisionId,
        format: payload.format,
        state: 'pending',
        challonge_tournament_id: parseInt(tournamentId),
        participants: participants.map(p => ({
          teamId: JSON.parse(p.misc).teamId,
          name: p.name,
          seed: p.seed
        }))
      })
      .select('*')
      .single();

    if (insertError || !bracketData) {
      console.error('[DATABASE] Failed to insert bracket:', insertError);
      throw new Error(`Failed to save bracket: ${insertError?.message || 'No data returned'}`);
    }

    console.log('[DATABASE] Bracket record created:', bracketData.id);

    // Create participants records
    console.log('[DATABASE] Creating participant records...');
    
    for (const team of payload.teams) {
      const { error: participantError } = await supabaseAdmin
        .from('participants')
        .insert({
          bracket_id: bracketData.id,
          team_id: team.id,
          position: team.seed || 1,
          name: team.name
        });
      
      if (participantError) {
        console.error('[DATABASE] Failed to create participant record for team:', team.name, participantError);
        // Continue with other participants rather than failing completely
      }
    }

    console.log('[BRACKET] Bracket creation completed successfully:', bracketData.id);

    const bracketRecord: BracketRecord = {
      id: bracketData.id,
      challonge_tournament_id: bracketData.challonge_tournament_id,
      division_id: bracketData.division_id,
      title: bracketData.title,
      format: bracketData.format,
      state: bracketData.state,
      created_at: bracketData.created_at,
      participants: bracketData.participants
    };

    return new Response(
      JSON.stringify({ success: true, bracket: bracketRecord }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[BRACKET] Error in create-bracket function:', error);
    
    // Parse specific Challonge errors for better user feedback
    let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    let statusCode = 500;
    
    if (errorMessage.includes('Challonge 422')) {
      errorMessage = 'Tournament name already exists or invalid data provided';
      statusCode = 409; // Conflict
    } else if (errorMessage.includes('Challonge 401')) {
      errorMessage = 'Invalid Challonge API credentials';
      statusCode = 401;
    } else if (errorMessage.includes('Authentication required')) {
      statusCode = 401;
    } else if (errorMessage.includes('Invalid payload')) {
      statusCode = 400;
    } else if (errorMessage.includes('Failed to add participant')) {
      errorMessage = 'Failed to add teams to tournament. Please check team names and try again.';
      statusCode = 400;
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
