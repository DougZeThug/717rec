import React, { ReactNode } from 'react';

import { WinterSnowfall } from '@/components/effects/WinterSnowfall';
import { useIsMobile } from '@/hooks/useMobile';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { useThemeConsistency } from '@/hooks/useThemeConsistency';
import { cn } from '@/lib/utils';
import { animations, gradients } from '@/styles/design-system';

interface PageLayoutProps {
  children: ReactNode;
  withBackground?: boolean;
  className?: string;
  /** Kept so existing callers still compile. It changed nothing for a long time. */
  compact?: boolean;
  gradientVariant?: 'default' | 'blue' | 'blueOrange';
}

/**
 * Standardized page layout component used across all main application pages
 */
const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  withBackground = true,
  className = '',
  gradientVariant = 'blueOrange',
}) => {
  const { isDark } = useThemeConsistency();
  const { shouldApplyWinter, shouldApplyWinterBase, isWinterTheme, winterClass } =
    useSeasonalTheme();
  const isMobile = useIsMobile();

  const getGradientClass = () => {
    // Winter theme background for ALL pages when winter theme is active
    if (shouldApplyWinterBase) {
      return 'page-winter-bg';
    }

    if (!withBackground) return '';

    switch (gradientVariant) {
      case 'blue':
        return cn(
          'bg-gradient-to-br',
          isDark
            ? 'from-gray-900 via-gray-800/95 to-gray-900/90'
            : 'from-blue-50 via-white to-blue-50/30'
        );
      case 'blueOrange':
        return gradients.section.blueOrangeSubtle;
      default:
        return 'cornhole-bg';
    }
  };

  return (
    <div
      className={cn(
        'min-h-screen supports-[height:100dvh]:min-h-dvh transition-colors duration-300 overflow-x-clip',
        getGradientClass(),
        // The footer that follows already clears the phone tab bar, so this does
        // not need to (it used to add 5rem, which stacked with the footer's).
        isMobile ? 'py-3 pb-6' : 'py-5 pb-6',
        'px-1 sm:px-3 md:px-4 lg:px-5',
        animations.fadeIn,
        // Apply winter class to all pages for CSS variable overrides
        winterClass,
        // Apply ice pattern to all winter pages, but lighter on inner pages
        shouldApplyWinterBase && 'ice-pattern-bg',
        // Full winter pattern only on homepage
        shouldApplyWinter && 'winter-pattern relative',
        className
      )}
      style={withBackground && !isDark && !isWinterTheme ? { background: '#f8f8f8' } : {}}
    >
      {/* Snow effect for winter theme - homepage only (controlled by WinterSnowfall) */}
      <WinterSnowfall />

      {/*
        Content wrapper. This used to be a second <main id="main-content">, which
        produced two <main> landmarks (the other lives in App.tsx). The single
        <main> now lives in App.tsx and carries the id="main-content" that the
        "Skip to main content" link targets, so this stays a plain <div>.
      */}
      <div className="max-w-full w-full relative z-10">{children}</div>
    </div>
  );
};

export default PageLayout;
