import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useUpdateTeam', () => ({ useUpdateTeam: () => ({ updateTeam: vi.fn() }) }));
vi.mock('@/utils/imageUpload', () => ({ uploadTeamImage: vi.fn() }));

import TeamLogoCard from '../TeamLogoCard';

const team = { id: 't1', name: 'Corn Stars', imageUrl: null } as unknown as Team;

describe('TeamLogoCard', () => {
  it('shows the team name and an Add Logo button when the team has no logo', () => {
    render(<TeamLogoCard team={team} onUpdate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Corn Stars' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add logo/i })).toBeInTheDocument();
  });

  // jsdom does no layout, so this pins the classes. The preview box is 80px, but the logo inside
  // it was 144px, so only the middle 80px of the logo showed (32px cropped on every side).
  it('makes the logo fill its 80px preview box instead of overflowing it', () => {
    render(<TeamLogoCard team={team} onUpdate={vi.fn()} />);

    const logo = screen.getByText('Co').parentElement?.parentElement;
    expect(logo).toHaveClass('size-full');
    expect(logo).not.toHaveClass('size-36');
    expect(logo?.parentElement).toHaveClass('size-20', 'overflow-hidden');
  });
});
