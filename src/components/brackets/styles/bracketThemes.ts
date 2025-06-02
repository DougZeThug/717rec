
import { BracketTheme } from "../types/bracketTypes";

export const defaultTheme: BracketTheme = {
  name: 'default',
  colors: {
    background: '#1f2937',
    winners: '#3b82f6',
    losers: '#f97316',
    finals: '#a855f7',
    completed: '#10b981',
    pending: '#6b7280',
    text: '#ffffff',
    border: '#374151'
  },
  spacing: {
    matchWidth: 200,
    matchHeight: 80,
    columnGap: 60,
    rowGap: 24
  }
};

export const lightTheme: BracketTheme = {
  name: 'light',
  colors: {
    background: '#ffffff',
    winners: '#2563eb',
    losers: '#ea580c',
    finals: '#9333ea',
    completed: '#059669',
    pending: '#6b7280',
    text: '#111827',
    border: '#e5e7eb'
  },
  spacing: {
    matchWidth: 200,
    matchHeight: 80,
    columnGap: 60,
    rowGap: 24
  }
};

export const compactTheme: BracketTheme = {
  ...defaultTheme,
  name: 'compact',
  spacing: {
    matchWidth: 180,
    matchHeight: 70,
    columnGap: 50,
    rowGap: 20
  }
};

export const largeTheme: BracketTheme = {
  ...defaultTheme,
  name: 'large',
  spacing: {
    matchWidth: 240,
    matchHeight: 100,
    columnGap: 80,
    rowGap: 32
  }
};

// Mobile-optimized theme
export const mobileTheme: BracketTheme = {
  ...defaultTheme,
  name: 'mobile',
  spacing: {
    matchWidth: 160,
    matchHeight: 70,
    columnGap: 40,
    rowGap: 16
  }
};

export const getTheme = (themeName: string, size?: 'compact' | 'normal' | 'large'): BracketTheme => {
  let theme = themeName === 'light' ? lightTheme : defaultTheme;
  
  // Auto-detect mobile and use mobile theme
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    theme = { ...theme, spacing: mobileTheme.spacing };
  } else {
    if (size === 'compact') {
      theme = { ...theme, spacing: compactTheme.spacing };
    } else if (size === 'large') {
      theme = { ...theme, spacing: largeTheme.spacing };
    }
  }
  
  return theme;
};
