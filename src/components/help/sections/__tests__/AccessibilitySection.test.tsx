import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Accordion } from '@/components/ui/accordion';

import { AccessibilitySection } from '../AccessibilitySection';

const renderOpenSection = async () => {
  const user = userEvent.setup();
  render(
    <Accordion type="single" collapsible>
      <AccessibilitySection />
    </Accordion>
  );
  await user.click(screen.getByRole('button', { name: /accessibility & keyboard navigation/i }));
};

describe('AccessibilitySection', () => {
  it('lists the keyboard shortcuts, with a note on the skip link', async () => {
    await renderOpenSection();

    expect(screen.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeInTheDocument();
    expect(screen.getByText('Shift + Tab')).toBeInTheDocument();
    expect(screen.getByText('Close dialog/menu')).toBeInTheDocument();
    expect(screen.getByText('(on page load)')).toBeInTheDocument();
  });

  it('names the supported screen readers', async () => {
    await renderOpenSection();

    expect(screen.getByRole('heading', { name: 'Screen Reader Support' })).toBeInTheDocument();
    expect(screen.getByText('VoiceOver (macOS, iOS)')).toBeInTheDocument();
    expect(screen.getByText('TalkBack (Android)')).toBeInTheDocument();
  });

  it('describes the built-in accessibility features', async () => {
    await renderOpenSection();

    expect(screen.getByRole('heading', { name: 'Accessibility Features' })).toBeInTheDocument();
    expect(screen.getByText(/touch-friendly button sizes/i)).toBeInTheDocument();
  });

  // It was a bare row with a card inside; the other Help sections are one bordered box with an
  // icon chip and small text. jsdom does no layout, so this pins the shared item's classes.
  it('uses the same bordered box as the other Help sections, with no card inside', async () => {
    await renderOpenSection();

    const trigger = screen.getByRole('button', { name: /accessibility & keyboard navigation/i });
    expect(trigger.closest('.border.rounded-lg.px-4')).not.toBeNull();
    const intro = screen.getByText(/designed to be accessible to all users/i);
    expect(intro.closest('.text-sm')).not.toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Keyboard Shortcuts' }).closest('.rounded-card')
    ).toBeNull();
  });

  it('points people to the Contact page for accessibility problems', async () => {
    await renderOpenSection();

    expect(screen.getByRole('heading', { name: 'Need Help?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact page' })).toHaveAttribute('href', '/contact');
  });

  // axe: a link inside a sentence needs more than colour (link-in-text-block), and text-primary
  // was 3.8:1 in dark. Underlined, in the text shade of primary.
  it('underlines the Contact page link and uses the readable primary text shade', async () => {
    await renderOpenSection();

    const link = screen.getByRole('link', { name: 'Contact page' });
    expect(link).toHaveClass('underline', 'text-primary-text');
    expect(link).not.toHaveClass('text-primary');
  });
});
