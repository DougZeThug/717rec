import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import InformationSection from '../InformationSection';

describe('InformationSection (Auto Schedule screen)', () => {
  it('says Standard mode stops on an odd block, and a lone team shows as unmatched', () => {
    render(<InformationSection />);

    expect(
      screen.getByText(/Standard mode stops on a time block with an odd number of teams/)
    ).toHaveTextContent(
      'Standard mode stops on a time block with an odd number of teams (3 or more): ' +
        'move a team, or use Dual Match Mode. A team alone in its block is shown as unmatched'
    );
  });

  it('no longer says an odd block leaves some teams unmatched', () => {
    render(<InformationSection />);

    expect(
      screen.queryByText('Time blocks with odd numbers will have some teams unmatched')
    ).not.toBeInTheDocument();
  });
});
