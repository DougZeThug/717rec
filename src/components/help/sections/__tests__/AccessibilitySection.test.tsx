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

  it('points people to the Contact page for accessibility problems', async () => {
    await renderOpenSection();

    expect(screen.getByRole('heading', { name: 'Need Help?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact page' })).toHaveAttribute('href', '/contact');
  });
});
