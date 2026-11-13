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

  describe('Dual Match Mode', () => {
    const STANDARD_TEXT =
      'Some time blocks have an odd number of teams. In Standard mode, Generate stops when a block of 3 or more teams has an odd number. Move a team, or use Dual Match Mode on the Auto Schedule screen. A team alone in its block has nobody to play.';
    const DUAL_TEXT =
      'Some time blocks have an odd number of teams. Dual Match Mode is on, so an odd block gets a third match slot and Generate does not stop. A team alone in its block has nobody to play.';
    const DUAL_SUGGESTION = 'Use Dual Match Mode on the Auto Schedule screen';

    it.each([
      { label: 'not given (Match Creation)', props: {} },
      { label: 'false', props: { dualMatchMode: false } },
    ])('keeps the Standard text word for word when Dual Match Mode is $label', ({ props }) => {
      render(<WarningDisplay oddBlocks={1} {...props} />);

      expect(screen.getByText(/Some time blocks have an odd number of teams/).textContent).toBe(
        STANDARD_TEXT
      );
      expect(screen.getByText(DUAL_SUGGESTION, { selector: 'li' })).toBeInTheDocument();
    });

    it('says Dual Match Mode is on and Generate does not stop', () => {
      render(<WarningDisplay oddBlocks={1} dualMatchMode />);

      expect(screen.getByText(/Some time blocks have an odd number of teams/).textContent).toBe(
        DUAL_TEXT
      );
      // The Standard-mode claim and the "turn Dual on" advice are wrong when it is already on.
      expect(screen.queryByText(/In Standard mode/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Move a team, or use Dual Match Mode/)).not.toBeInTheDocument();
    });

    it('drops the Dual Match Mode suggestion and keeps the other two', () => {
      render(<WarningDisplay oddBlocks={1} dualMatchMode />);

      expect(screen.queryByText(DUAL_SUGGESTION, { selector: 'li' })).not.toBeInTheDocument();
      expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        'Add more teams to time blocks with odd numbers',
        'Move teams between time blocks to balance them',
      ]);
    });

    it.each([{ dualMatchMode: false }, { dualMatchMode: true }])(
      'keeps both titles when Dual Match Mode is $dualMatchMode',
      ({ dualMatchMode }) => {
        const { rerender } = render(<WarningDisplay oddBlocks={1} dualMatchMode={dualMatchMode} />);
        expect(screen.getByText('Odd number of teams detected')).toBeInTheDocument();

        rerender(<WarningDisplay oddBlocks={1} unmatchedTeams={1} dualMatchMode={dualMatchMode} />);
        expect(screen.getByText('Some teams will be unmatched')).toBeInTheDocument();
      }
    );

    it('still says how many teams will not be paired in Dual mode', () => {
      render(<WarningDisplay oddBlocks={1} unmatchedTeams={2} dualMatchMode />);

      expect(screen.getByText('2 teams will not be paired.')).toBeInTheDocument();
    });
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
