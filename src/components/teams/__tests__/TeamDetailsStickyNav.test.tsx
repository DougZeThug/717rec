import { act, render, screen } from '@testing-library/react';
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

      triggerIntersect = (id: string) =>
        onIntersect(
          [{ isIntersecting: true, target: { id } } as unknown as IntersectionObserverEntry],
          observer
        );

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
    // Queried by name: the component puts role="navigation" on the wrapper and
    // also renders a <nav> inside it, so a bare role query matches both.
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
      screen.getByRole('button', { name: 'Navigate to match history section' })
    ).toBeInTheDocument();
  });

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
});
