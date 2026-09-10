import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSubmit = vi.fn();
const mockToast = vi.hoisted(() => vi.fn());
let mockUser: { email?: string; user_metadata?: { full_name?: string; name?: string } } | null =
  null;
let mockMembership: { team?: { name: string }; rejected_at?: string } | null = null;

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/hooks/useTeamMembership', () => ({
  // Mirrors the real hook: a refused request is a row, but not a team the
  // person belongs to, so activeMembership drops it.
  useTeamMembership: () => ({
    membership: mockMembership,
    activeMembership: mockMembership?.rejected_at ? null : mockMembership,
  }),
}));

vi.mock('@/services/contact/ContactSubmissionService', () => ({
  submitContactMessage: (...args: unknown[]) => mockSubmit(...args),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast }),
}));

import { ContactForm } from '../ContactForm';

const onSent = vi.fn();

const formElement = () => <ContactForm onSent={onSent} />;

const renderForm = (path = '/contact') =>
  render(<MemoryRouter initialEntries={[path]}>{formElement()}</MemoryRouter>);

const pickTopic = async (label: string | RegExp) => {
  await userEvent.click(screen.getByRole('combobox', { name: /what is this about/i }));
  await userEvent.click(await screen.findByRole('option', { name: label }));
};

const fillMessage = (text = 'Please move our match to the later slot.') =>
  userEvent.type(screen.getByLabelText(/^message$/i), text);

beforeEach(() => {
  mockUser = null;
  mockMembership = null;
  onSent.mockReset();
  mockToast.mockReset();
  mockSubmit.mockReset();
  mockSubmit.mockResolvedValue(undefined);
});

describe('ContactForm', () => {
  it('asks what the message is about, in one list', async () => {
    renderForm();

    await userEvent.click(screen.getByRole('combobox', { name: /what is this about/i }));

    for (const label of [
      'Timeslot request',
      'Score update or correction',
      'Join the league',
      'Report a bug',
      'Account problem',
      'Suggest an improvement',
      'General question',
    ]) {
      expect(await screen.findByRole('option', { name: label })).toBeInTheDocument();
    }
  });

  it('says nothing about a second form anywhere', () => {
    const { container } = renderForm();

    expect(screen.queryByRole('link', { name: /home page/i })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/instead/i);
  });

  it('opens on the topic the address names', () => {
    renderForm('/contact?type=join_league');

    expect(screen.getByRole('combobox', { name: /what is this about/i })).toHaveTextContent(
      'Join the league'
    );
    expect(screen.getByLabelText(/proposed team name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/players/i)).toBeInTheDocument();
  });

  it('ignores an address naming a topic that does not exist', () => {
    renderForm('/contact?type=order_a_pizza');

    expect(screen.getByRole('combobox', { name: /what is this about/i })).toHaveTextContent(
      'General question'
    );
  });

  it('asks who else is playing only when joining the league', async () => {
    renderForm();

    expect(screen.queryByLabelText(/players/i)).not.toBeInTheDocument();

    await pickTopic('Join the league');

    expect(screen.getByLabelText(/players/i)).toBeInTheDocument();
  });

  it('will not send a league sign-up with no team name', async () => {
    renderForm('/contact?type=join_league');

    await userEvent.type(screen.getByLabelText(/^name/i), 'Casey Captain');
    await userEvent.type(screen.getByLabelText(/contact/i), 'captain@example.com');
    await fillMessage('We would like to enter a team next season.');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/give the team name/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('asks for an email, not a phone number, on a topic answered by email', async () => {
    renderForm();
    await pickTopic('Report a bug');

    await userEvent.type(screen.getByLabelText(/^name/i), 'Casey Captain');
    await userEvent.type(screen.getByLabelText(/^email$/i), '717-555-1234');
    await fillMessage('The bracket page will not open on my phone.');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/answered by email/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('takes a phone number for league business', async () => {
    renderForm();
    await pickTopic('Timeslot request');

    await userEvent.type(screen.getByLabelText(/^name/i), 'Casey Captain');
    await userEvent.type(screen.getByLabelText(/contact/i), '717-555-1234');
    await fillMessage();
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
  });

  it('sends the topic that was picked, so it reaches the right inbox', async () => {
    renderForm();
    await pickTopic('Report a bug');

    await userEvent.type(screen.getByLabelText(/^name/i), 'Casey Captain');
    await userEvent.type(screen.getByLabelText(/^email$/i), 'captain@example.com');
    await fillMessage('The bracket page will not open on my phone.');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ topic: expect.objectContaining({ value: 'bug' }) })
    );
    expect(onSent).toHaveBeenCalled();
  });

  it('says so rather than pretending, when the message could not be sent', async () => {
    mockSubmit.mockRejectedValue(new Error('Too many messages, try later'));
    renderForm();

    await userEvent.type(screen.getByLabelText(/^name/i), 'Casey Captain');
    await userEvent.type(screen.getByLabelText(/contact/i), 'captain@example.com');
    await fillMessage();
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    expect(onSent).not.toHaveBeenCalled();
  });

  // These three moved here from the home panel's tests when the two forms
  // became one. They encode the rule that signed-in values are derived during
  // render, never copied into state by an effect.
  describe('a signed-in member', () => {
    // The label reads "Name Verified" once the badge appears, which is why the
    // matcher is not anchored at the end.
    it('derives verified fields when the signed-in data arrives after the first render', () => {
      const { rerender } = renderForm();

      expect(screen.getByLabelText(/^name/i)).toHaveValue('');

      mockUser = { email: 'captain@example.com', user_metadata: { full_name: 'Casey Captain' } };
      mockMembership = { team: { name: 'Rail Riders' } };
      rerender(<MemoryRouter initialEntries={['/contact']}>{formElement()}</MemoryRouter>);

      expect(screen.getByLabelText(/^name/i)).toHaveValue('Casey Captain');
      expect(screen.getByLabelText(/team name/i)).toHaveValue('Rail Riders');
      expect(screen.getByLabelText(/contact/i)).toHaveValue('captain@example.com');
    });

    it('sends the derived values without copying them through an effect', async () => {
      mockUser = { email: 'captain@example.com', user_metadata: { full_name: 'Casey Captain' } };
      mockMembership = { team: { name: 'Rail Riders' } };

      renderForm();
      await fillMessage('Please update our score.');
      await userEvent.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Casey Captain',
          team: 'Rail Riders',
          contact: 'captain@example.com',
          message: 'Please update our score.',
        })
      );
    });

    it('keeps a typed name when auth resolves to a different one, and drops the badge', async () => {
      const { rerender } = renderForm();

      await userEvent.type(screen.getByLabelText(/^name/i), 'Typed Name');

      const nameInput = screen.getByLabelText(/^name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Typed Name');
      expect(nameInput.readOnly).toBe(false);

      mockUser = { email: 'user@test.com', user_metadata: { full_name: 'Verified Name' } };
      mockMembership = { team: { name: 'Test Team' } };
      rerender(<MemoryRouter initialEntries={['/contact']}>{formElement()}</MemoryRouter>);

      expect(nameInput.value).toBe('Typed Name');
      expect(nameInput.readOnly).toBe(false);

      const nameLabel = screen.getByText('Name').closest('label');
      expect(nameLabel).not.toBeNull();
      expect(within(nameLabel as HTMLElement).queryByText('Verified')).not.toBeInTheDocument();
    });

    it('still lets them propose a new team name when joining the league', () => {
      mockUser = { email: 'captain@example.com', user_metadata: { full_name: 'Casey Captain' } };
      mockMembership = { team: { name: 'Rail Riders' } };
      renderForm('/contact?type=join_league');

      const teamInput = screen.getByLabelText(/proposed team name/i) as HTMLInputElement;
      expect(teamInput.readOnly).toBe(false);
    });
  });
});
