
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { challongeFetch } from "./lib.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Create Supabase client with auth context
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );

  // Verify authentication
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    console.error('Authentication failed:', userError);
    return json(401, { error: 'Authentication required' });
  }

  // Verify admin status
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    console.error('Admin check failed:', profileError);
    return json(403, { error: 'Admin access required' });
  }

  console.log('Authenticated admin user:', user.id);

  let payload: { action: string; args?: any };
  try {
    payload = await req.json();
  } catch (_) {
    return json(400, { error: "Invalid JSON" });
  }

  // Validate action field
  if (!payload.action || typeof payload.action !== 'string') {
    return json(400, { error: "Invalid action: must be a non-empty string" });
  }

  const validActions = [
    "createTournament", "addParticipant", "startTournament", 
    "getMatches", "getParticipants", "updateMatch", 
    "finalizeTournament", "getTournamentComplete"
  ];
  
  if (!validActions.includes(payload.action)) {
    return json(400, { error: `Invalid action: must be one of ${validActions.join(', ')}` });
  }

  try {
    switch (payload.action) {
      case "createTournament": {
        const { name, url, tournament_type, description } = payload.args;
        
        // Validate required fields
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          return json(400, { error: "Tournament name is required" });
        }
        if (name.trim().length > 100) {
          return json(400, { error: "Tournament name must be 100 characters or less" });
        }
        
        if (!url || typeof url !== 'string' || url.trim().length === 0) {
          return json(400, { error: "Tournament URL is required" });
        }
        if (!/^[a-z0-9_-]+$/i.test(url)) {
          return json(400, { error: "Tournament URL must contain only letters, numbers, hyphens, and underscores" });
        }
        if (url.length > 50) {
          return json(400, { error: "Tournament URL must be 50 characters or less" });
        }
        
        if (!tournament_type || typeof tournament_type !== 'string') {
          return json(400, { error: "Tournament type is required" });
        }
        const validTypes = ['single elimination', 'double elimination', 'round robin', 'swiss'];
        if (!validTypes.includes(tournament_type.toLowerCase())) {
          return json(400, { error: `Tournament type must be one of: ${validTypes.join(', ')}` });
        }
        
        if (description && typeof description === 'string' && description.length > 500) {
          return json(400, { error: "Description must be 500 characters or less" });
        }
        const body = { tournament: { name, url, tournament_type, description } };
        const data = await challongeFetch("POST", "/tournaments", body);
        return json(200, data);
      }
      case "addParticipant": {
        const { tournamentId, name, seed, misc } = payload.args;
        
        if (!tournamentId || typeof tournamentId !== 'string') {
          return json(400, { error: "Tournament ID is required" });
        }
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          return json(400, { error: "Participant name is required" });
        }
        if (name.trim().length > 100) {
          return json(400, { error: "Participant name must be 100 characters or less" });
        }
        if (seed !== undefined && seed !== null && (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 1)) {
          return json(400, { error: "Seed must be a positive integer" });
        }
        const body = { participant: { name, seed, misc } };
        const data = await challongeFetch(
          "POST",
          `/tournaments/${tournamentId}/participants`,
          body,
        );
        return json(200, data);
      }
      case "startTournament": {
        const { tournamentId } = payload.args;
        const data = await challongeFetch(
          "POST",
          `/tournaments/${tournamentId}/start`,
        );
        return json(200, data);
      }
      case "getMatches": {
        const { tournamentId } = payload.args;
        const data = await challongeFetch(
          "GET",
          `/tournaments/${tournamentId}/matches`,
        );
        return json(200, data);
      }
      case "getParticipants": {
        const { tournamentId } = payload.args;
        const data = await challongeFetch(
          "GET",
          `/tournaments/${tournamentId}/participants`,
        );
        return json(200, data);
      }
      case "updateMatch": {
        const { tournamentId, matchId, scores_csv, winner_id } = payload.args;
        const body = { match: { scores_csv, winner_id } };
        const data = await challongeFetch("PUT", `/tournaments/${tournamentId}/matches/${matchId}`, body);
        return json(200, data);
      }
      case "finalizeTournament": {
        const { tournamentId } = payload.args;
        const data = await challongeFetch(
          "POST",
          `/tournaments/${tournamentId}/finalize`,
        );
        return json(200, data);
      }
      case "getTournamentComplete": {
        const { tournamentId } = payload.args;
        const data = await challongeFetch(
          "GET",
          `/tournaments/${tournamentId}?include_participants=1&include_matches=1`,
        );
        return json(200, data);
      }
      default:
        return json(400, { error: "Unknown action" });
    }
  } catch (e) {
    console.error(e);
    // Send plain string for frontend toast
    return json(500, { error: String(e.message || e) });
  }
});
