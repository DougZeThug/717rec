import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ signup: vi.fn(), contact: vi.fn(), submit: vi.fn() }));
vi.mock('@/utils/analytics', () => ({
  trackLeagueSignup: mocks.signup,
  trackContactForm: mocks.contact,
}));
vi.mock('@/services/contact/ContactSubmissionService', () => ({
  submitContactMessage: mocks.submit,
}));
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => ({ activeMembership: null }),
}));

import { ContactForm } from '../ContactForm';

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
  );
  vi.clearAllMocks();
  mocks.submit.mockImplementation(async () => undefined);
});

describe('Join form attribution', () => {
  it.each([
    ['/contact?type=join_league&solo=true&source=join_page', 'join_page'],
    ['/contact?type=join_league&solo=true&source=untrusted-value', 'contact_page'],
    ['/contact?type=join_league&solo=true', 'contact_page'],
  ])('allowlists the source for %s', async (path, source) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <ContactForm onSent={vi.fn()} />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText(/^name/i), 'Test Player');
    await userEvent.type(screen.getByLabelText(/contact \(email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^message$/i), 'Please sign me up for the league.');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));
    await waitFor(() =>
      expect(mocks.signup).toHaveBeenCalledExactlyOnceWith({ source, signup_kind: 'solo' })
    );
    expect(mocks.contact).toHaveBeenCalledExactlyOnceWith('join_league');
  });

  it('uses the changed checkbox state rather than the solo link', async () => {
    render(
      <MemoryRouter initialEntries={['/contact?type=join_league&solo=true&source=join_page']}>
        <ContactForm onSent={vi.fn()} />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /joining solo/i }));
    await userEvent.type(screen.getByLabelText(/^name/i), 'Test Player');
    await userEvent.type(screen.getByLabelText(/contact \(email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/proposed team name/i), 'Test Team');
    await userEvent.type(
      screen.getByLabelText(/^message$/i),
      'Please sign our team up for the league.'
    );
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));
    await waitFor(() =>
      expect(mocks.signup).toHaveBeenCalledExactlyOnceWith({
        source: 'join_page',
        signup_kind: 'team',
      })
    );
  });
});
