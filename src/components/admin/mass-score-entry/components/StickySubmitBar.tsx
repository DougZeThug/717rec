import React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

interface StickySubmitBarProps {
  children: React.ReactNode;
}

/**
 * Pins the submit control to the bottom of the viewport so an admin never has
 * to scroll a whole league night to save. See UX audit A-03.
 *
 * This is portalled to `document.body` rather than positioned in place, because
 * neither `sticky` nor `fixed` works where the button used to live:
 *
 * - The tool's own Card adds `overflow-hidden`, which makes it a scroll
 *   container, so `sticky` has no scrollport to stick within. (The app shell and
 *   PageLayout used to do the same with `overflow-x-hidden`; they use
 *   `overflow-x-clip` now, which does not.)
 * - `.animate-fade-in` carries `contain: layout` (styles/utilities.css), and
 *   layout containment makes that element the containing block for any `fixed`
 *   descendant, so `fixed bottom-0` would pin to the bottom of the page content
 *   instead of the viewport.
 *
 * BottomNav works for the same reason this does: it sits outside that subtree.
 */
const StickySubmitBar: React.FC<StickySubmitBarProps> = ({ children }) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-testid="mass-score-submit-bar"
      className={cn(
        // Below BottomNav (z-40) and below dialogs, so a confirm still covers it.
        'fixed inset-x-0 z-30',
        // Clear the mobile tab bar, which only exists below `md`.
        'bottom-(--bottom-nav-h)',
        'border-t border-border bg-background/95 backdrop-blur-sm',
        'supports-backdrop-filter:bg-background/80',
        'px-4 py-3',
        'flex justify-end'
      )}
    >
      {children}
    </div>,
    document.body
  );
};

export default StickySubmitBar;
