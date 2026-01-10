import { AnimatePresence, motion } from 'framer-motion';
import { LucideProps } from 'lucide-react';
import React, { cloneElement, isValidElement, ReactElement, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router';

import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { ICON_STROKE } from '@/styles/icon-system';
import { prefetchRoute } from '@/utils/routePrefetch';

export interface NavItemProps {
  to: string;
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  className?: string;
  onClick?: () => void;
}

export const NavItem: React.FC<NavItemProps> = React.memo(
  ({ to, label, icon, isActive: isActiveProp, className, onClick }) => {
    const location = useLocation();
    // Use base theme hook - no homepage dependency needed
    const { isWinterTheme } = useSeasonalThemeBase();
    const isActive = isActiveProp !== undefined ? isActiveProp : location.pathname === to;

    // Prefetch route on hover/touch for faster navigation
    const handlePrefetch = useCallback(() => {
      prefetchRoute(to);
    }, [to]);

    // Memoize icon cloning to prevent recreating on each render
    const styledIcon = useMemo(() => {
      if (!isValidElement(icon)) return icon;
      return cloneElement(icon as ReactElement<LucideProps>, {
        strokeWidth: isActive ? ICON_STROKE.bold : ICON_STROKE.light,
      });
    }, [icon, isActive]);

    return (
      <Link
        to={to}
        onClick={onClick}
        onMouseEnter={handlePrefetch}
        onFocus={handlePrefetch}
        onTouchStart={handlePrefetch}
        className={cn(
          'flex items-center justify-center transition-all duration-300 touch-manipulation',
          'relative text-center',
          'min-h-[44px] min-w-[44px] px-3 py-2',
          // Default active/inactive states
          !isWinterTheme &&
            (isActive
              ? 'text-primary dark:text-white'
              : 'text-muted-foreground hover:text-foreground'),
          // Winter theme states
          isWinterTheme &&
            (isActive ? 'nav-item-winter-active' : 'text-slate-400 hover:text-cyan-200'),
          className
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        {/* Ice-glass pill behind active item (winter only) */}
        {isWinterTheme && isActive && (
          <div className="absolute inset-1 rounded-lg nav-pill-winter" />
        )}

        <div className="flex flex-col items-center relative z-10">
          {styledIcon && (
            <motion.div
              className={cn(
                'mb-1',
                !isWinterTheme && isActive && 'text-primary dark:text-blue-300',
                isWinterTheme &&
                  isActive &&
                  'text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.5)]'
              )}
              animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {styledIcon}
            </motion.div>
          )}
          {label && (
            <span
              className={cn(
                'text-xs transition-all',
                isActive ? 'font-semibold' : 'font-normal',
                isWinterTheme && isActive && 'text-cyan-200'
              )}
            >
              {label}
            </span>
          )}
        </div>
        <AnimatePresence>
          {isActive && (
            <motion.span
              className={cn(
                'absolute bottom-0 left-0 right-0 mx-auto h-[3px] rounded-full origin-center w-2/3',
                // Default gradient
                !isWinterTheme &&
                  'bg-gradient-to-r from-cornhole-navy via-blue-600 to-amber-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] dark:from-blue-400 dark:via-blue-300 dark:to-amber-400',
                // Winter gradient
                isWinterTheme && 'nav-indicator-winter'
              )}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
      </Link>
    );
  }
);

NavItem.displayName = 'NavItem';

export default NavItem;
