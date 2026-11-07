import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { RearrangeSlotCell } from '../RearrangeSlotCell';

describe('RearrangeSlotCell', () => {
  it('shows a movable team as a chip named Move <team>', () => {
    render(
      <DndContext>
        <RearrangeSlotCell cell={{ slotKey: 'm1:1', kind: 'team', label: 'Corn Stars' }} />
      </DndContext>
    );

    expect(screen.getByRole('button', { name: 'Move Corn Stars' })).toBeInTheDocument();
  });

  // jsdom does no layout, so this pins the class. The chip was about 34px tall; the app's buttons
  // are at least 44px.
  it('keeps the team chip at least 44px tall to grab', () => {
    render(
      <DndContext>
        <RearrangeSlotCell cell={{ slotKey: 'm1:1', kind: 'team', label: 'Corn Stars' }} />
      </DndContext>
    );

    expect(screen.getByRole('button', { name: 'Move Corn Stars' })).toHaveClass('min-h-11');
  });
});
