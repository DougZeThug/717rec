/**
 * Admin Configuration
 *
 * Centralized configuration for admin dashboard features, permissions, and limits.
 * The password-based access has been replaced by profile-based admin access.
 */

// ==================== Admin Access ====================

// Legacy admin code (kept for reference in case needed)
export const ADMIN_ACCESS_CODE = '';

// ==================== Admin Dashboard Configuration ====================

export const ADMIN_CONFIG = {
  /** Items per page in admin tables and lists */
  paginationLimit: 20,

  /** Maximum items in a batch operation */
  maxBatchSize: 50,

  /** Maximum file upload size in bytes (10MB) */
  maxUploadSize: 10 * 1024 * 1024,

  /** Auto-save delay for admin forms (in milliseconds) */
  autoSaveDelay: 2000,

  /** Enable audit logging for admin actions */
  enableAuditLog: true,

  /** Session timeout for admin users (30 minutes in milliseconds) */
  sessionTimeout: 30 * 60 * 1000,
} as const;

// ==================== Admin Permissions ====================

export const ADMIN_PERMISSIONS = {
  /** Can manage seasons (create, edit, finalize) */
  MANAGE_SEASONS: 'manage_seasons',

  /** Can manage divisions and configuration */
  MANAGE_DIVISIONS: 'manage_divisions',

  /** Can manage teams (CRUD operations) */
  MANAGE_TEAMS: 'manage_teams',

  /** Can manage match schedule and scoring */
  MANAGE_MATCHES: 'manage_matches',

  /** Can manage playoff brackets */
  MANAGE_PLAYOFFS: 'manage_playoffs',

  /** Can manage user roles and permissions */
  MANAGE_USERS: 'manage_users',

  /** Can manage hero cards and announcements */
  MANAGE_HERO_CARDS: 'manage_hero_cards',

  /** Can access blind draw functionality */
  ACCESS_BLIND_DRAW: 'access_blind_draw',

  /** Can view admin dashboard and analytics */
  VIEW_ADMIN_DASHBOARD: 'view_admin_dashboard',
} as const;

// ==================== Validation Rules ====================

export const ADMIN_VALIDATION = {
  /** Minimum teams required for a division */
  minTeamsPerDivision: 2,

  /** Maximum teams in a division */
  maxTeamsPerDivision: 20,

  /** Minimum players per team */
  minPlayersPerTeam: 1,

  /** Maximum players per team */
  maxPlayersPerTeam: 10,

  /** Minimum matches in a season */
  minMatchesPerSeason: 1,

  /** Maximum concurrent seasons */
  maxConcurrentSeasons: 3,
} as const;

// ==================== Feature Flags (Admin-specific) ====================

export const ADMIN_FEATURES = {
  /** Enable bulk operations in admin dashboard */
  enableBulkOperations: true,

  /** Enable advanced scheduling algorithm */
  enableAdvancedScheduling: true,

  /** Enable data export functionality */
  enableDataExport: true,

  /** Enable admin notifications */
  enableNotifications: true,

  /** Enable debug mode for troubleshooting */
  enableDebugMode: false,
} as const;
