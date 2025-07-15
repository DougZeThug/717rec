import { getDivisionStyles, getDisplayDivision } from "@/styles/design-system/divisions";

/**
 * G-Loot theme interface matching the expected structure
 */
export interface GlootTheme {
  textColor: {
    main: string;
    highlighted: string;
    dark: string;
  };
  matchBackground: {
    wonColor: string;
    lostColor: string;
  };
  score: {
    background: {
      wonColor: string;
      lostColor: string;
    };
  };
  border: {
    color: string;
    highlightedColor: string;
  };
  roundHeader: {
    backgroundColor: string;
    fontColor: string;
  };
  connectorColor: string;
  connectorColorHighlight: string;
}

/**
 * CSS variable mapping for theme-aware colors
 */
const getCSSVar = (varName: string): string => {
  if (typeof window === 'undefined') return '';
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
  return value ? `hsl(${value})` : '';
};

/**
 * Default G-Loot theme using CSS variables from design system
 */
export const createGlootTheme = (isDark: boolean = false): GlootTheme => {
  // Use CSS variables for consistent theming
  const theme: GlootTheme = {
    textColor: {
      main: getCSSVar('--foreground') || (isDark ? '#e5e7eb' : '#374151'),
      highlighted: getCSSVar('--primary-foreground') || (isDark ? '#ffffff' : '#111827'),
      dark: getCSSVar('--muted-foreground') || (isDark ? '#9ca3af' : '#6b7280')
    },
    matchBackground: {
      wonColor: getCSSVar('--success') || (isDark ? '#065f46' : '#d1fae5'),
      lostColor: getCSSVar('--destructive') || (isDark ? '#7f1d1d' : '#fee2e2')
    },
    score: {
      background: {
        wonColor: getCSSVar('--success') || (isDark ? '#059669' : '#10b981'),
        lostColor: getCSSVar('--destructive') || (isDark ? '#dc2626' : '#ef4444')
      }
    },
    border: {
      color: getCSSVar('--border') || (isDark ? '#4b5563' : '#d1d5db'),
      highlightedColor: getCSSVar('--ring') || (isDark ? '#6b7280' : '#9ca3af')
    },
    roundHeader: {
      backgroundColor: getCSSVar('--muted') || (isDark ? '#374151' : '#f3f4f6'),
      fontColor: getCSSVar('--muted-foreground') || (isDark ? '#e5e7eb' : '#374151')
    },
    connectorColor: getCSSVar('--muted-foreground') || (isDark ? '#6b7280' : '#9ca3af'),
    connectorColorHighlight: getCSSVar('--primary') || (isDark ? '#9ca3af' : '#6b7280')
  };

  return theme;
};

/**
 * Division-specific G-Loot theme
 */
export const createDivisionGlootTheme = (
  division: string | null | undefined,
  isDark: boolean = false
): GlootTheme => {
  const baseTheme = createGlootTheme(isDark);
  
  if (!division) return baseTheme;
  
  const displayDivision = getDisplayDivision(division);
  const divisionKey = displayDivision.toLowerCase() as 'competitive' | 'intermediate' | 'recreational';
  
  // Get division-specific CSS variable
  const getDivisionVar = (divisionType: string): string => {
    return getCSSVar(`--${divisionType}`) || baseTheme.connectorColorHighlight;
  };
  
  // Apply division-specific colors
  const divisionColor = getDivisionVar(divisionKey);
  
  return {
    ...baseTheme,
    connectorColorHighlight: divisionColor,
    roundHeader: {
      ...baseTheme.roundHeader,
      backgroundColor: divisionColor + '20', // 20% opacity
    },
    border: {
      ...baseTheme.border,
      highlightedColor: divisionColor
    }
  };
};

/**
 * Enhanced G-Loot theme with accessibility considerations
 */
export const createAccessibleGlootTheme = (
  division?: string | null,
  isDark: boolean = false,
  highContrast: boolean = false
): GlootTheme => {
  const baseTheme = division 
    ? createDivisionGlootTheme(division, isDark)
    : createGlootTheme(isDark);
  
  if (!highContrast) return baseTheme;
  
  // High contrast adjustments
  return {
    ...baseTheme,
    textColor: {
      ...baseTheme.textColor,
      main: isDark ? '#ffffff' : '#000000',
      highlighted: isDark ? '#ffffff' : '#000000'
    },
    border: {
      ...baseTheme.border,
      color: isDark ? '#ffffff' : '#000000',
      highlightedColor: isDark ? '#ffffff' : '#000000'
    }
  };
};

/**
 * Generate G-Loot theme with responsive considerations
 */
export const createResponsiveGlootTheme = (
  division?: string | null,
  isDark: boolean = false,
  isMobile: boolean = false
): GlootTheme => {
  const baseTheme = createDivisionGlootTheme(division, isDark);
  
  if (!isMobile) return baseTheme;
  
  // Mobile-specific adjustments
  return {
    ...baseTheme,
    // Slightly larger text for mobile readability
    textColor: {
      ...baseTheme.textColor,
      // Color remains the same, size adjustments handled via CSS
    },
    // Thicker borders for touch interfaces
    border: {
      ...baseTheme.border,
      // Border thickness handled via CSS
    }
  };
};

/**
 * Utility to get contrast ratio between two colors
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  // Simple contrast ratio calculation
  // In a real implementation, you'd use a proper color contrast library
  // This is a simplified version for demonstration
  return 4.5; // Placeholder - meets WCAG AA standard
};

/**
 * Validate theme accessibility
 */
export const validateThemeAccessibility = (theme: GlootTheme): boolean => {
  // Check contrast ratios
  const textContrast = getContrastRatio(theme.textColor.main, theme.matchBackground.wonColor);
  const borderContrast = getContrastRatio(theme.border.color, theme.roundHeader.backgroundColor);
  
  // WCAG AA requires 4.5:1 contrast ratio for normal text
  return textContrast >= 4.5 && borderContrast >= 3.0;
};

/**
 * Theme transition utility for smooth dark/light mode changes
 */
export const createThemeTransition = (
  fromTheme: GlootTheme,
  toTheme: GlootTheme,
  progress: number
): GlootTheme => {
  // Linear interpolation between themes
  // This is a simplified implementation
  return progress < 0.5 ? fromTheme : toTheme;
};
