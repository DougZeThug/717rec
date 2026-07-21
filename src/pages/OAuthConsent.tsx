import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

interface AuthorizationDetails {
  client?: { name?: string; client_uri?: string };
  redirect_url?: string;
  redirect_to?: string;
  scopes?: string[];
}

// Supabase auth.oauth is beta; local typed wrapper avoids grepping node_modules.
interface OAuthAuthorizationsApi {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
}
const authOauth = (supabase.auth as unknown as { oauth: OAuthAuthorizationsApi }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError('Missing authorization_id');
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = '/auth?next=' + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await authOauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (err) {
        errorLog('OAuth consent load error', err);
        if (active) setError('Failed to load authorization request');
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await authOauth.approveAuthorization(authorizationId)
        : await authOauth.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        setError(error.message);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        setError('No redirect returned by the authorization server.');
        return;
      }
      window.location.href = target;
    } catch (err) {
      errorLog('OAuth consent decide error', err);
      setBusy(false);
      setError('Failed to complete authorization');
    }
  };

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold mb-3">Authorization error</h1>
        <p className="text-muted-foreground">{error}</p>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <p>Loading…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? 'an app';
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold mb-3">Connect {clientName} to your 717rec account</h1>
      <p className="text-muted-foreground mb-6">
        This will let {clientName} use 717rec on your behalf: read standings, your team, your matches,
        and (if you are an admin) run admin ops tools as you.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => decide(true)} disabled={busy}>
          Approve
        </Button>
        <Button variant="outline" onClick={() => decide(false)} disabled={busy}>
          Deny
        </Button>
      </div>
    </main>
  );
};

export default OAuthConsent;