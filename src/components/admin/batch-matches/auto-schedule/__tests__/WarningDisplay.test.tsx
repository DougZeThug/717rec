import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WarningDisplay } from '../WarningDisplay';

describe('WarningDisplay', () => {
  it('should not render when there are no odd blocks', () => {
    const { container } = render(<WarningDisplay oddBlocks={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render warning when there are odd blocks', () => {
    render(<WarningDisplay oddBlocks={2} />);

    expect(screen.getByText('Odd number of teams detected')).toBeInTheDocument();
    expect(screen.getByText(/Some time blocks have an odd number of teams/)).toBeInTheDocument();
  });

  it('lists each team that will not be matched with its time block', () => {
    render(
      <WarningDisplay
        oddBlocks={2}
        unmatchedTeams={2}
        unmatchedTeamDetails={[
          { timeBlock: '6:00 PM', team: { id: 't1', name: 'Alpha' } },
          { timeBlock: '7:00 PM', team: { id: 't2', name: 'Bravo' } },
        ]}
      />
    );

    expect(screen.getByText('Some teams will be unmatched')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText(/in 6:00 PM/)).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText(/in 7:00 PM/)).toBeInTheDocument();
  });

  it('says Standard mode stops on an odd block and points to Dual Match Mode', () => {
    render(<WarningDisplay oddBlocks={1} />);

    expect(
      screen.getByText(
        /In Standard mode, Generate stops when a block of 3 or more teams has an odd/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Move a team, or use Dual Match Mode on the Auto Schedule screen/)
    ).toBeInTheDocument();
    // The old promise: the scheduler pairs as many teams as it can and leaves some out.
    expect(screen.queryByText(/maximum number of teams/)).not.toBeInTheDocument();
    expect(screen.queryByText(/some teams will be unmatched/)).not.toBeInTheDocument();
  });

  it('suggests Dual Match Mode instead of continuing with unmatched teams', () => {
    render(<WarningDisplay oddBlocks={1} />);

    expect(
      screen.getByText('Use Dual Match Mode on the Auto Schedule screen', { selector: 'li' })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Continue with the current schedule/)).not.toBeInTheDocument();
  });

  it('counts the teams that will not be paired only when there are some', () => {
    const { rerender } = render(<WarningDisplay oddBlocks={1} unmatchedTeams={0} />);
    expect(screen.queryByText(/will not be paired/)).not.toBeInTheDocument();

    rerender(<WarningDisplay oddBlocks={1} unmatchedTeams={1} />);
    expect(screen.getByText('1 team will not be paired.')).toBeInTheDocument();

    rerender(<WarningDisplay oddBlocks={1} unmatchedTeams={3} />);
    expect(screen.getByText('3 teams will not be paired.')).toBeInTheDocument();
  });

  it('lists the blocks that do not have enough teams', () => {
    render(<WarningDisplay oddBlocks={1} insufficientBlocks={['6:00 PM', '8:30 PM']} />);

    expect(
      screen.getByText("These blocks don't have enough teams to create matches:")
    ).toBeInTheDocument();
    expect(screen.getByText('6:00 PM')).toBeInTheDocument();
    expect(screen.getByText('8:30 PM')).toBeInTheDocument();
  });
});
