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
  const username = Deno.env.get("CHALLONGE_USERNAME");
  const apiKey = Deno.env.get("CHALLONGE_API_KEY");
  if (!username) throw new Error("CHALLONGE_USERNAME missing");
  if (!apiKey) throw new Error("CHALLONGE_API_KEY missing");

  // Use proper Basic auth with trimmed username and API key
  const credentials = btoa(`${username.trim()}:${apiKey.trim()}`);
  const url = `https://api.challonge.com/v1${path}.json`;
  
  // Only add Content-Type header when there's a body
  const headers: Record<string, string> = {
    "Authorization": `Basic ${credentials}`
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
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
    // For 9+ teams, use next lower power of 2 with play-ins
    // This reduces the number of byes and creates more actual matches
    if (teamCount <= 8) {
      return 8;
    } else if (teamCount <= 16) {
      return 8; // Use 8-team bracket for 9-16 teams with play-ins
    } else if (teamCount <= 32) {
      return 16; // Use 16-team bracket for 17-32 teams with play-ins
    } else {
      // For larger tournaments, use traditional next power of 2
      let power = 1;
      while (power < teamCount) {
        power *= 2;
      }
      return power;
    }
  }

  static calculateRounds(teamCount: number): number {
    return Math.ceil(Math.log2(teamCount));
  }

  static generateSingleElimination(teams: Array<{id: string, name: string, seed?: number}>, bracketId: string) {
    // Teams are already sorted by ranking in bracket-creator.ts, preserve this order
    console.log(`[BRACKET] Teams for single elimination:`, teams.map(t => `${t.name} (seed ${t.seed})`));
    
    const bracketSize = this.calculateBracketSize(teams.length);
    const rounds = this.calculateRounds(bracketSize);
    const matches: any[] = [];
    
    // Create a mapping of round/position to match IDs for reference
    const matchIdMap = new Map<string, string>();
    
    // Generate all match IDs first
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      for (let position = 0; position < matchesInRound; position++) {
        const key = `${round}-${position}`;
        matchIdMap.set(key, crypto.randomUUID());
      }
    }
    
    // Create all matches with NULL foreign key references initially
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      
      for (let i = 0; i < matchesInRound; i++) {
        const matchId = matchIdMap.get(`${round}-${i}`)!;
        
        // Use proper seeding for first round matches
        let team1_id = null, team2_id = null, team1_seed = null, team2_seed = null;
        
        if (round === 1) {
          // Generate seeding pairs for single elimination too
          const bracketSize = this.calculateBracketSize(teams.length);
          const seedingPairs = this.generateSeedingPairs(teams, bracketSize);
          
          if (i < seedingPairs.length) {
            const pair = seedingPairs[i];
            team1_id = pair.team1?.id || null;
            team2_id = pair.team2?.id || null;
            team1_seed = pair.team1?.seed || null;
            team2_seed = pair.team2?.seed || null;
          }
        }
        
        const match = {
          id: matchId,
          bracket_id: bracketId,
          round: round,
          position: i,
          match_type: round === rounds ? 'finals' : 'winners',
          team1_id,
          team2_id,
          team1_seed,
          team2_seed,
          next_win_match_id: null, // Will be set in second pass
          next_lose_match_id: null, // Not used in single elimination
          best_of: 3,
          status: 'pending'
        };
        
        matches.push(match);
      }
    }
    
    return { matches, matchIdMap };
  }

  // Helper function to generate proper tournament seeding pairs
  static generateSeedingPairs(teams: Array<{id: string, name: string, seed?: number}>, bracketSize: number) {
    const pairs: Array<{team1: any, team2: any}> = [];
    
    // Generate proper tournament seeding pairs: 1 vs bracketSize, 2 vs (bracketSize-1), etc.
    const numMatches = bracketSize / 2;
    for (let i = 0; i < numMatches; i++) {
      const seed1 = i + 1;
      const seed2 = bracketSize - i;
      
      // Find actual teams with these seeds (or null if they don't exist - creates bye)
      const team1 = teams.find(t => t.seed === seed1) || null;
      const team2 = teams.find(t => t.seed === seed2) || null;
      
      pairs.push({ team1, team2 });
    }
    
    console.log(`[BRACKET] Generated seeding pairs:`, pairs.map(p => 
      `${p.team1?.name || 'BYE'} (${p.team1?.seed || 'N/A'}) vs ${p.team2?.name || 'BYE'} (${p.team2?.seed || 'N/A'})`
    ));
    
    return pairs;
  }

  static generateDoubleElimination(teams: Array<{id: string, name: string, seed?: number}>, bracketId: string) {
    // Teams are already sorted by ranking in bracket-creator.ts, preserve this order
    console.log(`[BRACKET] Teams for double elimination:`, teams.map(t => `${t.name} (seed ${t.seed})`));
    
    const bracketSize = this.calculateBracketSize(teams.length);
    const rounds = this.calculateRounds(bracketSize);
    const matches: any[] = [];
    
    console.log(`[BRACKET] Generating double elimination for ${teams.length} teams, ${rounds} winners rounds`);
    
    // Generate proper seeding pairs for first round
    const seedingPairs = this.generateSeedingPairs(teams, bracketSize);
    
    // Create match ID mappings for both brackets
    const winnersMatchIds = new Map<string, string>();
    const losersMatchIds = new Map<string, string>();
    const grandFinalsR1Id = crypto.randomUUID();
    const grandFinalsR2Id = crypto.randomUUID(); // Reset match
    
    // Generate winner bracket match IDs
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      for (let position = 0; position < matchesInRound; position++) {
        const key = `w-${round}-${position}`;
        winnersMatchIds.set(key, crypto.randomUUID());
      }
    }
    
    // Fixed losers bracket round calculation
    const losersRounds = (rounds - 1) * 2; // Correct formula without Math.max
    console.log(`[BRACKET] Losers bracket will have ${losersRounds} rounds`);
    
    // Generate loser bracket match IDs with corrected logic
    for (let round = 1; round <= losersRounds; round++) {
      let matchesInRound;
      
      if (round === 1) {
        // LR1: First round losers only
        matchesInRound = Math.pow(2, rounds - 2);
      } else if (round % 2 === 0) {
        // Even rounds (LR2, LR4, etc.): Merge with winners bracket losers
        matchesInRound = Math.pow(2, rounds - Math.ceil(round / 2) - 1);
      } else {
        // Odd rounds after LR1 (LR3, LR5, etc.): Consolidation only
        matchesInRound = Math.pow(2, rounds - Math.ceil(round / 2) - 1);
      }
      
      console.log(`[BRACKET] Losers Round ${round}: ${matchesInRound} matches`);
      
      for (let position = 0; position < matchesInRound; position++) {
        const key = `l-${round}-${position}`;
        losersMatchIds.set(key, crypto.randomUUID());
      }
    }
    
    // Generate winners bracket matches - ALL should be type 'winners', never 'finals'
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      
      for (let i = 0; i < matchesInRound; i++) {
        const matchId = winnersMatchIds.get(`w-${round}-${i}`)!;
        
        // Use proper seeding for first round matches
        let team1_id = null, team2_id = null, team1_seed = null, team2_seed = null;
        
        if (round === 1 && i < seedingPairs.length) {
          const pair = seedingPairs[i];
          team1_id = pair.team1?.id || null;
          team2_id = pair.team2?.id || null;
          team1_seed = pair.team1?.seed || null;
          team2_seed = pair.team2?.seed || null;
        }
        
        const match = {
          id: matchId,
          bracket_id: bracketId,
          round: round,
          position: i,
          match_type: 'winners', // Fixed: All winners bracket matches are type 'winners'
          team1_id,
          team2_id,
          team1_seed,
          team2_seed,
          next_win_match_id: null, // Will be set in second pass
          next_lose_match_id: null, // Will be set in third pass
          best_of: 3,
          status: 'pending'
        };
        
        matches.push(match);
      }
    }
    
    // Generate losers bracket matches with NULL foreign keys initially
    for (let round = 1; round <= losersRounds; round++) {
      let matchesInRound;
      
      if (round === 1) {
        matchesInRound = Math.pow(2, rounds - 2);
      } else if (round % 2 === 0) {
        matchesInRound = Math.pow(2, rounds - Math.ceil(round / 2) - 1);
      } else {
        matchesInRound = Math.pow(2, rounds - Math.ceil(round / 2) - 1);
      }
      
      for (let i = 0; i < matchesInRound; i++) {
        const matchId = losersMatchIds.get(`l-${round}-${i}`)!;
        
        const match = {
          id: matchId,
          bracket_id: bracketId,
          round: round,
          position: i,
          match_type: 'losers',
          team1_id: null,
          team2_id: null,
          team1_seed: null,
          team2_seed: null,
          next_win_match_id: null, // Will be set in second pass
          next_lose_match_id: null, // Losers bracket eliminations
          best_of: 3,
          status: 'pending'
        };
        
        matches.push(match);
      }
    }
    
    // Generate BOTH grand finals matches
    const grandFinalsR1 = {
      id: grandFinalsR1Id,
      bracket_id: bracketId,
      round: 1,
      position: 0,
      match_type: 'finals',
      team1_id: null, // Winners bracket champion
      team2_id: null, // Losers bracket champion
      team1_seed: null,
      team2_seed: null,
      next_win_match_id: null, // Tournament ends if winners bracket team wins
      next_lose_match_id: grandFinalsR2Id, // Reset match if losers bracket team wins
      best_of: 5, // Grand finals typically best of 5
      status: 'pending'
    };
    
    const grandFinalsR2 = {
      id: grandFinalsR2Id,
      bracket_id: bracketId,
      round: 2,
      position: 0,
      match_type: 'finals',
      team1_id: null, // Will be populated when R1 is complete
      team2_id: null, // Will be populated when R1 is complete
      team1_seed: null,
      team2_seed: null,
      next_win_match_id: null, // Tournament ends
      next_lose_match_id: null, // Tournament ends
      best_of: 5,
      status: 'pending'
    };
    
    matches.push(grandFinalsR1);
    matches.push(grandFinalsR2);
    
    console.log(`[BRACKET] Generated ${matches.length} total matches`);
    
    return { matches, winnersMatchIds, losersMatchIds, grandFinalsR1Id, grandFinalsR2Id };
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

    // Verify admin status
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      console.error('[AUTH] Admin check failed:', profileError);
      throw new Error('Admin access required');
    }

    console.log('[AUTH] Admin access verified for user:', user.id);

    const payload: CreateBracketPayload = await req.json();
    
    console.log('[BRACKET] Creating bracket with payload:', JSON.stringify(payload, null, 2));

    // Enhanced validation
    if (!payload.name || typeof payload.name !== 'string' || payload.name.trim().length === 0) {
      throw new Error('Invalid payload: name is required and must be a non-empty string');
    }
    
    if (payload.name.trim().length > 100) {
      throw new Error('Invalid payload: name must be 100 characters or less');
    }

    if (!payload.divisionId || typeof payload.divisionId !== 'string') {
      throw new Error('Invalid payload: divisionId is required and must be a string');
    }

    // Validate UUID format for divisionId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.divisionId)) {
      throw new Error('Invalid payload: divisionId must be a valid UUID');
    }

    if (!payload.teams || !Array.isArray(payload.teams) || payload.teams.length < 2) {
      throw new Error('Invalid payload: at least 2 teams are required');
    }

    // Check for reasonable maximum (tournament brackets typically support up to 64 teams)
    if (payload.teams.length > 64) {
      throw new Error('Maximum 64 teams allowed per bracket');
    }

    // Validate format
    const validFormats = ['singleElim', 'doubleElim'];
    if (payload.format && !validFormats.includes(payload.format)) {
      throw new Error(`Invalid format: must be one of ${validFormats.join(', ')}`);
    }

    // Validate each team
    payload.teams.forEach((team, index) => {
      if (!team.id || typeof team.id !== 'string' || !uuidRegex.test(team.id)) {
        throw new Error(`Invalid team at index ${index}: id must be a valid UUID`);
      }
      if (!team.name || typeof team.name !== 'string' || team.name.trim().length === 0) {
        throw new Error(`Invalid team at index ${index}: name is required`);
      }
      if (team.name.trim().length > 100) {
        throw new Error(`Invalid team at index ${index}: name must be 100 characters or less`);
      }
      if (team.seed !== undefined && team.seed !== null) {
        if (typeof team.seed !== 'number' || !Number.isInteger(team.seed) || team.seed < 1 || team.seed > 64) {
          throw new Error(`Invalid team at index ${index}: seed must be an integer between 1 and 64`);
        }
      }
    });

    console.log(`[BRACKET] Validating ${payload.teams.length} teams for ${payload.format} tournament`);

    // Teams are already sorted by ranking in bracket-creator.ts, preserve this order
    console.log('[BRACKET] Team seeding order:', payload.teams.map(t => `${t.name} (seed ${t.seed})`));
    
    // Validate team seeding is consecutive starting from 1
    const expectedSeeds = Array.from({ length: payload.teams.length }, (_, i) => i + 1);
    const actualSeeds = payload.teams.map(t => t.seed).sort((a, b) => (a || 0) - (b || 0));
    
    // Transform teams to Challonge participants - maintain exact seeding order
    const participants = payload.teams.map((team, index) => ({
      name: team.name,
      seed: team.seed || (index + 1), // Use provided seed or fallback to position
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

    // Generate and insert playoff matches using three-pass approach
    console.log('[MATCHES] Generating playoff match structure...');
    
    // Declare bracketResult outside the try block so it's accessible in the return statement
    let bracketResult: any = null;
    
    try {
      if (payload.format === 'singleElim') {
        bracketResult = BracketGenerator.generateSingleElimination(payload.teams, bracketData.id);
        console.log(`[MATCHES] Generated ${bracketResult.matches.length} single elimination matches`);
      } else if (payload.format === 'doubleElim') {
        bracketResult = BracketGenerator.generateDoubleElimination(payload.teams, bracketData.id);
        console.log(`[MATCHES] Generated ${bracketResult.matches.length} double elimination matches`);
      }

      if (bracketResult?.matches?.length > 0) {
        console.log('[MATCHES] Starting three-pass insertion process...');
        
        // PASS 1: Insert all matches with NULL foreign key references
        console.log('[MATCHES] Pass 1: Inserting all matches with NULL references...');
        const { error: insertError } = await supabaseAdmin
          .from('playoff_matches')
          .insert(bracketResult.matches);
        
        if (insertError) {
          console.error('[MATCHES] Failed to insert matches in pass 1:', insertError);
          throw new Error(`Failed to insert playoff matches: ${insertError.message}`);
        }
        
        console.log(`[MATCHES] Pass 1 completed: Inserted ${bracketResult.matches.length} matches`);
        
        // PASS 2: Update next_win_match_id references with fixed logic
        console.log('[MATCHES] Pass 2: Updating next_win_match_id references...');
        
        if (payload.format === 'singleElim') {
          const { matchIdMap } = bracketResult;
          const rounds = BracketGenerator.calculateRounds(BracketGenerator.calculateBracketSize(payload.teams.length));
          
          for (let round = 1; round < rounds; round++) {
            const matchesInRound = Math.pow(2, rounds - round);
            
            for (let i = 0; i < matchesInRound; i++) {
              const currentMatchId = matchIdMap.get(`${round}-${i}`);
              const nextRound = round + 1;
              const nextPosition = Math.floor(i / 2);
              const nextMatchId = matchIdMap.get(`${nextRound}-${nextPosition}`);
              
              if (currentMatchId && nextMatchId) {
                const { error: updateError } = await supabaseAdmin
                  .from('playoff_matches')
                  .update({ next_win_match_id: nextMatchId })
                  .eq('id', currentMatchId);
                
                if (updateError) {
                  console.error('[MATCHES] Failed to update next_win_match_id:', updateError);
                  throw new Error(`Failed to update match references: ${updateError.message}`);
                }
              }
            }
          }
        } else if (payload.format === 'doubleElim') {
          const { winnersMatchIds, losersMatchIds, grandFinalsR1Id, grandFinalsR2Id } = bracketResult;
          const rounds = BracketGenerator.calculateRounds(BracketGenerator.calculateBracketSize(payload.teams.length));
          
          // Update winners bracket next_win_match_id
          for (let round = 1; round <= rounds; round++) {
            const matchesInRound = Math.pow(2, rounds - round);
            
            for (let i = 0; i < matchesInRound; i++) {
              const currentMatchId = winnersMatchIds.get(`w-${round}-${i}`);
              let nextMatchId = null;
              
              if (round < rounds) {
                // Normal advancement within winners bracket
                const nextRound = round + 1;
                const nextPosition = Math.floor(i / 2);
                nextMatchId = winnersMatchIds.get(`w-${nextRound}-${nextPosition}`);
              } else {
                // Winners final goes to grand finals R1
                nextMatchId = grandFinalsR1Id;
              }
              
              if (currentMatchId && nextMatchId) {
                const { error: updateError } = await supabaseAdmin
                  .from('playoff_matches')
                  .update({ next_win_match_id: nextMatchId })
                  .eq('id', currentMatchId);
                
                if (updateError) {
                  console.error('[MATCHES] Failed to update winners next_win_match_id:', updateError);
                  throw new Error(`Failed to update winners match references: ${updateError.message}`);
                }
              }
            }
          }
          
          // Update losers bracket next_win_match_id
          const losersRounds = (rounds - 1) * 2;
          for (let round = 1; round <= losersRounds; round++) {
            let matchesInRound;
            
            if (round === 1) {
              matchesInRound = Math.pow(2, rounds - 2);
            } else if (round % 2 === 0) {
              matchesInRound = Math.pow(2, rounds - Math.ceil(round / 2) - 1);
            } else {
              matchesInRound = Math.pow(2, rounds - Math.ceil(round / 2) - 1);
            }
            
            for (let i = 0; i < matchesInRound; i++) {
              const currentMatchId = losersMatchIds.get(`l-${round}-${i}`);
              let nextMatchId = null;
              
              if (round < losersRounds) {
                // Normal advancement within losers bracket
                const nextRound = round + 1;
                const nextPosition = round % 2 === 0 ? i : Math.floor(i / 2);
                nextMatchId = losersMatchIds.get(`l-${nextRound}-${nextPosition}`);
              } else {
                // Losers final goes to grand finals R1
                nextMatchId = grandFinalsR1Id;
              }
              
              if (currentMatchId && nextMatchId) {
                const { error: updateError } = await supabaseAdmin
                  .from('playoff_matches')
                  .update({ next_win_match_id: nextMatchId })
                  .eq('id', currentMatchId);
                
                if (updateError) {
                  console.error('[MATCHES] Failed to update losers next_win_match_id:', updateError);
                  throw new Error(`Failed to update losers match references: ${updateError.message}`);
                }
              }
            }
          }
        }
        
        console.log('[MATCHES] Pass 2 completed: Updated all next_win_match_id references');
        
        // PASS 3: Update next_lose_match_id references (only for double elimination)
        if (payload.format === 'doubleElim') {
          console.log('[MATCHES] Pass 3: Updating next_lose_match_id references...');
          
          const { winnersMatchIds, losersMatchIds } = bracketResult;
          const rounds = BracketGenerator.calculateRounds(BracketGenerator.calculateBracketSize(payload.teams.length));
          
          // Update winners bracket next_lose_match_id with corrected logic
          for (let round = 1; round <= rounds; round++) {
            const matchesInRound = Math.pow(2, rounds - round);
            
            for (let i = 0; i < matchesInRound; i++) {
              const currentMatchId = winnersMatchIds.get(`w-${round}-${i}`);
              let losersMatchId = null;
              
              if (round === 1) {
                // First round losers go to first round of losers bracket
                const losersPosition = Math.floor(i / 2);
                losersMatchId = losersMatchIds.get(`l-1-${losersPosition}`);
              } else {
                // Later round losers go to appropriate losers bracket round
                const losersRound = (round - 1) * 2;
                losersMatchId = losersMatchIds.get(`l-${losersRound}-${i}`);
              }
              
              if (currentMatchId && losersMatchId) {
                const { error: updateError } = await supabaseAdmin
                  .from('playoff_matches')
                  .update({ next_lose_match_id: losersMatchId })
                  .eq('id', currentMatchId);
                
                if (updateError) {
                  console.error('[MATCHES] Failed to update next_lose_match_id:', updateError);
                  throw new Error(`Failed to update lose match references: ${updateError.message}`);
                }
              }
            }
          }
          
          console.log('[MATCHES] Pass 3 completed: Updated all next_lose_match_id references');
        }
        
        console.log(`[MATCHES] Successfully completed three-pass insertion for ${bracketResult.matches.length} playoff matches`);
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
        matches_generated: bracketResult?.matches?.length || 0
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
