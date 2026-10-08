import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import MessageHeader from '../MessageHeader';

const baseProps = {
  username: 'cornhole_fan',
  teamName: 'Bag Bandits',
  timeString: '3 weeks ago',
  isAnnouncement: false,
};

describe('MessageHeader', () => {
  it('shows who posted, their team, and a labelled timestamp', () => {
    render(
      <MessageHeader
        {...baseProps}
        timeTitle="Sep 9, 2026, 7:00 PM"
        timeDateTime="2026-09-09T19:00:00Z"
        powerScore={72.46}
      />
    );

    expect(screen.getByText('cornhole_fan')).toBeInTheDocument();
    expect(screen.getByText('Bag Bandits')).toBeInTheDocument();
    const time = screen.getByText('3 weeks ago');
    expect(time).toHaveAttribute('datetime', '2026-09-09T19:00:00Z');
    expect(time).toHaveAttribute('title', 'Sep 9, 2026, 7:00 PM');
    expect(time).toHaveAttribute('aria-label', 'Sep 9, 2026, 7:00 PM');
    expect(screen.queryByText('Announcement')).not.toBeInTheDocument();
  });

  it('leaves the time attributes off when none are given and flags announcements', () => {
    render(<MessageHeader {...baseProps} teamName={null} isAnnouncement />);

    const time = screen.getByText('3 weeks ago');
    expect(time).not.toHaveAttribute('datetime');
    expect(time).not.toHaveAttribute('title');
    expect(screen.getByText('Announcement')).toBeInTheDocument();
    expect(screen.queryByText('Bag Bandits')).not.toBeInTheDocument();
  });

  it('shows the power score tooltip when the team name is hovered', async () => {
    render(<MessageHeader {...baseProps} powerScore={72.46} />);

    await userEvent.hover(screen.getByText('cornhole_fan'));

    expect((await screen.findAllByText('Team Power Score: 72.5')).length).toBeGreaterThan(0);
  });
});
