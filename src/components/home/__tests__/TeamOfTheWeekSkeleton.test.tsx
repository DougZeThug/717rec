import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import TeamOfTheWeekSkeleton from '../TeamOfTheWeekSkeleton';

describe('TeamOfTheWeekSkeleton', () => {
  it('shows the card title while the team loads', () => {
    render(<TeamOfTheWeekSkeleton />);

    expect(screen.getByText('Team of the Week')).toBeInTheDocument();
  });
});
