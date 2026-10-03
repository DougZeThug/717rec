import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders its children straight into `document.body`.
 *
 * Use it for anything that must stay pinned to the screen with `fixed`.
 *
 * Every route renders inside `PageTransition`, whose `animate-fade-in` class
 * carries `contain: layout` (styles/utilities.css). Layout containment makes that
 * box the containing block for `fixed` descendants, so `fixed bottom-0` pins to
 * the bottom of the PAGE, not the screen: the bar scrolls with the content and
 * only shows at the very end. `BottomNav` works because it sits outside that
 * subtree, and so does anything rendered through here.
 *
 * Pair it with `bottom-(--bottom-nav-h)` so a bar clears the phone tab bar.
 */
const ViewportPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

export default ViewportPortal;
