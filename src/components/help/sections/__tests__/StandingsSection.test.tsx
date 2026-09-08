import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Accordion } from '@/components/ui/accordion';

vi.mock('@/hooks/usePowerScoreWeights', () => ({
  usePowerScoreWeights: () => ({ win: 40, sos: 45, game: 15 }),
}));

import { StandingsSection } from '../StandingsSection';

const renderSection = () =>
  render(
    <Accordion type="single" collapsible>
      <StandingsSection />
    </Accordion>
  );

describe('StandingsSection', () => {
  it('shows the section title collapsed', () => {
    renderSection();

    expect(screen.getByRole('button', { name: /viewing standings & stats/i })).toBeInTheDocument();
    expect(screen.queryByText(/Power Score:/)).not.toBeInTheDocument();
  });

  // Q11: the help page and the /stats info popover both render
  // PowerScoreExplainer, so the two explanations can never drift apart.
  it('explains the three standings numbers when opened', async () => {
    renderSection();

    await userEvent.click(screen.getByRole('button', { name: /viewing standings & stats/i }));

    expect(screen.getByText(/Power Score:/)).toBeInTheDocument();
    expect(screen.getByText(/SOS \(Strength of Schedule\):/)).toBeInTheDocument();
    expect(screen.getByText(/Game Differential:/)).toBeInTheDocument();
    expect(screen.getByText(/40% match win rate/)).toBeInTheDocument();
  });

  it('points the reader at the team detail page', async () => {
    renderSection();

    await userEvent.click(screen.getByRole('button', { name: /viewing standings & stats/i }));

    expect(screen.getByText(/head-to-head records/i)).toBeInTheDocument();
  });
});
