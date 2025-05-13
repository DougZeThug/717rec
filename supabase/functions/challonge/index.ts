
// Supabase Edge Function for Challonge API Integration
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Setup Challonge API base URL
const CHALLONGE_API_BASE = "https://api.challonge.com/v1";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get API key from environment variable
    const apiKey = Deno.env.get("CHALLONGE_API_KEY");
    if (!apiKey) {
      throw new Error("Challonge API key not configured");
    }
    
    // Parse the request body
    const { action, tournamentId, matchId, participantData, tournamentData, scoreData } = await req.json();
    
    // Set up auth and common headers
    const authString = btoa(`${apiKey}:`);
    const headers = {
      "Authorization": `Basic ${authString}`,
      "Content-Type": "application/json",
      ...corsHeaders
    };
    
    let url;
    let method;
    let body;
    
    switch (action) {
      case "createTournament":
        url = `${CHALLONGE_API_BASE}/tournaments.json`;
        method = "POST";
        body = JSON.stringify({ tournament: tournamentData });
        break;
        
      case "addParticipant":
        url = `${CHALLONGE_API_BASE}/tournaments/${tournamentId}/participants.json`;
        method = "POST";
        body = JSON.stringify({ participant: participantData });
        break;
        
      case "getTournament":
        url = `${CHALLONGE_API_BASE}/tournaments/${tournamentId}.json?include_participants=1&include_matches=1`;
        method = "GET";
        break;
        
      case "getMatches":
        url = `${CHALLONGE_API_BASE}/tournaments/${tournamentId}/matches.json`;
        method = "GET";
        break;
        
      case "updateMatch":
        url = `${CHALLONGE_API_BASE}/tournaments/${tournamentId}/matches/${matchId}.json`;
        method = "PUT";
        body = JSON.stringify({ match: scoreData });
        break;
        
      case "startTournament":
        url = `${CHALLONGE_API_BASE}/tournaments/${tournamentId}/start.json`;
        method = "POST";
        break;
        
      case "finalizeTournament":
        url = `${CHALLONGE_API_BASE}/tournaments/${tournamentId}/finalize.json`;
        method = "POST";
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error("Challonge API error:", data);
      throw new Error(`Challonge API error: ${JSON.stringify(data)}`);
    }
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("Error in Challonge function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
