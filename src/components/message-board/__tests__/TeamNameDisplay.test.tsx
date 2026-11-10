import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import TeamNameDisplay from '../TeamNameDisplay';

// Used by board posts and match comments. On a phone a long username or team
// name must end in "..." instead of widening the row.
describe('TeamNameDisplay', () => {
  it('truncates the username and the team name inside the badge', () => {
    render(<TeamNameDisplay username="cornhole_fan" teamName="Bag Bandits" compact />);

    const username = screen.getByText('cornhole_fan');
    expect(username).toHaveClass('min-w-0', 'truncate');
    expect(username.parentElement).toHaveClass('min-w-0');

    const name = screen.getByText('Bag Bandits');
    expect(name.tagName).toBe('SPAN');
    expect(name).toHaveClass('truncate');
    // The badge itself must be allowed to shrink below its text width.
    expect(name.parentElement).toHaveClass('min-w-0');
  });

  it('shows only the username when there is no team', () => {
    render(<TeamNameDisplay username="cornhole_fan" teamName={null} />);

    expect(screen.getByText('cornhole_fan')).toBeInTheDocument();
    expect(screen.queryByText('Bag Bandits')).not.toBeInTheDocument();
  });
});
