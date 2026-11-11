import { fireEvent, render, screen } from '@testing-library/react';
import { HelpCircle } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { Accordion } from '@/components/ui/accordion';

import { HelpAccordionItem } from '../HelpAccordionItem';

describe('HelpAccordionItem', () => {
  it('shows the title in the trigger and reveals the body when opened', () => {
    render(
      <Accordion type="single" collapsible>
        <HelpAccordionItem value="scores" icon={HelpCircle} title="Entering scores">
          <p>Tap a match to enter the score.</p>
        </HelpAccordionItem>
      </Accordion>
    );

    const trigger = screen.getByRole('button', { name: 'Entering scores' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Tap a match to enter the score.')).toBeInTheDocument();
  });

  // jsdom does no layout, so this pins the class. A title that wraps on a phone was centred,
  // because a button centres its text; the one-line titles above it start at the left.
  it('keeps a wrapped title at the left', () => {
    render(
      <Accordion type="single" collapsible>
        <HelpAccordionItem
          value="a11y"
          icon={HelpCircle}
          title="Accessibility & Keyboard Navigation"
        >
          <p>body</p>
        </HelpAccordionItem>
      </Accordion>
    );

    expect(screen.getByText('Accessibility & Keyboard Navigation')).toHaveClass('text-left');
  });
});
