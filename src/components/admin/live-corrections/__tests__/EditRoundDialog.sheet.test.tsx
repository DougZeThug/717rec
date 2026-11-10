import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Tables } from '@/integrations/supabase/types';
import { clearUnsavedWork } from '@/utils/unsavedChanges';

// The props EditRoundDialog hands to ResponsiveDialog. On a phone `dismissible` decides whether
// a swipe down may close the sheet; a swipe cannot ask first, so it must not throw a typed
// correction away. dialogs.test.tsx keeps testing the real dialog; this file only reads the prop.
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
  ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { EditRoundDialog } from '../EditRoundDialog';

const round = {
  id: 'round-1',
  game_id: 'game-1',
  round_number: 3,
  team1_score: 2,
  team2_score: 1,
  team1_bags_in: null,
  team1_bags_on: null,
  team1_bags_off: null,
  team2_bags_in: null,
  team2_bags_on: null,
  team2_bags_off: null,
  team1_thrower_id: null,
  team2_thrower_id: null,
} as Tables<'match_rounds'>;

const props = {
  onOpenChange: vi.fn(),
  onSubmit: vi.fn(),
  round,
  team1Name: 'Fake Team One',
  team2Name: 'Fake Team Two',
  team1Players: [] as Tables<'game_players'>[],
  team2Players: [] as Tables<'game_players'>[],
  rosterById: new Map<string, Tables<'team_players'>>(),
};

describe('EditRoundDialog on a phone (bottom sheet)', () => {
  afterEach(() => {
    clearUnsavedWork();
  });

  it('lets a swipe close the sheet while nothing is typed', () => {
    render(<EditRoundDialog open isSubmitting={false} {...props} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(dialogProps.current.dismissible).toBe(true);
  });

  it('stops a swipe from closing the sheet once a score is typed', () => {
    render(<EditRoundDialog open isSubmitting={false} {...props} />);

    fireEvent.change(screen.getByLabelText('Score', { selector: '#team1-score' }), {
      target: { value: '4' },
    });

    expect(dialogProps.current.dismissible).toBe(false);
  });

  it('stops a swipe from closing the sheet while the round is saving', () => {
    render(<EditRoundDialog open isSubmitting {...props} />);

    expect(dialogProps.current.dismissible).toBe(false);
  });

  it('still routes a close through the unsaved-changes guard', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onOpenChange = vi.fn();
    render(<EditRoundDialog open isSubmitting={false} {...props} onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText('Score', { selector: '#team1-score' }), {
      target: { value: '4' },
    });
    dialogProps.current.onOpenChange?.(false);

    expect(confirmSpy).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
