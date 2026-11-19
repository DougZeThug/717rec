/**
 * Admin Configuration
 *
 * Centralized configuration for admin dashboard features, permissions, and limits.
 * The password-based access has been replaced by profile-based admin access.
 */

// ==================== Admin Dashboard Configuration ====================

export const ADMIN_CONFIG = {
  /** Maximum file upload size in bytes (10MB) */
  maxUploadSize: 10 * 1024 * 1024,
} as const;
