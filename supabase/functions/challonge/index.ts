
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

  let payload: { action: string; args?: any };
  try {
    payload = await req.json();
  } catch (_) {
    return json(400, { error: "Invalid JSON" });
  }

  try {
    switch (payload.action) {
      case "createTournament": {
        const { name, url } = payload.args;
        const body = { tournament: { name, url } };
        const data = await challongeFetch("POST", "/tournaments", body);
        return json(200, data);
      }
      case "addParticipant": {
        const { tournamentId, name, misc_info } = payload.args;
        const body = { participant: { name, misc_info } };
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
      case "updateMatch": {
        const { matchId, scores_csv, winner_id } = payload.args;
        const body = { match: { scores_csv, winner_id } };
        const data = await challongeFetch("PUT", `/matches/${matchId}`, body);
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
      default:
        return json(400, { error: "Unknown action" });
    }
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message });
  }
});
