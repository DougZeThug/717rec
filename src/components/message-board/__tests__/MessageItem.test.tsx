import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Message } from '@/types/reactions';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseMobile = vi.hoisted(() => vi.fn());
const mockGetTeamPowerScore = vi.hoisted(() => vi.fn());
const mockUseLongPress = vi.hoisted(() => vi.fn());
const mockUseMessageReactions = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useMobile', () => ({ useMobile: () => mockUseMobile() }));
vi.mock('@/hooks/useTeamPowerScores', () => ({
  useTeamPowerScores: () => ({ getTeamPowerScore: mockGetTeamPowerScore }),
}));
vi.mock('@/hooks/useLongPress', () => ({ useLongPress: () => mockUseLongPress() }));
vi.mock('@/hooks/message-board/useMessageReactions', () => ({
  useMessageReactions: (messageId: string) => mockUseMessageReactions(messageId),
}));
vi.mock('@/hooks/useToast', () => ({ toast: (payload: unknown) => mockToast(payload) }));

import MessageItem from '../MessageItem';

const baseMessage: Message = {
  id: 'msg-1',
  content: 'Practice is on for tonight',
  category: 'General',
  created_at: '2026-04-30T10:00:00.000Z',
  updated_at: undefined,
  is_edited: false,
  team_id: 't1',
  user_id: 'author-1',
  username: 'Alice',
  team_name: 'Wolves',
};

// The two message-control buttons (edit / delete) are the only real <button>
// elements on the card; the Card itself is a <div role="button">. Filtering by
// tag name isolates the option controls from the clickable card.
const optionButtons = () => screen.queryAllByRole('button').filter((el) => el.tagName === 'BUTTON');

describe('MessageItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'author-1' } });
    mockUseMobile.mockReturnValue(false);
    mockGetTeamPowerScore.mockReturnValue(42);
    mockUseLongPress.mockReturnValue({});
    mockUseMessageReactions.mockReturnValue({
      reactionCounts: [],
      addReaction: vi.fn(),
      isLoading: false,
    });
  });

  it('renders the message content and username, and exposes the card as a button for the author', () => {
    render(<MessageItem message={baseMessage} onDelete={vi.fn()} onEdit={vi.fn()} />);

    expect(screen.getByText('Practice is on for tonight')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Wolves')).toBeInTheDocument();

    // Author => the card is an interactive button; option controls stay hidden
    // until it is clicked.
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(optionButtons()).toHaveLength(0);
  });

  it('opens the edit form when the author clicks the card then the pencil control', () => {
    render(<MessageItem message={baseMessage} onDelete={vi.fn()} onEdit={vi.fn()} />);

    // No edit textarea before interacting.
    expect(screen.queryByPlaceholderText('Edit message...')).not.toBeInTheDocument();

    // Click the card to reveal the edit/delete option controls.
    fireEvent.click(screen.getByRole('button'));
    const controls = optionButtons();
    expect(controls).toHaveLength(2);

    // First control is the pencil (edit) button.
    fireEvent.click(controls[0]);

    // Edit mode swaps in the MessageEditForm textarea and hides the controls.
    expect(screen.getByPlaceholderText('Edit message...')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Edit message' })).toBeInTheDocument();
    expect(optionButtons().some((b) => b.querySelector('.lucide-pencil'))).toBe(false);
  });

  it('opens the delete confirmation dialog when the author clicks the trash control', () => {
    render(<MessageItem message={baseMessage} onDelete={vi.fn()} onEdit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button'));
    const controls = optionButtons();
    expect(controls).toHaveLength(2);

    // Second control is the trash (delete) button.
    fireEvent.click(controls[1]);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Message')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this message/i)).toBeInTheDocument();
  });

  it('does not make the card interactive or show controls for a non-author', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'someone-else' } });
    render(<MessageItem message={baseMessage} onDelete={vi.fn()} onEdit={vi.fn()} />);

    // Content still renders...
    expect(screen.getByText('Practice is on for tonight')).toBeInTheDocument();

    // ...but there is no clickable card role and no edit/delete controls.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    // Clicking the card body does nothing (no options appear).
    fireEvent.click(screen.getByText('Practice is on for tonight'));
    expect(optionButtons()).toHaveLength(0);
  });
});
