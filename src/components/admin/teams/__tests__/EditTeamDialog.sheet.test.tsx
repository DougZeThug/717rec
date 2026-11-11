import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

// The props EditTeamDialog hands to ResponsiveDialog. On a phone `dismissible` decides whether
// a swipe down may close the sheet. The edit form is long, so a swipe made while scrolling must
// not throw the edits away. This file only reads the props; TeamManagementTab.test.tsx covers
// opening and closing the dialog from the table.
const dialogProps = vi.hoisted(() => ({
  current: {} as { onOpenChange?: (open: boolean) => void; dismissible?: boolean },
}));

vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({
    children,
    open,
    onOpenChange,
    dismissible,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dismissible?: boolean;
  }) => {
    dialogProps.current = { onOpenChange, dismissible };
    return open ? <div role="dialog">{children}</div> : null;
  },
  ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/teams/TeamForm', () => ({
  default: ({ team, onCancel }: { team: { name: string }; onCancel: () => void }) => (
    <div>
      <div>Editing {team.name}</div>
      <button onClick={onCancel}>Cancel Edit</button>
    </div>
  ),
}));

import EditTeamDialog from '../EditTeamDialog';

const team = { id: 'team-1', name: 'Fake Team One', division_id: null } as Team;

describe('EditTeamDialog on a phone (bottom sheet)', () => {
  it('opens the sheet with the form for the chosen team', () => {
    render(
      <EditTeamDialog team={team} onOpenChange={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Team: Fake Team One')).toBeInTheDocument();
    expect(screen.getByText('Editing Fake Team One')).toBeInTheDocument();
  });

  it('stops a swipe from closing the sheet', () => {
    render(
      <EditTeamDialog team={team} onOpenChange={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    expect(dialogProps.current.dismissible).toBe(false);
  });

  it('stays closed when no team is chosen', () => {
    render(
      <EditTeamDialog team={null} onOpenChange={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('still closes from the form Cancel and passes close requests through', () => {
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <EditTeamDialog
        team={team}
        onOpenChange={onOpenChange}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel Edit'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    dialogProps.current.onOpenChange?.(false);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
