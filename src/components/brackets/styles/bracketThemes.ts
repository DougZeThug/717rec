
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
    matchWidth: 180,
    matchHeight: 70,
    columnGap: 40,
    rowGap: 20
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
    matchWidth: 180,
    matchHeight: 70,
    columnGap: 40,
    rowGap: 20
  }
};

export const compactTheme: BracketTheme = {
  ...defaultTheme,
  name: 'compact',
  spacing: {
    matchWidth: 150,
    matchHeight: 60,
    columnGap: 30,
    rowGap: 15
  }
};

export const largeTheme: BracketTheme = {
  ...defaultTheme,
  name: 'large',
  spacing: {
    matchWidth: 220,
    matchHeight: 90,
    columnGap: 50,
    rowGap: 30
  }
};

export const getTheme = (themeName: string, size?: 'compact' | 'normal' | 'large'): BracketTheme => {
  let theme = themeName === 'light' ? lightTheme : defaultTheme;
  
  if (size === 'compact') {
    theme = { ...theme, spacing: compactTheme.spacing };
  } else if (size === 'large') {
    theme = { ...theme, spacing: largeTheme.spacing };
  }
  
  return theme;
};
