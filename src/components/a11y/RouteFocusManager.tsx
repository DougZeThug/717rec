import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

interface RouteFocusManagerProps {
  /** Ref to the page's `<main>` element that should receive focus on navigation. */
  mainRef: React.RefObject<HTMLElement | null>;
}

/**
 * Moves keyboard/screen-reader focus to the page's main landmark after client
 * side route changes. Initial page load and POP navigations are skipped so the
 * browser can keep its normal focus/scroll restoration behavior.
 */
export const RouteFocusManager: React.FC<RouteFocusManagerProps> = ({ mainRef }) => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const lastFocusedPath = useRef(pathname);

  useEffect(() => {
    if (lastFocusedPath.current === pathname) {
      return;
    }
    lastFocusedPath.current = pathname;

    if (navigationType === 'POP') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [mainRef, navigationType, pathname]);

  return null;
};

export default RouteFocusManager;
