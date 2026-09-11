import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { TeamStats } from '@/components/home/TeamStats';
import type { Team } from '@/types';

const team = (overrides: Partial<Team> = {}): Team => ({
  id: 't1',
  name: 'Baggin Rights',
  wins: 7,
  losses: 3,
  power_score: 0.82,
  sos: 0.5123,
  ...overrides,
});

describe('TeamStats', () => {
  /** The record reads "7 - 3" across an icon, two numbers and a separator. */
  const recordText = () =>
    screen.getByText('Record').parentElement?.textContent?.replace(/\s+/g, ' ').trim();

  it('shows the record, the power score and the strength of schedule', () => {
    render(<TeamStats team={team()} />);

    expect(recordText()).toContain('7');
    expect(recordText()).toContain('3');
    expect(screen.getByText('Power Score')).toBeInTheDocument();
    expect(screen.getByText('SOS')).toBeInTheDocument();
    expect(screen.getByText('0.512')).toBeInTheDocument();
  });

  it('reads a missing record as zero rather than blank', () => {
    render(<TeamStats team={team({ wins: undefined, losses: undefined, sos: undefined })} />);
    expect(recordText()).toContain('0');
  });

  it('says N/A for a team that has not played, instead of a colour-coded 0.000', () => {
    // A team with no games has no meaningful strength of schedule. Showing
    // "0.000" in the colour scale would read as a real, very bad number.
    render(<TeamStats team={team({ wins: 0, losses: 0, sos: 0 })} />);

    const value = screen.getByText('N/A');
    expect(value).toBeInTheDocument();
    expect(value.className).toContain('text-muted-foreground');
    expect(screen.queryByText('0.000')).not.toBeInTheDocument();
  });

  it('drops the SOS figure entirely when the team has no sos field', () => {
    render(<TeamStats team={team({ sos: undefined })} />);
    expect(screen.queryByText('SOS')).not.toBeInTheDocument();
  });

  it('takes its colours from tokens outside the winter theme', () => {
    render(<TeamStats team={team()} />);

    // The point of L2: the role, not the colour, and no hand-written pair.
    expect(screen.getByText('Record').className).toContain('text-muted-foreground');
    expect(screen.getByText('Record').className).not.toMatch(/\btext-(gray|slate)-\d/);
  });

  it('uses the icy palette under the winter theme', () => {
    render(<TeamStats team={team()} isWinter />);

    expect(screen.getByText('Record').className).toContain('text-cyan-300/70');
    expect(screen.getByText('0.512').className).toContain('text-cyan-200');
  });
});
