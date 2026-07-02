import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { TeamLogo } from '../TeamLogo';

describe('rank/TeamLogo', () => {
  it('renders the team image when an imageUrl is provided', () => {
    render(<TeamLogo imageUrl="https://example.com/logo.png" teamName="The Baggers" />);
    const img = screen.getByAltText('The Baggers');
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('falls back to the first two letters of the team name without an image', () => {
    render(<TeamLogo imageUrl={null} teamName="The Baggers" />);
    expect(screen.getByText('Th')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('hides the image element when it fails to load', () => {
    render(<TeamLogo imageUrl="https://example.com/broken.png" teamName="The Baggers" />);
    const img = screen.getByAltText('The Baggers');
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });

  it('wraps the logo in a team link when clickable with a teamId', () => {
    render(
      <MemoryRouter>
        <TeamLogo imageUrl={null} teamName="The Baggers" teamId="team-1" clickable />
      </MemoryRouter>
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining('/teams/'));
  });

  it('renders no link when clickable but missing a teamId', () => {
    render(<TeamLogo imageUrl={null} teamName="The Baggers" clickable />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
