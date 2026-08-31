import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TeamsDivisionSection } from '@/components/teams/TeamsDivisionSection';
import type { Team } from '@/types';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/components/teams/TeamList', () => ({
  TeamList: ({ teams }: { teams: Team[] }) => (
    <div data-testid="team-list">{teams.map((t) => t.name).join(', ')}</div>
  ),
}));

const scrollTo = vi.fn();

const teams = [
  { id: 't-1', name: 'Rail Riders' },
  { id: 't-2', name: 'Bag Bandits' },
] as unknown as Team[];

const renderSection = (props: Partial<React.ComponentProps<typeof TeamsDivisionSection>> = {}) => {
  const onToggleExpand = vi.fn();
  render(
    <TeamsDivisionSection
      divisionName="Competitive"
      teams={teams}
      isExpanded={false}
      onToggleExpand={onToggleExpand}
      onEditTeam={vi.fn()}
      onDeleteTeam={vi.fn()}
      isLoading={false}
      viewMode="grid"
      {...props}
    />
  );
  return { onToggleExpand };
};

describe('TeamsDivisionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  it('names the division and counts its teams', () => {
    renderSection();

    expect(screen.getByRole('heading', { name: /Competitive/ })).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('hides the teams until the section is expanded', () => {
    renderSection();

    expect(screen.queryByTestId('team-list')).not.toBeInTheDocument();
  });

  it('lists the teams once expanded', () => {
    renderSection({ isExpanded: true });

    expect(screen.getByTestId('team-list')).toHaveTextContent('Rail Riders, Bag Bandits');
  });

  it('asks to be expanded when the header is pressed', async () => {
    const { onToggleExpand } = renderSection();

    await userEvent.click(screen.getByRole('heading', { name: /Competitive/ }));

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('scrolls the section into view when it opens', () => {
    renderSection({ isExpanded: true });

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('does not scroll while the section stays closed', () => {
    renderSection();

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('renders nothing for a division with no teams', () => {
    const { container } = render(
      <TeamsDivisionSection
        divisionName="Empty"
        teams={[]}
        isExpanded
        onToggleExpand={vi.fn()}
        onEditTeam={vi.fn()}
        onDeleteTeam={vi.fn()}
        isLoading={false}
        viewMode="grid"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
