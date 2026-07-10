/**
 * Admin Configuration
 *
 * Centralized configuration for admin dashboard features, permissions, and limits.
 * The password-based access has been replaced by profile-based admin access.
 */

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
