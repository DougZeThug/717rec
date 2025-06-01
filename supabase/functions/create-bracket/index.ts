
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

// Tournament bracket generation utilities
class BracketGenerator {
  static calculateBracketSize(teamCount: number): number {
    let power = 1;
    while (power < teamCount) {
      power *= 2;
    }
    return power;
  }

  static calculateRounds(teamCount: number): number {
    return Math.ceil(Math.log2(teamCount));
  }

  static generateSingleElimination(teams: Array<{id: string, name: string, seed?: number}>, bracketId: string) {
    const sortedTeams = teams.sort((a, b) => (a.seed || 999) - (b.seed || 999));
    const bracketSize = this.calculateBracketSize(teams.length);
    const rounds = this.calculateRounds(bracketSize);
    const matches: any[] = [];
    
    let matchId = 1;
    
    // Generate all rounds structure first
    const roundMatches: number[][] = [];
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      roundMatches[round] = [];
      for (let i = 0; i < matchesInRound; i++) {
        roundMatches[round].push(matchId++);
      }
    }
    
    // Create first round matches
    const firstRoundMatches = roundMatches[1];
    for (let i = 0; i < firstRoundMatches.length; i++) {
      const matchPosition = i;
      const team1Index = i * 2;
      const team2Index = i * 2 + 1;
      
      const match = {
        id: crypto.randomUUID(),
        bracket_id: bracketId,
        round: 1,
        position: matchPosition,
        match_type: 'winners',
        team1_id: team1Index < sortedTeams.length ? sortedTeams[team1Index].id : null,
        team2_id: team2Index < sortedTeams.length ? sortedTeams[team2Index].id : null,
        team1_seed: team1Index < sortedTeams.length ? sortedTeams[team1Index].seed || (team1Index + 1) : null,
        team2_seed: team2Index < sortedTeams.length ? sortedTeams[team2Index].seed || (team2Index + 1) : null,
        next_win_match_id: rounds > 1 ? crypto.randomUUID() : null,
        best_of: 3,
        status: 'pending'
      };
      
      matches.push(match);
    }
    
    // Create subsequent rounds
    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = roundMatches[round];
      const prevRoundMatches = matches.filter(m => m.round === round - 1);
      
      for (let i = 0; i < matchesInRound.length; i++) {
        const match = {
          id: crypto.randomUUID(),
          bracket_id: bracketId,
          round: round,
          position: i,
          match_type: round === rounds ? 'finals' : 'winners',
          team1_id: null,
          team2_id: null,
          team1_seed: null,
          team2_seed: null,
          next_win_match_id: round < rounds ? crypto.randomUUID() : null,
          best_of: 3,
          status: 'pending'
        };
        
        matches.push(match);
        
        // Update previous round matches to point to this match
        const prevMatch1 = prevRoundMatches[i * 2];
        const prevMatch2 = prevRoundMatches[i * 2 + 1];
        
        if (prevMatch1) {
          prevMatch1.next_win_match_id = match.id;
        }
        if (prevMatch2) {
          prevMatch2.next_win_match_id = match.id;
        }
      }
    }
    
    return matches;
  }

  static generateDoubleElimination(teams: Array<{id: string, name: string, seed?: number}>, bracketId: string) {
    const sortedTeams = teams.sort((a, b) => (a.seed || 999) - (b.seed || 999));
    const bracketSize = this.calculateBracketSize(teams.length);
    const rounds = this.calculateRounds(bracketSize);
    const matches: any[] = [];
    
    // Generate winners bracket (same as single elimination)
    const winnersMatches = this.generateSingleElimination(teams, bracketId);
    matches.push(...winnersMatches);
    
    // Generate losers bracket
    const losersRounds = (rounds - 1) * 2;
    
    for (let round = 1; round <= losersRounds; round++) {
      const isEvenRound = round % 2 === 0;
      const matchesInRound = isEvenRound ? 
        Math.pow(2, rounds - Math.ceil(round / 2) - 1) : 
        Math.pow(2, rounds - Math.ceil(round / 2));
      
      for (let i = 0; i < matchesInRound; i++) {
        const match = {
          id: crypto.randomUUID(),
          bracket_id: bracketId,
          round: round,
          position: i,
          match_type: 'losers',
          team1_id: null,
          team2_id: null,
          team1_seed: null,
          team2_seed: null,
          next_win_match_id: round < losersRounds ? crypto.randomUUID() : null,
          next_lose_match_id: null, // Losers bracket eliminations
          best_of: 3,
          status: 'pending'
        };
        
        matches.push(match);
      }
    }
    
    // Generate grand finals
    const grandFinals = {
      id: crypto.randomUUID(),
      bracket_id: bracketId,
      round: 1,
      position: 0,
      match_type: 'finals',
      team1_id: null, // Winners bracket champion
      team2_id: null, // Losers bracket champion
      team1_seed: null,
      team2_seed: null,
      next_win_match_id: null,
      next_lose_match_id: null,
      best_of: 5, // Grand finals typically best of 5
      status: 'pending'
    };
    
    matches.push(grandFinals);
    
    // Link losers bracket eliminations to winners bracket
    winnersMatches.forEach((winnersMatch, index) => {
      if (winnersMatch.round > 1) {
        // Find corresponding losers bracket match to receive eliminated team
        const correspondingLosersMatch = matches.find(m => 
          m.match_type === 'losers' && 
          m.round === (winnersMatch.round - 1) * 2 - 1
        );
        if (correspondingLosersMatch) {
          winnersMatch.next_lose_match_id = correspondingLosersMatch.id;
        }
      }
    });
    
    return matches;
  }
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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables early
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const challongeApiKey = Deno.env.get('CHALLONGE_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    if (!challongeApiKey) {
      throw new Error('Challonge API key not configured');
    }

    console.log('[ENV] All required environment variables are configured');

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
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

    console.log('[AUTH] User authenticated:', user.id);

    const payload: CreateBracketPayload = await req.json();
    
    console.log('[BRACKET] Creating bracket with payload:', JSON.stringify(payload, null, 2));

    // Enhanced validation
    if (!payload.name || !payload.divisionId || !payload.teams || payload.teams.length < 2) {
      throw new Error('Invalid payload: name, divisionId, and at least 2 teams are required');
    }

    // Check for reasonable maximum (tournament brackets typically support up to 64 teams)
    if (payload.teams.length > 64) {
      throw new Error('Maximum 64 teams allowed per bracket');
    }

    console.log(`[BRACKET] Validating ${payload.teams.length} teams for ${payload.format} tournament`);

    // Transform teams to Challonge participants
    const participants = payload.teams
      .sort((a, b) => (a.seed || 999) - (b.seed || 999))
      .map((team, index) => ({
        name: team.name,
        seed: team.seed || (index + 1),
        misc: JSON.stringify({ teamId: team.id })
      }));

    console.log('[BRACKET] Prepared participants:', JSON.stringify(participants, null, 2));

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
        description: `Tournament created for ${payload.name} with ${payload.teams.length} teams`
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
      supabaseUrl,
      supabaseServiceKey
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
        challonge_tournament_id: parseInt(tournamentId.toString())
      })
      .select('*')
      .single();

    if (insertError || !bracketData) {
      console.error('[DATABASE] Failed to insert bracket:', insertError);
      throw new Error(`Failed to save bracket: ${insertError?.message || 'No data returned'}`);
    }

    console.log('[DATABASE] Bracket record created:', bracketData.id);

    // Create participants records using the dedicated participants table
    console.log('[DATABASE] Creating participant records...');
    
    const participantRecords = payload.teams.map(team => ({
      bracket_id: bracketData.id,
      team_id: team.id,
      position: team.seed || 1,
      name: team.name
    }));

    const { error: participantsError } = await supabaseAdmin
      .from('participants')
      .insert(participantRecords);
    
    if (participantsError) {
      console.error('[DATABASE] Failed to create participant records:', participantsError);
      // Don't fail the entire operation for participant record issues
      console.log('[DATABASE] Bracket created but participant records may be incomplete');
    } else {
      console.log('[DATABASE] Created participant records for all teams');
    }

    // Generate and insert playoff matches
    console.log('[MATCHES] Generating playoff match structure...');
    
    let playoffMatches: any[] = [];
    
    try {
      if (payload.format === 'singleElim') {
        playoffMatches = BracketGenerator.generateSingleElimination(payload.teams, bracketData.id);
        console.log(`[MATCHES] Generated ${playoffMatches.length} single elimination matches`);
      } else if (payload.format === 'doubleElim') {
        playoffMatches = BracketGenerator.generateDoubleElimination(payload.teams, bracketData.id);
        console.log(`[MATCHES] Generated ${playoffMatches.length} double elimination matches`);
      }

      if (playoffMatches.length > 0) {
        console.log('[MATCHES] Inserting playoff matches into database...');
        
        const { error: matchesError } = await supabaseAdmin
          .from('playoff_matches')
          .insert(playoffMatches);
        
        if (matchesError) {
          console.error('[MATCHES] Failed to insert playoff matches:', matchesError);
          throw new Error(`Failed to create playoff matches: ${matchesError.message}`);
        } else {
          console.log(`[MATCHES] Successfully inserted ${playoffMatches.length} playoff matches`);
        }
      }
    } catch (matchError) {
      console.error('[MATCHES] Error generating or inserting matches:', matchError);
      // Don't fail the entire bracket creation, but log the issue
      console.log('[MATCHES] Bracket created but match generation failed - matches can be generated later');
    }

    console.log('[BRACKET] Bracket creation completed successfully:', bracketData.id);

    const bracketRecord: BracketRecord = {
      id: bracketData.id,
      challonge_tournament_id: bracketData.challonge_tournament_id,
      division_id: bracketData.division_id,
      title: bracketData.title,
      format: bracketData.format,
      state: bracketData.state,
      created_at: bracketData.created_at
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        bracket: bracketRecord,
        matches_generated: playoffMatches.length
      }),
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
    } else if (errorMessage.includes('Missing required')) {
      errorMessage = 'Server configuration error. Please contact support.';
      statusCode = 500;
    } else if (errorMessage.includes('Maximum') && errorMessage.includes('teams')) {
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
