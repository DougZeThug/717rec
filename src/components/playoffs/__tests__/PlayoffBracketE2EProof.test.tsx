import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// The proof page renders the full <BracketView>, which pulls in TanStack Query
// and the brackets-viewer. This unit test only cares about the page's own
// state-transition proof (the status section + buttons), so stub the viewer.
vi.mock('@/components/playoffs/BracketView', () => ({
  default: () => <div data-testid="mock-bracket-view" />,
}));

import PlayoffBracketE2EProof from '../PlayoffBracketE2EProof';

const text = (testId: string) => screen.getByTestId(testId).textContent;

describe('PlayoffBracketE2EProof', () => {
  it('starts with no bracket and a disabled advancement flow', () => {
    render(<PlayoffBracketE2EProof />);

    expect(text('bracket-created-state')).toBe('Creation: No bracket created');
    expect(text('bracket-final-state')).toBe('Final status: not created');
    expect(text('bracket-visible-champion')).toBe('Champion: TBD');

    // Nothing to advance until a bracket exists.
    expect(screen.getByRole('button', { name: 'Submit SF1: Alpha over Delta' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit Final: Alpha over Beta' })).toBeDisabled();
  });

  it('advances semifinal winners into the final and crowns a champion', async () => {
    const user = userEvent.setup();
    render(<PlayoffBracketE2EProof />);

    await user.click(screen.getByRole('button', { name: 'Create 4-team bracket' }));

    expect(text('bracket-created-state')).toBe('Creation: Bracket created successfully');
    expect(text('bracket-semifinal-state')).toBe('Semifinals: 0/2 completed');
    expect(text('bracket-final-slot1')).toBe('Final team 1: TBD');
    expect(text('bracket-final-slot2')).toBe('Final team 2: TBD');
    expect(text('bracket-final-state')).toBe('Final status: pending');

    // Final can't be played until both semifinals resolve.
    expect(screen.getByRole('button', { name: 'Submit Final: Alpha over Beta' })).toBeDisabled();

    // Semifinal 1 → Alpha advances into the first final slot.
    await user.click(screen.getByRole('button', { name: 'Submit SF1: Alpha over Delta' }));
    expect(text('bracket-semifinal-state')).toBe('Semifinals: 1/2 completed');
    expect(text('bracket-final-slot1')).toBe('Final team 1: E2E Alpha');
    expect(text('bracket-final-slot2')).toBe('Final team 2: TBD');
    expect(screen.getByRole('button', { name: 'Submit SF1: Alpha over Delta' })).toBeDisabled();

    // Semifinal 2 → Beta advances into the second final slot.
    await user.click(screen.getByRole('button', { name: 'Submit SF2: Beta over Gamma' }));
    expect(text('bracket-semifinal-state')).toBe('Semifinals: 2/2 completed');
    expect(text('bracket-final-slot2')).toBe('Final team 2: E2E Beta');

    // Now the final is playable → Alpha wins → champion.
    const finalButton = screen.getByRole('button', { name: 'Submit Final: Alpha over Beta' });
    expect(finalButton).toBeEnabled();
    await user.click(finalButton);

    expect(text('bracket-final-state')).toBe('Final status: completed');
    expect(text('bracket-visible-champion')).toBe('Champion: E2E Alpha');
    expect(finalButton).toBeDisabled();
  });
});
