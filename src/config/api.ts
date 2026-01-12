/**
 * API Configuration
 *
 * Centralized configuration for API endpoints, timeouts, retry logic, and request limits.
 */

// ==================== Retry Configuration ====================

export const API_RETRY = {
  /** Maximum number of retry attempts for failed requests */
  MAX_RETRIES: 3,

  /** Base delay between retries in milliseconds */
  RETRY_DELAY_MS: 5000,

  /** Retry backoff strategy */
  BACKOFF_STRATEGY: 'exponential' as const, // 'exponential' | 'linear' | 'fixed'

  /** Maximum retry delay (for exponential backoff) */
  MAX_RETRY_DELAY_MS: 30000,
} as const;

// ==================== Request Timeouts ====================

export const API_TIMEOUTS = {
  /** Short timeout for simple queries (5 seconds) */
  SHORT: 5000,

  /** Standard timeout for most requests (10 seconds) */
  STANDARD: 10000,

  /** Long timeout for complex operations (30 seconds) */
  LONG: 30000,

  /** Extended timeout for batch operations (60 seconds) */
  EXTENDED: 60000,
} as const;

// ==================== Request Limits ====================

export const API_LIMITS = {
  /** Maximum items per page for paginated requests */
  DEFAULT_PAGE_SIZE: 20,

  /** Maximum items in a single batch operation */
  MAX_BATCH_SIZE: 50,

  /** Maximum items to fetch for dropdowns/selects */
  MAX_DROPDOWN_ITEMS: 100,

  /** Maximum team requests to display per team */
  MAX_TEAM_REQUESTS: 10,

  /** Maximum messages to keep in memory */
  MAX_MESSAGES_IN_STATE: 100,
} as const;

// ==================== Debounce/Throttle Timings ====================

export const API_TIMINGS = {
  /** Search input debounce delay (300ms) */
  SEARCH_DEBOUNCE_MS: 300,

  /** Filter input debounce delay (300ms) */
  FILTER_DEBOUNCE_MS: 300,

  /** Auto-save debounce delay (1 second) */
  AUTOSAVE_DEBOUNCE_MS: 1000,

  /** Scroll event throttle (100ms) */
  SCROLL_THROTTLE_MS: 100,
} as const;

// ==================== Polling Intervals ====================

export const POLLING_INTERVALS = {
  /** Disabled polling */
  DISABLED: false,

  /** Very frequent polling - 10 seconds (live data) */
  VERY_FREQUENT: 10 * 1000,

  /** Frequent polling - 30 seconds (near real-time) */
  FREQUENT: 30 * 1000,

  /** Standard polling - 1 minute */
  STANDARD: 60 * 1000,

  /** Infrequent polling - 5 minutes */
  INFREQUENT: 5 * 60 * 1000,
} as const;

// ==================== Data Freshness Thresholds ====================

export const DATA_FRESHNESS = {
  /** Threshold for updating historical data (12 hours) */
  HISTORY_UPDATE_THRESHOLD_HOURS: 12,

  /** Threshold for considering cache stale (5 minutes) */
  CACHE_STALE_THRESHOLD_MS: 5 * 60 * 1000,

  /** Threshold for warning about old data (1 hour) */
  OLD_DATA_WARNING_THRESHOLD_MS: 60 * 60 * 1000,
} as const;

// ==================== Request Headers ====================

export const API_HEADERS = {
  /** Default content type for API requests */
  DEFAULT_CONTENT_TYPE: 'application/json',

  /** Content type for form data */
  FORM_DATA_CONTENT_TYPE: 'multipart/form-data',

  /** Content type for URL-encoded forms */
  URL_ENCODED_CONTENT_TYPE: 'application/x-www-form-urlencoded',
} as const;

// ==================== Error Codes ====================

export const API_ERROR_CODES = {
  /** Network error (no response received) */
  NETWORK_ERROR: 'NETWORK_ERROR',

  /** Timeout error */
  TIMEOUT: 'TIMEOUT',

  /** Unauthorized (401) */
  UNAUTHORIZED: 'UNAUTHORIZED',

  /** Forbidden (403) */
  FORBIDDEN: 'FORBIDDEN',

  /** Not found (404) */
  NOT_FOUND: 'NOT_FOUND',

  /** Server error (500+) */
  SERVER_ERROR: 'SERVER_ERROR',

  /** Rate limit exceeded (429) */
  RATE_LIMITED: 'RATE_LIMITED',
} as const;
