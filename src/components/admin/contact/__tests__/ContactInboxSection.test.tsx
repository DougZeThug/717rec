import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import ContactInboxSection from '../ContactInboxSection';

const mockUseContactRequests = vi.fn();
const mockUseSupportTickets = vi.fn();
const markRequestResolved = vi.fn();
const reopenRequest = vi.fn();
const removeRequest = vi.fn();
const markTicketResolved = vi.fn();
const reopenTicket = vi.fn();

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'admin-1' } }),
}));

vi.mock('@/hooks/contact/useContactRequests', () => ({
  useContactRequests: () => mockUseContactRequests(),
  useMarkContactRequestResolved: () => ({ mutate: markRequestResolved, isPending: false }),
  useReopenContactRequest: () => ({ mutate: reopenRequest, isPending: false }),
  useDeleteContactRequest: () => ({ mutate: removeRequest, isPending: false }),
}));

vi.mock('@/hooks/support/useSupportTickets', () => ({
  useSupportTickets: () => mockUseSupportTickets(),
  useMarkSupportTicketResolved: () => ({ mutate: markTicketResolved, isPending: false }),
  useReopenSupportTicket: () => ({ mutate: reopenTicket, isPending: false }),
}));

const leagueRequest = {
  id: 'req-1',
  request_type: 'timeslot',
  submitter_name: 'Mike S.',
  submitter_team: 'Bag Boys',
  submitter_contact: '717-555-1234',
  players: null,
  message: 'Can we move to 8pm on Thursday?',
  is_verified: true,
  status: 'new',
  created_at: '2026-08-02T12:00:00.000Z',
};

const supportTicket = {
  id: 'ticket-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'bug_report',
  message: 'Scores page will not load on my phone.',
  status: 'new',
  created_at: '2026-08-03T12:00:00.000Z',
};

const list = () => screen.getByRole('list');

describe('ContactInboxSection', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseContactRequests.mockReturnValue({ data: [leagueRequest], isLoading: false });
    mockUseSupportTickets.mockReturnValue({ data: [supportTicket], isLoading: false });
  });

  it('shows messages from both channels in one list', () => {
    render(<ContactInboxSection />);

    expect(screen.getByText('Can we move to 8pm on Thursday?')).toBeInTheDocument();
    expect(screen.getByText('Scores page will not load on my phone.')).toBeInTheDocument();
    expect(within(list()).getAllByRole('listitem')).toHaveLength(2);
  });

  it('labels a support ticket with its subject and counts both sources as new', () => {
    render(<ContactInboxSection />);

    expect(screen.getByText('Bug Report')).toBeInTheDocument();
    expect(screen.getByText('Timeslot Request')).toBeInTheDocument();
    expect(screen.getByText('2 new')).toBeInTheDocument();
  });

  it('sorts newest first across both sources', () => {
    render(<ContactInboxSection />);

    const items = within(list()).getAllByRole('listitem');
    // The support ticket is a day newer than the league request.
    expect(items[0]).toHaveTextContent('Jane Doe');
    expect(items[1]).toHaveTextContent('Mike S.');
  });

  it('narrows the list with the source filter', () => {
    render(<ContactInboxSection />);

    fireEvent.click(screen.getByRole('button', { name: /support \(1\)/i }));
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText('Mike S.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /league requests \(1\)/i }));
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Mike S.')).toBeInTheDocument();
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('offers Delete on a league request but not on a support ticket', () => {
    render(<ContactInboxSection />);

    fireEvent.click(screen.getByRole('button', { name: /support \(1\)/i }));
    // support_tickets has no DELETE policy, so the button must not be offered.
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /league requests \(1\)/i }));
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('asks before deleting a message, and does nothing until confirmed', () => {
    render(<ContactInboxSection />);

    fireEvent.click(screen.getByRole('button', { name: /league requests \(1\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    // The press opens the prompt; it must not delete on its own.
    expect(removeRequest).not.toHaveBeenCalled();
    expect(screen.getByText('Delete this message?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(removeRequest).toHaveBeenCalledWith('req-1', expect.anything());
  });

  it('deletes nothing when the prompt is cancelled', () => {
    render(<ContactInboxSection />);

    fireEvent.click(screen.getByRole('button', { name: /league requests \(1\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(removeRequest).not.toHaveBeenCalled();
  });

  it('routes Mark resolved to the right service for each source', () => {
    render(<ContactInboxSection />);

    fireEvent.click(screen.getByRole('button', { name: /support \(1\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));
    expect(markTicketResolved).toHaveBeenCalledWith('ticket-1');
    expect(markRequestResolved).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /league requests \(1\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));
    expect(markRequestResolved).toHaveBeenCalledWith({ id: 'req-1', userId: 'admin-1' });
  });

  it('routes Reopen to the right service for a resolved support ticket', () => {
    mockUseSupportTickets.mockReturnValue({
      data: [{ ...supportTicket, status: 'resolved' }],
      isLoading: false,
    });
    render(<ContactInboxSection />);

    fireEvent.click(screen.getByRole('button', { name: /support \(1\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /reopen/i }));
    expect(reopenTicket).toHaveBeenCalledWith('ticket-1');
    expect(reopenRequest).not.toHaveBeenCalled();
  });

  it('still renders league requests when support tickets are unavailable', () => {
    // fetchAll returns [] when the migration is not applied to this project.
    mockUseSupportTickets.mockReturnValue({ data: [], isLoading: false });
    render(<ContactInboxSection />);

    expect(screen.getByText('Can we move to 8pm on Thursday?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /support \(0\)/i })).toBeInTheDocument();
  });

  it('shows a loading line while either source is loading', () => {
    mockUseSupportTickets.mockReturnValue({ data: [], isLoading: true });
    render(<ContactInboxSection />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows an empty state when neither source has anything', () => {
    mockUseContactRequests.mockReturnValue({ data: [], isLoading: false });
    mockUseSupportTickets.mockReturnValue({ data: [], isLoading: false });
    render(<ContactInboxSection />);

    expect(screen.getByText('No messages yet.')).toBeInTheDocument();
  });
});
