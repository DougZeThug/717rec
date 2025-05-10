
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WarningDisplay } from '../../auto-schedule/WarningDisplay';

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
});
