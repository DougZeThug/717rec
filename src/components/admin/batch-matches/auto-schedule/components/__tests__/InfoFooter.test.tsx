import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InfoFooter } from '../InfoFooter';

describe('InfoFooter (Match Creation page)', () => {
  it('says an odd block of 3 or more stops Generate, and a lone team shows as unmatched', () => {
    render(<InfoFooter />);

    expect(screen.getByText(/stops Generate/)).toHaveTextContent(
      '* A time block with an odd number of teams (3 or more) stops Generate: move a team, or use ' +
        'Dual Match Mode on the Auto Schedule screen'
    );
    expect(
      screen.getByText('* A team alone in its time block is shown as unmatched (with a warning)')
    ).toBeInTheDocument();
  });

  it('no longer says odd numbers leave some teams unmatched', () => {
    render(<InfoFooter />);

    expect(
      screen.queryByText(/Teams with odd numbers will have some teams unmatched/)
    ).not.toBeInTheDocument();
  });
});
