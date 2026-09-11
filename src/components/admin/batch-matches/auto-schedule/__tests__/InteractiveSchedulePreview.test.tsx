import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';
import type { TimeBlockTeamsMap } from '@/types/autoSchedule';

import InteractiveSchedulePreview from '../InteractiveSchedulePreview';

/** Radix drives the dialog and the block picker; jsdom has neither API. */
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const team = (id: string, name: string): Team => ({ id, name });

const DATE = new Date('2026-09-10T00:00:00Z');

/** Two blocks: 6pm has three teams, 7pm has one. */
const blocks = (): TimeBlockTeamsMap => ({
  '6:00 PM': [team('t1', 'Tigers'), team('t2', 'Lions'), team('t3', 'Eagles')],
  '7:00 PM': [team('t4', 'Bears')],
});

const setup = (props: Partial<React.ComponentProps<typeof InteractiveSchedulePreview>> = {}) => {
  const onTeamUpdate = vi.fn();
  const user = userEvent.setup();
  render(
    <InteractiveSchedulePreview
      timeBlockTeams={blocks()}
      date={DATE}
      isEditMode
      onTeamUpdate={onTeamUpdate}
      {...props}
    />
  );
  return { onTeamUpdate, user };
};

/** The card for one time block, found by its heading text. */
const blockCard = (label: string) => {
  const heading = screen.getByText(`${label} Block`);
  // header row -> header -> Card
  const card = heading.closest('.overflow-hidden');
  if (!card) throw new Error(`no card for ${label}`);
  return card as HTMLElement;
};

const selectTeam = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(screen.getByText(name));
};

const confirm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'Confirm' }));
};

describe('InteractiveSchedulePreview', () => {
  describe('when there is nothing to show', () => {
    it('asks for a date when none is chosen', () => {
      render(<InteractiveSchedulePreview timeBlockTeams={blocks()} date={null} />);
      expect(
        screen.getByText('Select a date and load teams to preview schedule')
      ).toBeInTheDocument();
    });

    it('asks for teams when every block is empty', () => {
      render(<InteractiveSchedulePreview timeBlockTeams={{ '6:00 PM': [] }} date={DATE} />);
      expect(
        screen.getByText('Select a date and load teams to preview schedule')
      ).toBeInTheDocument();
    });
  });

  describe('what it shows', () => {
    it('lists each block with its teams and its count', () => {
      setup({ isEditMode: false });

      expect(screen.getByText('6:00 PM Block')).toBeInTheDocument();
      expect(screen.getByText('7:00 PM Block')).toBeInTheDocument();
      expect(screen.getByText('Tigers')).toBeInTheDocument();
      expect(screen.getByText('Bears')).toBeInTheDocument();
    });

    it('flags a block with an odd number of teams, because one cannot be paired', () => {
      setup({ isEditMode: false });
      expect(screen.getByText(/3 Teams/)).toHaveTextContent('(Odd Number)');
    });

    it('warns when a block has too few teams to make a match at all', () => {
      setup({ isEditMode: false });
      // The 7pm block has one team.
      expect(
        screen.getByText('Note: Some time blocks have insufficient teams to create matches.')
      ).toBeInTheDocument();
    });

    it('says nothing about insufficient blocks when every block can pair up', () => {
      render(
        <InteractiveSchedulePreview
          timeBlockTeams={{ '6:00 PM': [team('t1', 'Tigers'), team('t2', 'Lions')] }}
          date={DATE}
        />
      );
      expect(
        screen.queryByText('Note: Some time blocks have insufficient teams to create matches.')
      ).not.toBeInTheDocument();
    });

    it('hides the editing controls outside edit mode', () => {
      setup({ isEditMode: false });
      expect(screen.queryByRole('button', { name: /Clear All Teams/ })).not.toBeInTheDocument();
    });
  });

  describe('selecting teams', () => {
    it('offers remove and move only once something is selected', async () => {
      const { user } = setup();

      expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();

      await selectTeam(user, 'Tigers');

      expect(screen.getByRole('button', { name: /Remove \(1\)/ })).toBeInTheDocument();
    });

    it('counts up as more teams are picked, and down again when one is unpicked', async () => {
      const { user } = setup();

      await selectTeam(user, 'Tigers');
      await selectTeam(user, 'Lions');
      expect(screen.getByRole('button', { name: /Remove \(2\)/ })).toBeInTheDocument();

      await selectTeam(user, 'Lions');
      expect(screen.getByRole('button', { name: /Remove \(1\)/ })).toBeInTheDocument();
    });

    it('keeps each block’s selection to itself', async () => {
      const { user } = setup();

      await selectTeam(user, 'Tigers');

      // Only the 6pm block gained a Remove button.
      expect(
        within(blockCard('6:00 PM')).getByRole('button', { name: /Remove/ })
      ).toBeInTheDocument();
      expect(within(blockCard('7:00 PM')).queryByRole('button', { name: /Remove/ })).toBeNull();
    });

    it('selects and deselects a whole block at once', async () => {
      const { user } = setup();
      const card = blockCard('6:00 PM');
      // The "Select All" wording sits beside its checkbox rather than labelling
      // it, so the control is the first checkbox in the block, not the text.
      const toggleAll = () => within(card).getAllByRole('checkbox')[0];

      await user.click(toggleAll());
      expect(within(card).getByRole('button', { name: /Remove \(3\)/ })).toBeInTheDocument();
      expect(within(card).getByText('Deselect All')).toBeInTheDocument();

      await user.click(toggleAll());
      expect(within(card).queryByRole('button', { name: /Remove/ })).toBeNull();
    });
  });

  describe('removing teams', () => {
    it('asks before removing, and does nothing until confirmed', async () => {
      const { user, onTeamUpdate } = setup();

      await selectTeam(user, 'Tigers');
      await user.click(screen.getByRole('button', { name: /Remove \(1\)/ }));

      expect(
        await screen.findByText(/Remove 1 selected team\(s\) from 6:00 PM block\?/)
      ).toBeInTheDocument();
      expect(onTeamUpdate).not.toHaveBeenCalled();
    });

    it('leaves the schedule alone if the admin cancels', async () => {
      const { user, onTeamUpdate } = setup();

      await selectTeam(user, 'Tigers');
      await user.click(screen.getByRole('button', { name: /Remove \(1\)/ }));
      await user.click(await screen.findByRole('button', { name: 'Cancel' }));

      expect(onTeamUpdate).not.toHaveBeenCalled();
    });

    it('drops only the selected teams from that block', async () => {
      const { user, onTeamUpdate } = setup();

      await selectTeam(user, 'Tigers');
      await selectTeam(user, 'Eagles');
      await user.click(screen.getByRole('button', { name: /Remove \(2\)/ }));
      await confirm(user);

      expect(onTeamUpdate).toHaveBeenCalledTimes(1);
      const updated = onTeamUpdate.mock.calls[0][0] as TimeBlockTeamsMap;
      expect(updated['6:00 PM'].map((t) => t.id)).toEqual(['t2']);
      expect(updated['7:00 PM'].map((t) => t.id)).toEqual(['t4']);
    });

    it('forgets the selection afterwards, so the next press cannot repeat it', async () => {
      const { user } = setup();

      await selectTeam(user, 'Tigers');
      await user.click(screen.getByRole('button', { name: /Remove \(1\)/ }));
      await confirm(user);

      expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
    });
  });

  describe('clearing a block', () => {
    it('empties that block and leaves the others untouched', async () => {
      const { user, onTeamUpdate } = setup();

      await user.click(
        within(blockCard('6:00 PM')).getByRole('button', { name: /Clear All Teams/ })
      );
      expect(await screen.findByText(/Clear all teams from 6:00 PM block\?/)).toBeInTheDocument();
      await confirm(user);

      const updated = onTeamUpdate.mock.calls[0][0] as TimeBlockTeamsMap;
      expect(updated['6:00 PM']).toEqual([]);
      expect(updated['7:00 PM'].map((t) => t.id)).toEqual(['t4']);
    });

    it('does not offer to clear a block that is already empty', () => {
      render(
        <InteractiveSchedulePreview
          timeBlockTeams={{ '6:00 PM': [team('t1', 'Tigers'), team('t2', 'Lions')], '7:00 PM': [] }}
          date={DATE}
          isEditMode
        />
      );
      expect(
        within(blockCard('7:00 PM')).queryByRole('button', { name: /Clear All Teams/ })
      ).toBeNull();
    });
  });

  describe('moving teams between blocks', () => {
    const pickTargetBlock = async (user: ReturnType<typeof userEvent.setup>, target: string) => {
      const card = blockCard('6:00 PM');
      await user.click(within(card).getByRole('combobox'));
      await user.click(await screen.findByRole('option', { name: target }));
    };

    it('takes the teams out of one block and puts them in the other', async () => {
      const { user, onTeamUpdate } = setup();

      await selectTeam(user, 'Tigers');
      await pickTargetBlock(user, '7:00 PM');
      await user.click(screen.getByRole('button', { name: 'Move' }));
      expect(
        await screen.findByText(/Move 1 selected team\(s\) from 6:00 PM to 7:00 PM block\?/)
      ).toBeInTheDocument();
      await confirm(user);

      const updated = onTeamUpdate.mock.calls[0][0] as TimeBlockTeamsMap;
      expect(updated['6:00 PM'].map((t) => t.id)).toEqual(['t2', 't3']);
      expect(updated['7:00 PM'].map((t) => t.id)).toEqual(['t4', 't1']);
    });

    it('does not offer a block its own teams are already in', async () => {
      const { user } = setup();

      await selectTeam(user, 'Tigers');
      await user.click(within(blockCard('6:00 PM')).getByRole('combobox'));

      expect(await screen.findByRole('option', { name: '7:00 PM' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: '6:00 PM' })).not.toBeInTheDocument();
    });

    it('keeps the Move button hidden until a destination is chosen', async () => {
      const { user } = setup();

      await selectTeam(user, 'Tigers');

      expect(screen.queryByRole('button', { name: 'Move' })).not.toBeInTheDocument();
    });
  });

  describe('unmatched teams', () => {
    it('marks the teams the scheduler could not pair', () => {
      setup({ isEditMode: false, unmatchedTeamIds: ['t3'] });
      expect(screen.getByText('Unmatched')).toBeInTheDocument();
    });

    it('only marks them in the block they are actually in', () => {
      setup({ isEditMode: false, unmatchedTeamIds: ['t3'] });
      expect(within(blockCard('6:00 PM')).getByText('Unmatched')).toBeInTheDocument();
      expect(within(blockCard('7:00 PM')).queryByText('Unmatched')).toBeNull();
    });
  });

  it('does not fall over when no onTeamUpdate handler is given', async () => {
    const user = userEvent.setup();
    render(<InteractiveSchedulePreview timeBlockTeams={blocks()} date={DATE} isEditMode />);

    await user.click(within(blockCard('6:00 PM')).getByRole('button', { name: /Clear All Teams/ }));
    await confirm(user);

    expect(screen.getByText('6:00 PM Block')).toBeInTheDocument();
  });
});
