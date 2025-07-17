// Minimal helper for HTTPS calls to Challonge v1
export async function challongeFetch(
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
