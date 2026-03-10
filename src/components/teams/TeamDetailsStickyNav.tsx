import { motion } from 'framer-motion';
import { BarChart3, Clock, Swords, TrendingUp, Trophy, Users } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
  ariaLabel: string;
}

const sections: Section[] = [
  {
    id: 'stats',
    label: 'Stats',
    icon: BarChart3,
    ariaLabel: 'Navigate to team statistics section',
  },
  {
    id: 'analysis',
    label: 'Analysis',
    icon: TrendingUp,
    ariaLabel: 'Navigate to team analysis section',
  },
  { id: 'h2h', label: 'H2H', icon: Swords, ariaLabel: 'Navigate to head-to-head records section' },
  { id: 'matches', label: 'Matches', icon: Clock, ariaLabel: 'Navigate to match history section' },
  {
    id: 'career',
    label: 'Career',
    icon: TrendingUp,
    ariaLabel: 'Navigate to career statistics section',
  },
  {
    id: 'achievements',
    label: 'Awards',
    icon: Trophy,
    ariaLabel: 'Navigate to team achievements section',
  },
];

interface TeamDetailsStickyNavProps {
  className?: string;
}

export const TeamDetailsStickyNav: React.FC<TeamDetailsStickyNavProps> = ({ className }) => {
  const [activeSection, setActiveSection] = useState<string>('stats');
  const [isVisible, setIsVisible] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Track which section is currently in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
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

    return () => observer.disconnect();
  }, []);

  // Show/hide sticky nav based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past 200px (roughly past the header)
      setIsVisible(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Use double requestAnimationFrame to prevent forced reflow
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Calculate offset dynamically based on actual nav height
          const navHeight = navRef.current?.offsetHeight || 70;
          const offset = navHeight + 10; // Add small buffer
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          });
        });
      });
    }
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      ref={navRef}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 left-0 right-0 z-30',
        'bg-background/95 backdrop-blur-lg',
        'border-b border-border',
        'shadow-sm',
        className
      )}
      role="navigation"
      aria-label="Team details section navigation"
    >
      <ScrollArea className="w-full">
        <nav className="flex items-center gap-1 px-4 py-2 min-w-max">
          {sections.map(({ id, label, icon: Icon, ariaLabel }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                aria-label={ariaLabel}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                  'text-sm font-medium transition-all whitespace-nowrap',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-foreground/70 hover:bg-muted/80 hover:text-foreground'
                )}
              >
                <Icon size={14} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </motion.div>
  );
};

export default TeamDetailsStickyNav;
