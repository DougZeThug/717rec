import { motion } from 'framer-motion';
import { BarChart3, Clock, Swords, TrendingUp, Trophy, Users } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
}

const sections: Section[] = [
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'analysis', label: 'Analysis', icon: TrendingUp },
  { id: 'h2h', label: 'H2H', icon: Swords },
  { id: 'matches', label: 'Matches', icon: Clock },
  { id: 'career', label: 'Career', icon: TrendingUp },
  { id: 'achievements', label: 'Awards', icon: Trophy },
];

interface TeamDetailsStickyNavProps {
  className?: string;
}

export const TeamDetailsStickyNav: React.FC<TeamDetailsStickyNavProps> = ({ className }) => {
  const [activeSection, setActiveSection] = useState<string>('stats');
  const [isVisible, setIsVisible] = useState(false);

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

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 70; // Account for sticky nav height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
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
    >
      <ScrollArea className="w-full">
        <nav className="flex items-center gap-1 px-4 py-2 min-w-max">
          {sections.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                  'text-sm font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
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
