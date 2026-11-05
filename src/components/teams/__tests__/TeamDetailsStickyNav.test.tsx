import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TeamDetailsStickyNav from '@/components/teams/TeamDetailsStickyNav';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const scrollTo = vi.fn();
let observedIds: string[] = [];
let triggerIntersect: ((id: string) => void) | null = null;
let reportEntries: ((entries: [id: string, isIntersecting: boolean][]) => void) | null = null;

/**
 * Captures the sections the nav observes and lets a test say one is in view.
 *
 * A function expression rather than a class or an arrow: it has to be callable
 * with `new`, and returning an object from a constructor makes `new` yield that
 * object. None of these methods needs `this`.
 */
const installIntersectionObserver = () => {
  observedIds = [];
  vi.stubGlobal(
    'IntersectionObserver',
    function IntersectionObserverStub(onIntersect: IntersectionObserverCallback) {
      const observer = {
        observe: vi.fn((el: Element) => {
          observedIds.push(el.id);
        }),
        disconnect: vi.fn(),
        unobserve: vi.fn(),
        takeRecords: vi.fn(() => [] as IntersectionObserverEntry[]),
        root: null,
        rootMargin: '',
        thresholds: [],
      } as unknown as IntersectionObserver;

      // The real observer reports only the sections that changed, in the order
      // it noticed them: tests pass exactly that.
      reportEntries = (entries) =>
        onIntersect(
          entries.map(
            ([id, isIntersecting]) =>
              ({ isIntersecting, target: { id } }) as unknown as IntersectionObserverEntry
          ),
          observer
        );
      triggerIntersect = (id: string) => reportEntries?.([[id, true]]);

      return observer;
    }
  );
};

const scrollPageTo = (y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, writable: true, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
};

describe('TeamDetailsStickyNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installIntersectionObserver();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    // Named frameCallback, not cb: a parameter called `cb` reads as a
    // Node-style callback, making `cb(0)` look like passing 0 as an error.
    vi.stubGlobal('requestAnimationFrame', (frameCallback: FrameRequestCallback) => {
      frameCallback(0);
      return 0;
    });
    // The page sections the nav scrolls between.
    document.body.innerHTML = ['performance', 'stats', 'h2h', 'matches', 'career']
      .map((id) => `<div id="${id}"></div>`)
      .join('');
  });

  afterEach(() => {
    // Unmount first: the nav renders into document.body (a portal), and React
    // cannot remove it from a body that has already been emptied.
    cleanup();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('stays out of the way until the page is scrolled past the header', () => {
    scrollPageTo(0);
    render(<TeamDetailsStickyNav />);

    expect(
      screen.queryByRole('navigation', { name: 'Team details section navigation' })
    ).not.toBeInTheDocument();
  });

  it('appears once the page scrolls past the header', () => {
    render(<TeamDetailsStickyNav />);
    scrollPageTo(250);

    expect(
      screen.getByRole('navigation', { name: 'Team details section navigation' })
    ).toBeInTheDocument();
  });

  it('hides again when the page scrolls back to the top', () => {
    // Queried by name for readability; there is one navigation landmark here.
    const bar = { name: 'Team details section navigation' };
    render(<TeamDetailsStickyNav />);
    scrollPageTo(250);
    expect(screen.getByRole('navigation', bar)).toBeInTheDocument();

    scrollPageTo(10);
    expect(screen.queryByRole('navigation', bar)).not.toBeInTheDocument();
  });

  it('offers a labelled button for every section', () => {
    render(<TeamDetailsStickyNav />);
    scrollPageTo(250);

    for (const label of ['Overview', 'Stats', 'Matchups', 'Matches', 'Career']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(
      screen.getByRole('button', { name: 'Navigate to Matches: match history section' })
    ).toBeInTheDocument();
  });

  // WCAG 2.5.3: the name read out (or spoken to a voice control) holds the
  // words drawn on the pill. Overview and Matches used to be missing from it.
  it.each(['Overview', 'Stats', 'Matchups', 'Matches', 'Career'])(
    'names the %s button with the word it shows',
    (label) => {
      render(<TeamDetailsStickyNav />);
      scrollPageTo(250);

      const button = screen.getByText(label).closest('button');
      expect(button?.getAttribute('aria-label')).toContain(label);
    }
  );

  it('watches every section on the page', () => {
    render(<TeamDetailsStickyNav />);

    expect(observedIds).toEqual(['performance', 'stats', 'h2h', 'matches', 'career']);
  });

  it('marks the section currently in view', () => {
    render(<TeamDetailsStickyNav />);
    scrollPageTo(250);

    act(() => triggerIntersect?.('career'));

    expect(screen.getByRole('button', { name: /career/i })).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByRole('button', { name: /stats/i })).not.toHaveAttribute('aria-current');
  });

  it('scrolls to a section when its button is pressed', async () => {
    render(<TeamDetailsStickyNav />);
    scrollPageTo(250);

    await userEvent.click(screen.getByRole('button', { name: /match history/i }));

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  // UX audit T-03: the nav scrolled without ever writing the address, so a
  // section could not be linked to.
  it('puts the section in the address, in place of the current entry', async () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    render(<TeamDetailsStickyNav />);
    scrollPageTo(250);

    await userEvent.click(screen.getByRole('button', { name: /match history/i }));

    // The existing history state is passed through unchanged; jsdom's is null.
    expect(replaceState).toHaveBeenCalledWith(window.history.state, '', '#matches');
    expect(window.location.hash).toBe('#matches');
    replaceState.mockRestore();
  });

  // The observer fires continuously while the page scrolls; writing from there
  // would flood the history API.
  it('does not write the address while the reader scrolls', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    render(<TeamDetailsStickyNav />);
    scrollPageTo(250);

    expect(replaceState).not.toHaveBeenCalled();
    replaceState.mockRestore();
  });

  describe('which pill is highlighted', () => {
    const activePills = () =>
      screen
        .getAllByRole('button')
        .filter((button) => button.getAttribute('aria-current') === 'location')
        .map((button) => button.textContent);

    it('picks the topmost section when several are in view at once', () => {
      render(<TeamDetailsStickyNav />);
      scrollPageTo(250);

      // Short collapsed sections sit in the band together. The observer reports
      // the lower ones last; the last one reported used to win.
      act(() =>
        reportEntries?.([
          ['matches', true],
          ['stats', true],
          ['career', true],
          ['h2h', true],
        ])
      );

      expect(activePills()).toEqual(['Stats']);
    });

    it('moves on to the next section once the upper one has left the band', () => {
      render(<TeamDetailsStickyNav />);
      scrollPageTo(250);
      act(() =>
        reportEntries?.([
          ['stats', true],
          ['h2h', true],
        ])
      );
      expect(activePills()).toEqual(['Stats']);

      // The observer reports only what changed: here, Stats leaving.
      act(() => reportEntries?.([['stats', false]]));

      expect(activePills()).toEqual(['Matchups']);
    });

    it('keeps the current pill when nothing is in the band', () => {
      render(<TeamDetailsStickyNav />);
      scrollPageTo(250);
      act(() => reportEntries?.([['h2h', true]]));
      act(() => reportEntries?.([['h2h', false]]));

      expect(activePills()).toEqual(['Matchups']);
    });

    it('highlights the last section at the very end of the page', () => {
      const root = document.documentElement;
      const scrollHeight = vi.spyOn(root, 'scrollHeight', 'get').mockReturnValue(2000);
      vi.stubGlobal('innerHeight', 800);
      render(<TeamDetailsStickyNav />);
      // Career is too short to reach the top of the page, so the sections above
      // it are still in the band when the page can scroll no further.
      act(() => reportEntries?.([['matches', true]]));

      scrollPageTo(1200);

      expect(activePills()).toEqual(['Career']);
      scrollHeight.mockRestore();
    });

    describe('after a tap', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('highlights the tapped pill at once and keeps it while the page scrolls', () => {
        render(<TeamDetailsStickyNav />);
        scrollPageTo(250);
        act(() => reportEntries?.([['performance', true]]));

        fireEvent.click(screen.getByText('Matchups'));
        expect(activePills()).toEqual(['Matchups']);

        // The smooth scroll passes Stats and others on the way down.
        act(() => reportEntries?.([['performance', false]]));
        act(() => reportEntries?.([['stats', true]]));
        scrollPageTo(400);
        act(() => {
          vi.advanceTimersByTime(100);
        });
        expect(activePills()).toEqual(['Matchups']);
      });

      it('keeps the tapped pill when the frames run late, after the settle timer fired', () => {
        // A busy main thread: queue the frames and run them after the timer.
        const frames: FrameRequestCallback[] = [];
        vi.stubGlobal('requestAnimationFrame', (frameCallback: FrameRequestCallback) => {
          frames.push(frameCallback);
          return frames.length;
        });
        render(<TeamDetailsStickyNav />);
        scrollPageTo(250);

        fireEvent.click(screen.getByText('Matchups'));
        act(() => {
          vi.advanceTimersByTime(200);
        });
        act(() => {
          while (frames.length > 0) frames.shift()?.(0);
        });

        // The smooth scroll starts now and passes other sections on the way.
        act(() => reportEntries?.([['stats', true]]));
        expect(activePills()).toEqual(['Matchups']);

        act(() => {
          vi.advanceTimersByTime(400);
        });
        act(() => reportEntries?.([['career', true]]));
        // Settled: the topmost section in view (Stats) takes the highlight.
        expect(activePills()).toEqual(['Stats']);
      });

      it('hands the highlight back to scrolling once the page has settled', () => {
        render(<TeamDetailsStickyNav />);
        scrollPageTo(250);
        fireEvent.click(screen.getByText('Matchups'));
        act(() => {
          vi.advanceTimersByTime(400);
        });

        act(() => reportEntries?.([['career', true]]));

        expect(activePills()).toEqual(['Career']);
      });
    });
  });

  describe('the pill bar', () => {
    const barRect = { left: 0, width: 390 };
    const pillRect = { left: 300, width: 80 };
    let barScrollTo: ReturnType<typeof vi.fn>;
    let rectSpy: { mockRestore: () => void };

    beforeEach(() => {
      barScrollTo = vi.fn();
      Element.prototype.scrollTo = barScrollTo as unknown as typeof Element.prototype.scrollTo;
      // jsdom has no layout: say where the bar and the highlighted pill are.
      rectSpy = vi
        .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockImplementation(function (this: HTMLElement) {
          const box = this.getAttribute('aria-current') === 'location' ? pillRect : barRect;
          return {
            ...box,
            right: box.left + box.width,
            top: 0,
            bottom: 0,
            height: 0,
            x: 0,
            y: 0,
          } as DOMRect;
        });
    });

    afterEach(() => {
      rectSpy.mockRestore();
      // jsdom does not define Element.scrollTo, so remove the stub added in beforeEach.
      Reflect.deleteProperty(Element.prototype, 'scrollTo');
    });

    it('scrolls the highlighted pill to the middle of the bar', () => {
      render(<TeamDetailsStickyNav />);
      scrollPageTo(250);
      barScrollTo.mockClear();

      act(() => triggerIntersect?.('career'));

      // 300 - (390 - 80) / 2 = 145
      expect(barScrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 145 }));
    });

    it('moves the bar only, not the page', () => {
      render(<TeamDetailsStickyNav />);
      scrollPageTo(250);

      act(() => triggerIntersect?.('career'));

      expect(scrollTo).not.toHaveBeenCalled();
    });

    // Some older phone browsers have no Element.scrollTo. The bar then moves by
    // setting its scroll position directly, so the pill still ends up centred.
    it('centres the highlighted pill by setting the scroll position when the browser has no scrollTo', () => {
      Reflect.deleteProperty(Element.prototype, 'scrollTo');
      render(<TeamDetailsStickyNav />);

      scrollPageTo(250);

      const bar = screen.getByRole('navigation', { name: 'Team details section navigation' })
        .parentElement as HTMLElement;
      // 300 - (390 - 80) / 2 = 145
      expect(bar.scrollLeft).toBe(145);
      expect(scrollTo).not.toHaveBeenCalled();
    });
  });
});
