import React, { ReactNode } from 'react';

import { WinterSnowfall } from '@/components/effects/WinterSnowfall';
import { useIsMobile } from '@/hooks/useMobile';
import { useThemeConsistency } from '@/hooks/useThemeConsistency';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { animations, gradients } from '@/styles/design-system';

interface PageLayoutProps {
  children: ReactNode;
  withBackground?: boolean;
  className?: string;
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
  compact = false,
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
        'min-h-screen transition-colors duration-300 overflow-x-hidden',
        getGradientClass(),
        isMobile
          ? compact
            ? 'py-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]'
            : 'py-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]'
          : 'py-5 pb-6',
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

      <main id="main-content" className="max-w-full w-full relative z-10">
        {children}
      </main>
    </div>
  );
};

export default PageLayout;
