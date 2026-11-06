import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import type { Mock, MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useScrollRestoration from '../useScrollRestoration';

const STORAGE_KEY = 'scroll_positions';
const USER_INPUT_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;

// jsdom has no layout, so a small fake page holds the numbers a browser would hold.
const page = { scrollY: 0, scrollHeight: 3000, innerHeight: 800 };

/** Moves the fake page the way a browser does: a jump never goes past the end of the page. */
const jump = (top: number) => {
  page.scrollY = Math.max(0, Math.min(top, page.scrollHeight - page.innerHeight));
};

/** Reads the target offset from either call shape: scrollTo(x, y) or scrollTo({ top }). */
const topOf = (args: unknown[]): number => {
  const [first, second] = args;
  if (typeof first === 'object' && first !== null) return Number((first as ScrollToOptions).top);
  return Number(second);
};

let scrollTo: Mock<(...args: unknown[]) => void>;
const restorers: Array<() => void> = [];

/** Replaces a read-only browser number (scrollY, scrollHeight) with a live read of the fake page. */
const defineLive = (target: object, name: string, read: () => number) => {
  const original = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, { configurable: true, get: read });
  restorers.push(() => {
    if (original) Object.defineProperty(target, name, original);
    else Reflect.deleteProperty(target, name);
  });
};

beforeEach(() => {
  page.scrollY = 0;
  page.scrollHeight = 3000;
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date'],
  });
  scrollTo = vi.fn((...args: unknown[]) => jump(topOf(args)));
  // setupTests.ts replaces window.scrollTo for the whole run, so stub it per test.
  vi.stubGlobal('scrollTo', scrollTo);
  defineLive(window, 'scrollY', () => page.scrollY);
  defineLive(document.documentElement, 'scrollHeight', () => page.scrollHeight);
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  // Unmount first, while the fake timers are still installed.
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  while (restorers.length > 0) restorers.pop()?.();
  window.history.replaceState({}, '', '/');
});

/** Puts saved positions in sessionStorage, as an earlier visit would have. */
const seed = (positions: Record<string, number>) =>
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));

/** Reads the saved positions back. */
const saved = (): Record<string, number> => JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');

/** Wraps children in a router that starts at `path` (the first entry counts as a POP). */
const routerAt =
  (path: string) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );

/** Mounts the hook on a page that was opened by Back (or a reload). */
const mountPage = (routeKey?: string, path = '/history') =>
  renderHook(() => useScrollRestoration(routeKey), { wrapper: routerAt(path) });

/** Moves the fake clock forward. One animation frame is about 16 ms. */
const tick = (ms: number) => {
  vi.advanceTimersByTime(ms);
};

/** The reader scrolls to `y`: one scroll event, then the frame the hook waits for before it saves. */
const scrollTheReaderTo = (y: number) => {
  page.scrollY = y;
  fireEvent.scroll(window);
  tick(20);
};

/** Sends one kind of input the reader could use to take over the scroll. */
const sendInput: Record<(typeof USER_INPUT_EVENTS)[number], () => void> = {
  wheel: () => fireEvent.wheel(window, { deltaY: 120 }),
  touchstart: () => fireEvent.touchStart(window),
  pointerdown: () => fireEvent.pointerDown(window),
  keydown: () => fireEvent.keyDown(window, { key: 'ArrowDown' }),
};

/** Checks that every input listener the hook added was removed again with the same handler. */
const expectInputListenersRemoved = (
  add: MockInstance<typeof window.addEventListener>,
  remove: MockInstance<typeof window.removeEventListener>
) => {
  for (const type of USER_INPUT_EVENTS) {
    const added = add.mock.calls.filter(([name]) => name === type);
    expect(added.length, `${type} listener was added`).toBeGreaterThan(0);
    const handler = added[added.length - 1][1];
    expect(
      remove.mock.calls.some(([name, fn]) => name === type && fn === handler),
      `${type} listener was removed`
    ).toBe(true);
  }
};

describe('useScrollRestoration', () => {
  describe('restoring after Back', () => {
    it('jumps to the saved position on the next frame, at once and without a glide', () => {
      seed({ '/history': 1000 });
      mountPage();

      expect(scrollTo).not.toHaveBeenCalled();
      tick(16);

      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ top: 1000, left: 0, behavior: 'instant' });
      expect(page.scrollY).toBe(1000);
    });

    it('keeps trying while the page is too short, then reaches the spot when the data arrives', () => {
      // Skeleton page: scrollHeight is above the saved spot, but the page can only scroll to 353.
      page.scrollHeight = 1153;
      seed({ '/history': 907 });
      mountPage();

      tick(16);
      expect(page.scrollY).toBe(353);
      tick(2000);
      expect(page.scrollY).toBe(353);
      expect(scrollTo.mock.calls.length).toBeGreaterThan(2);

      // The real content arrives. The longest wait between two tries is 1024 ms.
      page.scrollHeight = 3000;
      tick(1100);
      expect(page.scrollY).toBe(907);
    });

    it('stops calling scrollTo once it got there and nothing moves, and saving starts again', () => {
      seed({ '/history': 1000 });
      mountPage();
      tick(16);
      expect(scrollTo).toHaveBeenCalledTimes(1);

      // Nothing moved the page, so the settle check has nothing to correct.
      tick(5000);
      expect(scrollTo).toHaveBeenCalledTimes(1);

      scrollTheReaderTo(1200);
      expect(saved()['/history']).toBe(1200);
    });

    it('counts a position within 1 pixel as reached', () => {
      seed({ '/history': 906.67 });
      // Some phones round the scroll position a little.
      scrollTo.mockImplementation((...args: unknown[]) => {
        page.scrollY = topOf(args) - 0.4;
      });
      mountPage();

      tick(5000);
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it('gives up after 20 tries (about 15 seconds) and saving starts again', () => {
      // The page can only scroll to 200, so 907 is never reachable.
      page.scrollHeight = 1000;
      seed({ '/history': 907 });
      mountPage();

      tick(1000);
      scrollTheReaderTo(77);
      expect(saved()['/history']).toBe(907);

      tick(20_000);
      // 20 is SCROLL_RESTORE_MAX_RETRIES in the hook (it is not exported).
      expect(scrollTo).toHaveBeenCalledTimes(20);
      tick(5000);
      expect(scrollTo).toHaveBeenCalledTimes(20);

      scrollTheReaderTo(150);
      expect(saved()['/history']).toBe(150);
    });

    it('falls back to scrollTo(0, top) when the browser rejects the options form', () => {
      scrollTo.mockImplementation((...args: unknown[]) => {
        if (typeof args[0] === 'object') throw new TypeError('behavior is not supported');
        jump(topOf(args));
      });
      seed({ '/history': 1000 });
      mountPage();

      tick(16);

      expect(scrollTo).toHaveBeenNthCalledWith(1, { top: 1000, left: 0, behavior: 'instant' });
      expect(scrollTo).toHaveBeenNthCalledWith(2, 0, 1000);
      expect(page.scrollY).toBe(1000);
    });

    it('does not restore after a normal link click (PUSH)', () => {
      seed({ '/history': 907 });
      const HistoryProbe = () => {
        useScrollRestoration('/history');
        return <p>history page</p>;
      };
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Link to="/history">go</Link>} />
            <Route path="/history" element={<HistoryProbe />} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('go'));
      tick(5000);

      expect(screen.getByText('history page')).toBeInTheDocument();
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('does nothing when no position, or a zero position, is saved', () => {
      mountPage();
      tick(5000);
      expect(scrollTo).not.toHaveBeenCalled();

      cleanup();
      seed({ '/history': 0 });
      mountPage();
      tick(5000);
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('uses the routeKey as the storage key, whatever the router path is', () => {
      seed({ '/stats': 800, '/history': 300 });
      mountPage('/stats', '/history');

      tick(16);
      expect(scrollTo).toHaveBeenCalledWith({ top: 800, left: 0, behavior: 'instant' });

      // Wait for the settle window to end, or saving is still off.
      tick(1200);
      scrollTheReaderTo(1234);
      expect(saved()).toEqual({ '/stats': 1234, '/history': 300 });
    });

    it('uses the router path as the key when there is no routeKey', () => {
      seed({ '/history': 300, '/stats': 800 });
      mountPage(undefined, '/history');

      tick(16);

      expect(scrollTo).toHaveBeenCalledWith({ top: 300, left: 0, behavior: 'instant' });
    });
  });

  describe('settling after the saved spot was reached', () => {
    // Chrome's scroll anchoring moves scrollY by itself when content above the viewport
    // changes size. That is a scroll with no scrollTo call, so the test sets the number.
    const drift = (to: number) => {
      page.scrollY = to;
    };

    it.each([965, 850])(
      'puts the page back when it drifts to %d after the spot was reached',
      (to) => {
        seed({ '/history': 907 });
        mountPage();
        tick(16);
        expect(scrollTo).toHaveBeenCalledTimes(1);

        drift(to);
        tick(60);

        expect(scrollTo).toHaveBeenCalledTimes(2);
        expect(scrollTo).toHaveBeenLastCalledWith({ top: 907, left: 0, behavior: 'instant' });
        expect(page.scrollY).toBe(907);
      }
    );

    it('keeps saving off while it settles, and turns it on after 1 second of quiet', () => {
      seed({ '/history': 907 });
      mountPage();
      tick(16);
      const setItem = vi.spyOn(Storage.prototype, 'setItem');

      // A scroll event late in the window, still before a quiet second has passed.
      tick(850);
      fireEvent.scroll(window);
      tick(50);
      expect(setItem).not.toHaveBeenCalled();

      // Quiet ends about 1000 ms after the spot was reached. Saving is back 100 ms later.
      tick(300);
      scrollTheReaderTo(1200);
      expect(saved()['/history']).toBe(1200);
      expect(setItem).toHaveBeenCalled();
    });

    it('starts the quiet period again after each correction', () => {
      seed({ '/history': 907 });
      mountPage();
      tick(16);
      tick(500);
      drift(965);
      tick(60);
      expect(scrollTo).toHaveBeenCalledTimes(2);
      const setItem = vi.spyOn(Storage.prototype, 'setItem');

      // Without the correction the window would have ended at about 1016 ms.
      tick(700);
      fireEvent.scroll(window);
      tick(20);
      expect(setItem).not.toHaveBeenCalled();

      tick(600);
      scrollTheReaderTo(1200);
      expect(saved()['/history']).toBe(1200);
    });

    it('ends at the 3 second cap even when drift keeps coming', () => {
      seed({ '/history': 907 });
      mountPage();
      tick(16);
      const setItem = vi.spyOn(Storage.prototype, 'setItem');

      // The page drifts again every 400 ms, so a quiet second never comes.
      for (let i = 0; i < 7; i++) {
        tick(400);
        drift(965);
      }
      fireEvent.scroll(window);
      tick(60);
      expect(setItem).not.toHaveBeenCalled();
      // The first jump plus one correction for each of the 7 drifts.
      expect(scrollTo).toHaveBeenCalledTimes(8);

      // The cap is 3000 ms after the spot was reached, so it has passed by now.
      tick(400);
      drift(965);
      tick(200);
      expect(scrollTo).toHaveBeenCalledTimes(8);

      fireEvent.scroll(window);
      tick(20);
      expect(saved()['/history']).toBe(965);
    });

    it('measures the window from the moment the spot was reached, not from the mount', () => {
      // A slow page: the spot is only reached a few seconds after the mount.
      page.scrollHeight = 1000;
      seed({ '/history': 907 });
      mountPage();
      tick(4000);
      expect(page.scrollY).toBe(200);

      page.scrollHeight = 3000;
      tick(500);
      expect(page.scrollY).toBe(907);

      drift(965);
      tick(100);
      expect(page.scrollY).toBe(907);
    });

    it.each(USER_INPUT_EVENTS)(
      'a %s event during the settle window cancels it and saving starts at once',
      (type) => {
        seed({ '/history': 907 });
        mountPage();
        tick(16);
        drift(965);
        tick(60);
        expect(scrollTo).toHaveBeenCalledTimes(2);

        sendInput[type]();
        // Saving works at once, long before a quiet second could have passed.
        scrollTheReaderTo(1100);
        expect(saved()['/history']).toBe(1100);

        tick(3000);
        expect(scrollTo).toHaveBeenCalledTimes(2);
        expect(page.scrollY).toBe(1100);
      }
    );

    it('stops without scrolling the old page when the address moves on during the window', () => {
      seed({ '/history': 907 });
      mountPage();
      tick(16);
      drift(965);
      tick(60);
      expect(scrollTo).toHaveBeenCalledTimes(2);

      window.history.pushState({}, '', '/teams/some-team');
      drift(111);
      tick(200);

      expect(scrollTo).toHaveBeenCalledTimes(2);
      expect(page.scrollY).toBe(111);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('stops retrying on the old page when the address moves on', () => {
      page.scrollHeight = 500;
      seed({ '/history': 907 });
      mountPage();
      tick(16);
      expect(scrollTo).toHaveBeenCalledTimes(1);

      window.history.pushState({}, '', '/teams/some-team');
      tick(5000);

      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('leaves no timer and does no more scrolling when it unmounts during the window', () => {
      seed({ '/history': 907 });
      const { unmount } = mountPage();
      tick(16);
      drift(965);
      tick(60);
      expect(scrollTo).toHaveBeenCalledTimes(2);

      drift(1100);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
      tick(5000);

      expect(scrollTo).toHaveBeenCalledTimes(2);
      expect(page.scrollY).toBe(1100);
    });
  });

  describe('the reader takes over', () => {
    it.each(USER_INPUT_EVENTS)(
      'a %s event cancels the restore and saving starts at once',
      (type) => {
        // Too short for 907, so the hook is still retrying when the reader acts.
        page.scrollHeight = 500;
        seed({ '/history': 907 });
        mountPage();
        tick(16);
        expect(scrollTo).toHaveBeenCalledTimes(1);

        sendInput[type]();
        tick(5000);
        expect(scrollTo).toHaveBeenCalledTimes(1);

        scrollTheReaderTo(50);
        expect(saved()['/history']).toBe(50);
      }
    );

    it('cancels even when the reader acts before the first frame', () => {
      seed({ '/history': 907 });
      mountPage();

      sendInput.wheel();
      tick(5000);

      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('ignores a held key that only repeats (the Back key combination may still be down)', () => {
      page.scrollHeight = 500;
      seed({ '/history': 907 });
      mountPage();
      tick(16);

      fireEvent.keyDown(window, { key: 'ArrowLeft', repeat: true });
      tick(200);
      expect(scrollTo.mock.calls.length).toBeGreaterThan(1);

      scrollTheReaderTo(50);
      expect(saved()['/history']).toBe(907);
    });

    it('keeps its input listeners while it settles and removes them when the window ends', () => {
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      seed({ '/history': 1000 });
      mountPage();

      tick(16);
      // The spot was reached, but the reader can still take over for a while.
      expect(remove.mock.calls.filter(([name]) => name === 'wheel')).toHaveLength(0);

      tick(1200);
      expectInputListenersRemoved(add, remove);
    });

    it('removes its input listeners after it gave up', () => {
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      page.scrollHeight = 1000;
      seed({ '/history': 907 });
      mountPage();

      tick(1000);
      expect(remove.mock.calls.filter(([name]) => name === 'wheel')).toHaveLength(0);
      tick(20_000);

      expectInputListenersRemoved(add, remove);
    });

    it('removes its input listeners when the reader cancels', () => {
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      page.scrollHeight = 500;
      seed({ '/history': 907 });
      mountPage();
      tick(16);

      sendInput.wheel();

      expectInputListenersRemoved(add, remove);
    });

    it('removes its input listeners on unmount', () => {
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      page.scrollHeight = 500;
      seed({ '/history': 907 });
      const { unmount } = mountPage();
      tick(16);

      unmount();

      expectInputListenersRemoved(add, remove);
    });
  });

  describe('leaving the page', () => {
    it('does not scroll a later page when it unmounts before the first frame', () => {
      seed({ '/history': 1000 });
      const { unmount } = mountPage();

      unmount();
      // The frame the hook asked for must be cancelled, not just ignored when it arrives.
      expect(vi.getTimerCount()).toBe(0);
      tick(1000);

      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('stops trying when it unmounts in the middle of the retries', () => {
      page.scrollHeight = 500;
      seed({ '/history': 907 });
      const { unmount } = mountPage();
      tick(100);
      const callsBefore = scrollTo.mock.calls.length;
      expect(callsBefore).toBeGreaterThan(0);

      unmount();
      expect(vi.getTimerCount()).toBe(0);
      tick(5000);

      expect(scrollTo).toHaveBeenCalledTimes(callsBefore);
    });

    it('clears the pause timer when it unmounts right after it reached the spot', () => {
      seed({ '/history': 1000 });
      const { unmount } = mountPage();
      tick(30);
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      unmount();

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('saving', () => {
    it('stores scrollY under the route key when the page scrolls', () => {
      mountPage();

      scrollTheReaderTo(640);

      expect(saved()).toEqual({ '/history': 640 });
    });

    it('keeps the positions saved for other routes', () => {
      seed({ '/stats': 300 });
      mountPage();

      scrollTheReaderTo(640);

      expect(saved()).toEqual({ '/stats': 300, '/history': 640 });
    });

    it('does not save once the address has moved on, because the page is being left', () => {
      mountPage();
      scrollTheReaderTo(900);

      // The browser clamps the scroll on the shorter team page: 900 becomes 111.
      window.history.pushState({}, '', '/teams/some-team');
      scrollTheReaderTo(111);

      expect(saved()['/history']).toBe(900);
    });

    it('checks the address when the frame runs, not when the scroll event arrives', () => {
      mountPage();
      scrollTheReaderTo(900);

      // The event comes while the old address is still there. The router moves on before the frame.
      page.scrollY = 111;
      fireEvent.scroll(window);
      window.history.pushState({}, '', '/teams/some-team');
      tick(20);

      expect(saved()['/history']).toBe(900);
    });

    it('watches the new address when the router changes path while the hook stays mounted', () => {
      const Probe = () => {
        useScrollRestoration('/family');
        const navigate = useNavigate();
        return (
          <button type="button" onClick={() => navigate('/family/two')}>
            next
          </button>
        );
      };
      window.history.replaceState({}, '', '/family/one');
      render(
        <MemoryRouter initialEntries={['/family/one']}>
          <Routes>
            <Route path="/family/:id" element={<Probe />} />
          </Routes>
        </MemoryRouter>
      );
      scrollTheReaderTo(300);
      expect(saved()['/family']).toBe(300);

      // MemoryRouter does not touch the address bar, so move it the way a browser router would.
      window.history.pushState({}, '', '/family/two');
      fireEvent.click(screen.getByText('next'));
      scrollTheReaderTo(450);

      expect(saved()['/family']).toBe(450);
    });
  });

  describe('storage that throws', () => {
    it('does not break when saved positions cannot be read', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage is blocked');
      });

      expect(() => mountPage()).not.toThrow();
      expect(() => scrollTheReaderTo(300)).not.toThrow();
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('does not break when a position cannot be saved', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage is full');
      });
      mountPage();

      expect(() => scrollTheReaderTo(300)).not.toThrow();
    });
  });
});
