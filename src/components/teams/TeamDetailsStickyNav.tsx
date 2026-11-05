import { m } from 'framer-motion';
import { BarChart3, Clock, Swords, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import ViewportPortal from '@/components/layout/ViewportPortal';
import { useScrollBehavior } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
  ariaLabel: string;
}

// Same order as the sections on the page, top to bottom: the pill that is
// highlighted is the first of these that is in view. Each aria-label holds the
// visible word, so a voice command naming the pill ("click Matches") finds it.
const sections: Section[] = [
  {
    id: 'performance',
    label: 'Overview',
    icon: BarChart3,
    ariaLabel: 'Navigate to Overview: team performance section',
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: BarChart3,
    ariaLabel: 'Navigate to Stats: report card section',
  },
  {
    id: 'h2h',
    label: 'Matchups',
    icon: Swords,
    ariaLabel: 'Navigate to Matchups: rivalries section',
  },
  {
    id: 'matches',
    label: 'Matches',
    icon: Clock,
    ariaLabel: 'Navigate to Matches: match history section',
  },
  {
    id: 'career',
    label: 'Career',
    icon: TrendingUp,
    ariaLabel: 'Navigate to Career: achievements section',
  },
];

/** How long the page must sit still before a tapped pill hands the highlight back to scrolling. */
const SETTLE_MS = 150;

/** True when the page is scrolled to its very end (and is long enough to scroll at all). */
const isPageAtBottom = () => {
  const root = document.documentElement;
  return (
    root.scrollHeight > window.innerHeight + 1 &&
    window.innerHeight + window.scrollY >= root.scrollHeight - 2
  );
};

interface TeamDetailsStickyNavProps {
  className?: string;
}

/** Sticky section navigator on the team details page that tracks and scrolls to page sections. */
const TeamDetailsStickyNav: React.FC<TeamDetailsStickyNavProps> = ({ className }) => {
  const scrollBehavior = useScrollBehavior();
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);
  const [isVisible, setIsVisible] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // The observer only reports sections that changed, so the ones now inside its
  // band are kept here.
  const inViewRef = useRef(new Set<string>());
  // The section a tapped pill is scrolling to. Scrolling past other sections on
  // the way must not move the highlight until the page has settled.
  const tappedRef = useRef<string | null>(null);
  // skipcq: JS-W1042 -- React 19's types have no call without an argument, so `undefined` stays.
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** Highlight the topmost section in view, unless a tapped pill is still scrolling. */
  const updateActive = useCallback(() => {
    if (tappedRef.current) return;
    // Several short collapsed sections can sit in the band together, and the
    // last one reported used to win. The first one in page order is the one at
    // the top. At the very end of the page the last section can never reach the
    // top, so it takes the highlight there.
    const current = isPageAtBottom()
      ? sections[sections.length - 1].id
      : sections.find(({ id }) => inViewRef.current.has(id))?.id;
    if (current) setActiveSection(current);
  }, []);

  /** Keep the tapped pill highlighted until the page has stopped moving. */
  const holdTappedSection = useCallback(() => {
    clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      tappedRef.current = null;
    }, SETTLE_MS);
  }, []);

  // Track which section is currently in view
  useEffect(() => {
    const inView = inViewRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            inView.add(entry.target.id);
          } else {
            inView.delete(entry.target.id);
          }
        });
        updateActive();
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
      inView.clear();
    };
  }, [updateActive]);

  // Show/hide sticky nav based on scroll position
  useEffect(() => {
    /** Reveal the sticky nav once the page scrolls past the header (about 200px). */
    const handleScroll = () => {
      // Show after scrolling past 200px (roughly past the header)
      setIsVisible(window.scrollY > 200);
      if (tappedRef.current) {
        // Still moving towards a tapped section: wait for it to stop.
        holdTappedSection();
      } else {
        updateActive();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(settleTimerRef.current);
    };
  }, [holdTappedSection, updateActive]);

  // The bar is wider than a phone, so bring the highlighted pill into view
  // inside it. Scrolls the bar only: scrollIntoView could move the page too.
  useEffect(() => {
    const bar = barRef.current;
    const pill = bar?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!bar || !pill) return;
    const barBox = bar.getBoundingClientRect();
    const pillBox = pill.getBoundingClientRect();
    const left = bar.scrollLeft + (pillBox.left - barBox.left) - (barBox.width - pillBox.width) / 2;
    if (typeof bar.scrollTo === 'function') {
      bar.scrollTo({ left, behavior: scrollBehavior });
    } else {
      bar.scrollLeft = left;
    }
  }, [activeSection, isVisible, scrollBehavior]);

  // Use double requestAnimationFrame to prevent forced reflow
  const scrollToSection = useCallback(
    (sectionId: string) => {
      const element = document.getElementById(sectionId);
      if (element) {
        // Put the section in the address so it can be linked to and reloaded
        // (UX audit T-03). replaceState rather than a router navigation: the
        // route has not changed, and a history entry per tap would turn Back
        // into a walk back up the page. The observer above must never do this —
        // it fires continuously while scrolling.
        window.history.replaceState(window.history.state, '', `#${sectionId}`);
        // Highlight the tapped pill at once, and keep it while the page scrolls.
        tappedRef.current = sectionId;
        setActiveSection(sectionId);
        holdTappedSection();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Calculate offset dynamically based on actual nav height
            const navHeight = navRef.current?.offsetHeight || 70;
            const offset = navHeight + 10; // Add small buffer
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.scrollY - offset;

            // On a busy main thread the settle timer can fire before these
            // frames run and clear the hold, so take it again with the timer.
            tappedRef.current = sectionId;
            holdTappedSection();
            window.scrollTo({
              top: offsetPosition,
              behavior: scrollBehavior,
            });
          });
        });
      }
    },
    [scrollBehavior, holdTappedSection]
  );

  if (!isVisible) return null;

  return (
    // Portalled: inside the page `fixed top-0` pinned to the top of the page, so
    // the bar scrolled away with the content (see ViewportPortal).
    <ViewportPortal>
      <m.div
        ref={navRef}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'fixed top-0 left-0 right-0 z-30 pt-(--sat)',
          'bg-background/95 backdrop-blur-lg',
          'border-b border-border',
          'shadow-xs',
          className
        )}
      >
        <div
          ref={barRef}
          className="w-full overflow-x-auto"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <nav
            aria-label="Team details section navigation"
            className="flex items-center gap-1 px-4 py-2 min-w-max"
          >
            {sections.map(({ id, label, icon: Icon, ariaLabel }) => {
              const isActive = activeSection === id;
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => scrollToSection(id)}
                  aria-label={ariaLabel}
                  aria-current={isActive ? 'location' : undefined}
                  className={cn(
                    'hit-area-44 relative flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                    'text-sm font-medium transition-all whitespace-nowrap',
                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted text-foreground/70 hover:bg-muted/80 hover:text-foreground'
                  )}
                >
                  <Icon size={14} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </m.div>
    </ViewportPortal>
  );
};

export default TeamDetailsStickyNav;
