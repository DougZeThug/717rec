import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MatchStatusSection from '../MatchStatusSection';

vi.mock('@/utils/logger', () => ({
  scoreLog: vi.fn(),
}));

describe('MatchStatusSection', () => {
  // The admin sees "Final" once per match row. A second copy used to appear next to it when
  // the match was final and not edited. When the match is edited, "Final" must stay.
  it.each([
    { name: 'a final match', isEdited: false },
    { name: 'a final match that was edited', isEdited: true },
  ])('shows "Final" exactly once for $name', ({ isEdited }) => {
    render(
      <MatchStatusSection
        isCompleted
        isEdited={isEdited}
        isValid
        disabled={false}
        onCompletedChange={vi.fn()}
      />
    );

    expect(screen.getAllByText('Final')).toHaveLength(1);
    // "Edited" shows only for the edited match, so the case is the one we think it is.
    expect(screen.queryByText('Edited') !== null).toBe(isEdited);
  });
});
