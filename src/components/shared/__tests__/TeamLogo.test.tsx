import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TeamLogo } from '../TeamLogo';

describe('TeamLogo', () => {
  it('shows the first two letters of the team name when there is no image', () => {
    render(<TeamLogo imageUrl={null} teamName="Corn Stars" />);

    expect(screen.getByText('Co')).toBeInTheDocument();
  });

  it('shows the image with the team name as its alt text', () => {
    render(<TeamLogo imageUrl="https://example.test/a.webp" teamName="Corn Stars" />);

    expect(screen.getByAltText('Corn Stars')).toHaveAttribute('src', 'https://example.test/a.webp');
  });

  // jsdom does no layout, so these pin the classes. The Update Logos preview is an 80px box, but
  // the only large size was 144px, so the preview showed just the middle 80px of the logo.
  it('can fill the box it sits in, instead of having a size of its own', () => {
    const { container } = render(
      <TeamLogo imageUrl="https://example.test/a.webp" teamName="Corn Stars" size="fill" />
    );

    expect(container.firstElementChild).toHaveClass('size-full', 'min-w-0', 'min-h-0');
    expect(container.firstElementChild).not.toHaveClass('size-36');
    expect(screen.getByAltText('Corn Stars')).toHaveClass('size-full');
  });

  it('fills the box for the initials too, not only for an image', () => {
    render(<TeamLogo imageUrl={null} teamName="Corn Stars" size="fill" />);

    expect(screen.getByText('Co').parentElement).toHaveClass('size-full', 'min-w-0');
  });

  it('keeps the large size at 144px for the screens that use it', () => {
    const { container } = render(<TeamLogo imageUrl={null} teamName="Corn Stars" size="lg" />);

    expect(container.firstElementChild).toHaveClass('size-36');
  });

  // Inside a link that already shows the team name, the logo would make a
  // screen reader say the name twice (and the link name not start with it).
  it('hides a decorative logo from screen readers', () => {
    const { container } = render(
      <TeamLogo imageUrl="https://example.test/a.webp" teamName="Corn Stars" decorative />
    );

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img', { name: 'Corn Stars' })).not.toBeInTheDocument();
  });

  it('leaves a normal logo visible to screen readers', () => {
    const { container } = render(<TeamLogo imageUrl={null} teamName="Corn Stars" />);

    expect(container.firstElementChild).not.toHaveAttribute('aria-hidden');
  });
});
