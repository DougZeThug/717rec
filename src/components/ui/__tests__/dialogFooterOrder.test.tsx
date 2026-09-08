import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AlertDialogFooter } from '@/components/ui/alert-dialog';
import { DialogFooter } from '@/components/ui/dialog';

/**
 * On a phone both footers stack vertically, and they must stack in DOM order.
 * Every footer in the app is written Cancel first, primary second (the house
 * pattern in src/docs/MODAL_PATTERNS.md), so DOM order puts the primary action
 * lowest — nearest the thumb, and matching the bottom sheets built on
 * DrawerFooter. `flex-col-reverse` would flip that, and would also leave the
 * visual order disagreeing with the tab order. See UX audit X-05.
 */
describe('dialog footer stacking order', () => {
  it.each([
    ['DialogFooter', DialogFooter],
    ['AlertDialogFooter', AlertDialogFooter],
  ])('%s stacks in DOM order on mobile, not reversed', (_name, Footer) => {
    render(
      <Footer data-testid="footer">
        <button type="button">Cancel</button>
        <button type="button">Confirm</button>
      </Footer>
    );

    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('flex-col');
    expect(footer.className).not.toContain('flex-col-reverse');

    // The primary action is the last child, so it renders lowest.
    const buttons = Array.from(footer.querySelectorAll('button'));
    expect(buttons.map((b) => b.textContent)).toEqual(['Cancel', 'Confirm']);
  });
});
