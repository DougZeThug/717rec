/**
 * UI Configuration
 *
 * Centralized configuration for UI-related constants including breakpoints,
 * dimensions, limits, and display settings.
 */

// ==================== Responsive Breakpoints ====================

export const BREAKPOINTS = {
  /** Mobile breakpoint in pixels */
  MOBILE: 768,

  /** Tablet breakpoint in pixels */
  TABLET: 1024,

  /** Desktop breakpoint in pixels */
  DESKTOP: 1280,

  /** Large desktop breakpoint in pixels */
  LARGE_DESKTOP: 1536,
} as const;

// ==================== Bracket Display Configuration ====================

export const BRACKET_CONFIG = {
  /** Match card width in pixels */
  MATCH_WIDTH: 280,

  /** Match card height in pixels */
  MATCH_HEIGHT: 160,

  /** Spacing between bracket elements */
  SPACING: 40,

  /** Minimum zoom/scale level */
  MIN_SCALE: 0.1,

  /** Maximum zoom/scale level */
  MAX_SCALE: 3,

  /** Zoom step increment */
  SCALE_STEP: 0.2,
} as const;

// ==================== Toast Notifications ====================

export const TOAST_CONFIG = {
  /** Maximum number of toasts to display simultaneously */
  LIMIT: 1,

  /** Duration before toast auto-dismisses (in milliseconds) */
  REMOVE_DELAY: 1000000, // ~16 minutes (effectively no auto-dismiss)

  /** Default toast duration for success messages (3 seconds) */
  SUCCESS_DURATION: 3000,

  /** Default toast duration for error messages (5 seconds) */
  ERROR_DURATION: 5000,

  /** Default toast duration for info messages (4 seconds) */
  INFO_DURATION: 4000,
} as const;

// ==================== Pagination & Display Limits ====================

export const DISPLAY_LIMITS = {
  /** Default items per page for tables/lists */
  DEFAULT_PAGE_SIZE: 20,

  /** Items to display in recent match trends */
  RECENT_MATCHES_TREND: 5,

  /** Messages per page in message board */
  MESSAGE_BOARD_PAGE_SIZE: 10,

  /** Maximum messages to keep loaded */
  MAX_MESSAGES_LOADED: 100,

  /** Maximum team requests to display */
  MAX_TEAM_REQUESTS: 10,

  /** Maximum dropdown items before requiring search */
  MAX_DROPDOWN_ITEMS: 100,
} as const;

// ==================== Text & Content Limits ====================

export const CONTENT_LIMITS = {
  /** Maximum message length in characters */
  MAX_MESSAGE_LENGTH: 500,

  /** Maximum team name length */
  MAX_TEAM_NAME_LENGTH: 50,

  /** Maximum player name length */
  MAX_PLAYER_NAME_LENGTH: 100,

  /** Maximum division name length */
  MAX_DIVISION_NAME_LENGTH: 50,

  /** Maximum comment length */
  MAX_COMMENT_LENGTH: 500,
} as const;

// ==================== Animation & Transition Durations ====================

export const ANIMATION_DURATIONS = {
  /** Fast animation (150ms) */
  FAST: 150,

  /** Standard animation (300ms) */
  STANDARD: 300,

  /** Slow animation (500ms) */
  SLOW: 500,

  /** Page transition duration */
  PAGE_TRANSITION: 200,

  /** Modal/dialog animation */
  MODAL: 250,
} as const;

// ==================== Sidebar Configuration ====================

export const SIDEBAR_CONFIG = {
  /** Cookie max age in seconds (7 days) */
  COOKIE_MAX_AGE: 60 * 60 * 24 * 7,

  /** Default sidebar width in pixels */
  WIDTH: 256,

  /** Collapsed sidebar width in pixels */
  COLLAPSED_WIDTH: 64,
} as const;

// ==================== Match Prediction Thresholds ====================

export const PREDICTION_CONFIG = {
  /** Threshold for considering a matchup an "upset" (30% underdog wins) */
  UPSET_THRESHOLD: 0.30,

  /** Threshold for "balanced" match based on power score difference */
  BALANCED_THRESHOLD: 2.0,

  /** Weight given to power score in predictions (70%) */
  WEIGHT_POWER_SCORE: 0.70,

  /** Weight given to strength of schedule (15%) */
  WEIGHT_SOS: 0.15,

  /** Weight given to division tier (15%) */
  WEIGHT_DIVISION: 0.15,

  /** Logistic curve steepness factor */
  LOGISTIC_K: 5,

  /** Default power score for new teams */
  DEFAULT_POWER_SCORE: 50,

  /** Default strength of schedule */
  DEFAULT_SOS: 0.85,

  /** Default division weight */
  DEFAULT_DIVISION_WEIGHT: 0.85,
} as const;

// ==================== Team & League Configuration ====================

export const TEAM_CONFIG = {
  /** Minimum teams required for back-to-back pairing (2 matches) */
  MIN_TEAMS_PER_BACK_TO_BACK_PAIR: 4,

  /** Maximum teams for back-to-back pairing (8 matches) */
  MAX_TEAMS_PER_BACK_TO_BACK_PAIR: 16,

  /** Maximum tier gap allowed in scheduling */
  MAX_TIER_GAP: 1,

  /** Default division weight for rankings */
  DEFAULT_DIVISION_WEIGHT: 0.85,
} as const;

// ==================== Color & Theme Constants ====================

export const THEME_CONFIG = {
  /** Enable dark mode by default */
  DEFAULT_DARK_MODE: false,

  /** Available theme options */
  THEMES: ['light', 'dark', 'system'] as const,
} as const;

// ==================== Loading & Skeleton States ====================

export const LOADING_CONFIG = {
  /** Minimum loading state duration to prevent flicker (in ms) */
  MIN_LOADING_DURATION: 300,

  /** Skeleton pulse animation duration */
  SKELETON_PULSE_DURATION: 2000,
} as const;
