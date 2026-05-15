import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AdminContext {
  userId: string;
  supabase: SupabaseClient;
  serviceClient: SupabaseClient;
}

export type RequireAdminResult =
  | { ok: true; ctx: AdminContext }
  | { ok: false; response: Response };

function jsonResponse(
  cors: Record<string, string>,
  status: number,
  body: unknown
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

/**
 * Verify the request carries a valid Bearer JWT for an admin user.
 * On failure returns a fully-formed Response (401 / 403 / 500). On success
 * returns the user id, a user-scoped Supabase client (RLS-aware), and a
 * service-role client (RLS bypass) for admin-only writes.
 */
export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<RequireAdminResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return {
      ok: false,
      response: jsonResponse(corsHeaders, 500, { error: 'Server misconfigured' }),
    };
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      ok: false,
      response: jsonResponse(corsHeaders, 401, { error: 'Authentication required' }),
    };
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return {
      ok: false,
      response: jsonResponse(corsHeaders, 401, { error: 'Authentication required' }),
    };
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileErr || !profile?.is_admin) {
    return {
      ok: false,
      response: jsonResponse(corsHeaders, 403, { error: 'Admin access required' }),
    };
  }

  const serviceClient = createClient(supabaseUrl, serviceKey);
  return {
    ok: true,
    ctx: { userId: userData.user.id, supabase, serviceClient },
  };
}