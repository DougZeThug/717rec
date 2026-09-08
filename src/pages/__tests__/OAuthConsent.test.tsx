import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetDetails = vi.hoisted(() => vi.fn());
const mockApprove = vi.hoisted(() => vi.fn());
const mockDeny = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      oauth: {
        getAuthorizationDetails: mockGetDetails,
        approveAuthorization: mockApprove,
        denyAuthorization: mockDeny,
      },
    },
  },
}));

const mockErrorLog = vi.hoisted(() => vi.fn());
vi.mock('@/utils/logger', () => ({ errorLog: mockErrorLog }));

import OAuthConsent from '../OAuthConsent';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const renderConsent = (search = '?authorization_id=auth-1') =>
  render(
    <MemoryRouter initialEntries={[`/oauth/consent${search}`]}>
      <OAuthConsent />
    </MemoryRouter>
  );

const signedIn = () => mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });

const ok = (data: unknown) => ({ data, error: null });

describe('OAuthConsent', () => {
  const originalLocation = window.location;

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, href: '', pathname: '/oauth/consent', search: '?a=1' },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = '';
    signedIn();
  });

  describe('loading the request', () => {
    it('shows a loading message until the details arrive', () => {
      mockGetDetails.mockReturnValue(new Promise(() => undefined));
      renderConsent();

      expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('refuses a link with no authorization id', async () => {
      renderConsent('');

      expect(await screen.findByText('Missing authorization_id')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 1, name: 'Authorization error' })
      ).toBeInTheDocument();
      expect(mockGetDetails).not.toHaveBeenCalled();
    });

    // Approving needs a signed-in account, so send the visitor to log in and
    // bring them straight back to the same consent link.
    it('sends a signed-out visitor to sign in and back', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      renderConsent();

      await waitFor(() =>
        expect(window.location.href).toBe(`/auth?next=${encodeURIComponent('/oauth/consent?a=1')}`)
      );
      expect(mockGetDetails).not.toHaveBeenCalled();
    });

    it('shows the message when the authorization server rejects the id', async () => {
      mockGetDetails.mockResolvedValue({ data: null, error: { message: 'Unknown authorization' } });
      renderConsent();

      expect(await screen.findByText('Unknown authorization')).toBeInTheDocument();
    });

    it('reports a failed load without leaking the error to the visitor', async () => {
      const thrown = new Error('network down');
      mockGetDetails.mockRejectedValue(thrown);
      renderConsent();

      expect(await screen.findByText('Failed to load authorization request')).toBeInTheDocument();
      expect(mockErrorLog).toHaveBeenCalledWith('OAuth consent load error', thrown);
    });

    // A request the server already settled comes back with only a redirect.
    // Follow it instead of asking the visitor to approve nothing.
    it('follows an immediate redirect that carries no client', async () => {
      mockGetDetails.mockResolvedValue(ok({ redirect_url: 'https://app.example/cb?code=1' }));
      renderConsent();

      await waitFor(() => expect(window.location.href).toBe('https://app.example/cb?code=1'));
    });
  });

  describe('the consent prompt', () => {
    it('names the app asking for access', async () => {
      mockGetDetails.mockResolvedValue(ok({ client: { name: 'Scorekeeper' } }));
      renderConsent();

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: 'Connect Scorekeeper to your 717rec account',
        })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Deny' })).toBeEnabled();
    });

    it('falls back to a generic name when the client has none', async () => {
      mockGetDetails.mockResolvedValue(ok({ client: {} }));
      renderConsent();

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: 'Connect an app to your 717rec account',
        })
      ).toBeInTheDocument();
    });
  });

  describe('deciding', () => {
    const promptFor = (details: unknown = { client: { name: 'Scorekeeper' } }) => {
      mockGetDetails.mockResolvedValue(ok(details));
      renderConsent();
      return screen.findByRole('button', { name: 'Approve' });
    };

    it('approves and follows the returned redirect', async () => {
      const approve = await promptFor();
      mockApprove.mockResolvedValue(ok({ redirect_url: 'https://app.example/cb?code=ok' }));

      await userEvent.click(approve);

      expect(mockApprove).toHaveBeenCalledWith('auth-1');
      await waitFor(() => expect(window.location.href).toBe('https://app.example/cb?code=ok'));
    });

    it('denies and follows the redirect_to fallback', async () => {
      await promptFor();
      mockDeny.mockResolvedValue(ok({ redirect_to: 'https://app.example/cb?error=denied' }));

      await userEvent.click(screen.getByRole('button', { name: 'Deny' }));

      expect(mockDeny).toHaveBeenCalledWith('auth-1');
      expect(mockApprove).not.toHaveBeenCalled();
      await waitFor(() => expect(window.location.href).toBe('https://app.example/cb?error=denied'));
    });

    it('shows the server message when the decision is rejected', async () => {
      const approve = await promptFor();
      mockApprove.mockResolvedValue({ data: null, error: { message: 'Authorization expired' } });

      await userEvent.click(approve);

      expect(await screen.findByText('Authorization expired')).toBeInTheDocument();
      expect(window.location.href).toBe('');
    });

    // Without a redirect there is nowhere to send the visitor, so say so
    // rather than leaving the buttons spinning.
    it('explains when the server returns no redirect', async () => {
      const approve = await promptFor();
      mockApprove.mockResolvedValue(ok({}));

      await userEvent.click(approve);

      expect(
        await screen.findByText('No redirect returned by the authorization server.')
      ).toBeInTheDocument();
    });

    it('reports a failed decision without leaking the error', async () => {
      const approve = await promptFor();
      const thrown = new Error('network down');
      mockApprove.mockRejectedValue(thrown);

      await userEvent.click(approve);

      expect(await screen.findByText('Failed to complete authorization')).toBeInTheDocument();
      expect(mockErrorLog).toHaveBeenCalledWith('OAuth consent decide error', thrown);
    });
  });
});
