import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { TimeBlockTeamsMap } from '@/types/autoSchedule';

import { DiagnosticPanel } from '../DiagnosticPanel';

const team = (id: string, name: string) => ({ id, name }) as TimeBlockTeamsMap[string][number];

const openPanel = async () => {
  await userEvent.click(screen.getByRole('button', { name: /diagnostic panel/i }));
};

describe('DiagnosticPanel', () => {
  it('renders nothing when it is hidden', () => {
    const { container } = render(
      <DiagnosticPanel teamBlockMap={{}} timeBlockTeams={{}} isVisible={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('says there is nothing to check when no teams are loaded', async () => {
    render(<DiagnosticPanel teamBlockMap={{}} timeBlockTeams={{}} />);
    await openPanel();

    expect(screen.getByText('❌ Invalid')).toBeInTheDocument();
    expect(screen.getByText('0 teams assigned')).toBeInTheDocument();
    expect(screen.getByText('No team assignments loaded. Load teams first.')).toBeInTheDocument();
  });

  it('marks a clean schedule valid and counts the teams in each block', async () => {
    render(
      <DiagnosticPanel
        teamBlockMap={{ a: ['6:00'], b: ['6:00'], c: ['7:00'] }}
        timeBlockTeams={{
          '6:00': [team('a', 'Alpha'), team('b', 'Bravo')],
          '7:00': [team('c', 'Charlie')],
        }}
      />
    );
    await openPanel();

    expect(screen.getByText('✅ Valid')).toBeInTheDocument();
    expect(screen.getByText('3 teams assigned')).toBeInTheDocument();
    expect(screen.getByText('2 teams')).toBeInTheDocument();
    expect(screen.getByText('1 teams')).toBeInTheDocument();
    expect(screen.queryByText(/Critical Error/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Double Headers:/)).not.toBeInTheDocument();
  });

  it('lists a team in two blocks as a valid double header', async () => {
    render(
      <DiagnosticPanel
        teamBlockMap={{ a: ['6:00', '7:00'] }}
        timeBlockTeams={{ '6:00': [team('a', 'Alpha')], '7:00': [team('a', 'Alpha')] }}
      />
    );
    await openPanel();

    expect(screen.getByText('✅ Valid')).toBeInTheDocument();
    expect(screen.getByText(/Double Headers:/)).toBeInTheDocument();
    expect(screen.getByText('Alpha: 6:00 & 7:00')).toBeInTheDocument();
  });

  it('flags a team in three blocks as a critical error', async () => {
    render(
      <DiagnosticPanel
        teamBlockMap={{ a: ['6:00', '7:00', '8:00'] }}
        timeBlockTeams={{
          '6:00': [team('a', 'Alpha')],
          '7:00': [team('a', 'Alpha')],
          '8:00': [team('a', 'Alpha')],
        }}
      />
    );
    await openPanel();

    expect(screen.getByText('❌ Invalid')).toBeInTheDocument();
    expect(screen.getByText(/Critical Error:/)).toBeInTheDocument();
    expect(screen.getByText('Alpha: 6:00, 7:00, 8:00')).toBeInTheDocument();
  });

  it('shows every assignment once the list is opened', async () => {
    render(
      <DiagnosticPanel
        teamBlockMap={{ a: ['6:00'], b: ['7:00'] }}
        timeBlockTeams={{ '6:00': [team('a', 'Alpha')], '7:00': [team('b', 'Bravo')] }}
      />
    );
    await openPanel();
    await userEvent.click(screen.getByRole('button', { name: /team assignments \(2\)/i }));

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });
});
