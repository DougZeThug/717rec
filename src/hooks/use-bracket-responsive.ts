import { useCallback, useEffect, useRef, useState } from 'react';

import { useIsMobile } from '@/hooks/use-mobile';

interface BracketResponsiveConfig {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  isLandscape: boolean;
  matchCardWidth: number;
  matchCardHeight: number;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  minTouchTarget: number;
  containerPadding: number;
  roundHeaderHeight: number;
}

const MOBILE_CONFIG: Partial<BracketResponsiveConfig> = {
  matchCardWidth: 200,
  matchCardHeight: 120,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },
  minTouchTarget: 44,
  containerPadding: 16,
  roundHeaderHeight: 48,
};

const TABLET_CONFIG: Partial<BracketResponsiveConfig> = {
  matchCardWidth: 240,
  matchCardHeight: 140,
  spacing: {
    xs: 6,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
  fontSize: {
    xs: '0.875rem',
    sm: '1rem',
    md: '1.125rem',
    lg: '1.25rem',
    xl: '1.5rem',
  },
  minTouchTarget: 44,
  containerPadding: 24,
  roundHeaderHeight: 56,
};

const DESKTOP_CONFIG: Partial<BracketResponsiveConfig> = {
  matchCardWidth: 280,
  matchCardHeight: 160,
  spacing: {
    xs: 8,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
  fontSize: {
    xs: '1rem',
    sm: '1.125rem',
    md: '1.25rem',
    lg: '1.5rem',
    xl: '1.75rem',
  },
  minTouchTarget: 32,
  containerPadding: 32,
  roundHeaderHeight: 64,
};

/**
 * Determines device type using matchMedia to avoid forced reflow
 */
function getDeviceType(): { isTablet: boolean; isDesktop: boolean; isLandscape: boolean } {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return { isTablet: false, isDesktop: false, isLandscape: false };
  }
  
  const isTablet = window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches;
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
  const isLandscape = window.matchMedia('(orientation: landscape)').matches;
  
  return { isTablet, isDesktop, isLandscape };
}

export const useBracketResponsive = (): BracketResponsiveConfig => {
  const isMobile = useIsMobile();
  const [deviceType, setDeviceType] = useState(getDeviceType);
  const [isTouch, setIsTouch] = useState(false);
  const rafIdRef = useRef<number | null>(null);

  // Debounced update using requestAnimationFrame to prevent forced reflow
  const updateDeviceType = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      setDeviceType(getDeviceType());
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    // Use matchMedia listeners instead of resize events for better performance
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const landscapeQuery = window.matchMedia('(orientation: landscape)');

    const handleChange = () => updateDeviceType();

    // Modern browsers use addEventListener
    tabletQuery.addEventListener?.('change', handleChange);
    desktopQuery.addEventListener?.('change', handleChange);
    landscapeQuery.addEventListener?.('change', handleChange);

    // Detect if device supports touch (doesn't cause reflow)
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      tabletQuery.removeEventListener?.('change', handleChange);
      desktopQuery.removeEventListener?.('change', handleChange);
      landscapeQuery.removeEventListener?.('change', handleChange);
    };
  }, [updateDeviceType]);

  const { isTablet, isDesktop, isLandscape } = deviceType;

  const getConfig = (): BracketResponsiveConfig => {
    let baseConfig: Partial<BracketResponsiveConfig>;

    if (isMobile) {
      baseConfig = MOBILE_CONFIG;
    } else if (isTablet) {
      baseConfig = TABLET_CONFIG;
    } else {
      baseConfig = DESKTOP_CONFIG;
    }

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouch,
      isLandscape,
      ...baseConfig,
    } as BracketResponsiveConfig;
  };

  return getConfig();
};
