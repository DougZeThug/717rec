
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    
    console.log('Creating bracket with payload:', payload);

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

    // Create tournament on Challonge
    const challongeApiKey = Deno.env.get('CHALLONGE_API_KEY');
    if (!challongeApiKey) {
      throw new Error('Challonge API key not configured');
    }

    const tournamentType = payload.format === 'singleElim' ? 'single elimination' : 'double elimination';
    const tournamentUrl = `${payload.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`;

    // Create tournament
    const createTournamentResponse = await fetch('https://api.challonge.com/v2/tournaments.json', {
      method: 'POST',
      headers: {
        'Authorization-Type': 'v1',
        'Authorization': challongeApiKey,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        data: {
          type: 'tournaments',
          attributes: {
            name: payload.name,
            url: tournamentUrl,
            tournament_type: tournamentType,
            description: `Tournament created for ${payload.name}`
          }
        }
      })
    });

    if (!createTournamentResponse.ok) {
      const errorText = await createTournamentResponse.text();
      console.error('Challonge tournament creation failed:', errorText);
      throw new Error(`Failed to create Challonge tournament: ${createTournamentResponse.status}`);
    }

    const tournamentData = await createTournamentResponse.json();
    const tournament = tournamentData.data;
    const tournamentId = tournament.id;

    console.log('Tournament created:', tournament);

    // Add participants to tournament
    for (const participant of participants) {
      const addParticipantResponse = await fetch(`https://api.challonge.com/v2/tournaments/${tournamentId}/participants.json`, {
        method: 'POST',
        headers: {
          'Authorization-Type': 'v1',
          'Authorization': challongeApiKey,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: 'participants',
            attributes: {
              name: participant.name,
              seed: participant.seed,
              misc: participant.misc
            }
          }
        })
      });

      if (!addParticipantResponse.ok) {
        const errorText = await addParticipantResponse.text();
        console.error('Failed to add participant:', errorText);
        throw new Error(`Failed to add participant ${participant.name}`);
      }
    }

    // Start tournament
    const startTournamentResponse = await fetch(`https://api.challonge.com/v2/tournaments/${tournamentId}/start.json`, {
      method: 'POST',
      headers: {
        'Authorization-Type': 'v1',
        'Authorization': challongeApiKey,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/json'
      }
    });

    if (!startTournamentResponse.ok) {
      const errorText = await startTournamentResponse.text();
      console.error('Failed to start tournament:', errorText);
      throw new Error('Failed to start tournament');
    }

    console.log('Tournament started successfully');

    // Create Supabase admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
      console.error('Failed to insert bracket:', insertError);
      throw new Error(`Failed to save bracket: ${insertError?.message || 'No data returned'}`);
    }

    // Create participants records
    for (const team of payload.teams) {
      await supabaseAdmin
        .from('participants')
        .insert({
          bracket_id: bracketData.id,
          team_id: team.id,
          position: team.seed || 1,
          name: team.name
        });
    }

    console.log('Bracket created successfully:', bracketData);

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
    console.error('Error in create-bracket function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
