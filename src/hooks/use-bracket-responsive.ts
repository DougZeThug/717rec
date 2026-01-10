import { useEffect, useState } from 'react';

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

export const useBracketResponsive = (): BracketResponsiveConfig => {
  const isMobile = useIsMobile();
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const handleTouchStart = () => {
      setIsTouch(true);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('touchstart', handleTouchStart, { once: true });

    // Detect if device supports touch
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  const isTablet = dimensions.width >= 768 && dimensions.width < 1024;
  const isDesktop = dimensions.width >= 1024;
  const isLandscape = dimensions.width > dimensions.height;

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
