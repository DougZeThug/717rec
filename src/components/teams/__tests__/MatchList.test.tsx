import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import MatchList from '../MatchList';

const renderList = (props: Partial<React.ComponentProps<typeof MatchList>> = {}) =>
  render(
    <MemoryRouter>
      <MatchList matches={[]} teamId="team-a" title="Match History" isPast {...props} />
    </MemoryRouter>
  );

describe('MatchList empty state', () => {
  it('says there is no history when there are no matches and nothing failed', () => {
    renderList();

    expect(screen.getByText('No Match History')).toBeInTheDocument();
    expect(
      screen.getByText('Match history will appear after games are played')
    ).toBeInTheDocument();
  });

  it('does not say there is no history when the matches failed to load', () => {
    renderList({ hasError: true });

    expect(screen.queryByText('No Match History')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Match history will appear after games are played')
    ).not.toBeInTheDocument();
    // The section heading stays.
    expect(screen.getByText('Match History')).toBeInTheDocument();
  });
});
