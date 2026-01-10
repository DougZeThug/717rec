/**
 * Icon Registry
 *
 * Central mapping of all commonly used icons in the application.
 * This provides a single source of truth for icon usage and enables
 * automatic winter variant swapping when the winter theme is active.
 *
 * Usage:
 *   import { getIcon, iconRegistry } from "@/icons";
 *   const TrophyIcon = getIcon("trophy");
 */

import {
  // Status
  AlertCircle,
  AlertTriangle,
  ArrowDownAZ,
  ArrowLeft,
  ArrowRight,
  ArrowUpAZ,
  // Navigation
  Award,
  Bookmark,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Crown,
  Download,
  Edit,
  ExternalLink,
  // Misc
  Eye,
  EyeOff,
  Filter,
  Flag,
  Flame,
  Grid2X2,
  Heart,
  Home,
  Info,
  List,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Medal,
  Menu,
  // Social
  MessageCircle,
  Minus,
  Moon,
  Plus,
  RefreshCw,
  // Actions
  Save,
  // Data
  Search,
  Settings,
  Share,
  Snowflake,
  Star,
  Sun,
  Table,
  Target,
  Trash,
  // Content
  Trophy,
  Unlock,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react';

import { IconName, IconRegistryEntry, WinterGlyphName } from './types';

/**
 * Main icon registry - maps icon names to their Lucide components
 * and optionally specifies winter variants
 */
export const iconRegistry: Record<IconName, IconRegistryEntry> = {
  // Navigation icons
  award: { icon: Award, category: 'navigation' },
  calendar: { icon: Calendar, category: 'navigation' },
  users: { icon: Users, category: 'navigation' },
  'chevron-right': { icon: ChevronRight, category: 'navigation' },
  'chevron-left': { icon: ChevronLeft, category: 'navigation' },
  'chevron-down': { icon: ChevronDown, category: 'navigation' },
  'chevron-up': { icon: ChevronUp, category: 'navigation' },
  'arrow-left': { icon: ArrowLeft, category: 'navigation' },
  'arrow-right': { icon: ArrowRight, category: 'navigation' },
  home: { icon: Home, category: 'navigation' },
  menu: { icon: Menu, category: 'navigation' },
  x: { icon: X, category: 'navigation' },

  // Action icons
  save: { icon: Save, category: 'action' },
  edit: { icon: Edit, category: 'action' },
  trash: { icon: Trash, category: 'action', winterVariant: 'ice-shard' },
  plus: { icon: Plus, category: 'action' },
  minus: { icon: Minus, category: 'action' },
  check: { icon: Check, category: 'action', winterVariant: 'sparkle-frost' },
  copy: { icon: Copy, category: 'action' },
  download: { icon: Download, category: 'action' },
  upload: { icon: Upload, category: 'action' },
  'refresh-cw': { icon: RefreshCw, category: 'action' },
  settings: { icon: Settings, category: 'action' },
  'log-out': { icon: LogOut, category: 'action' },
  'log-in': { icon: LogIn, category: 'action' },
  'external-link': { icon: ExternalLink, category: 'action' },

  // Status icons
  'alert-circle': { icon: AlertCircle, category: 'status' },
  'check-circle': { icon: CheckCircle, category: 'status', winterVariant: 'sparkle-frost' },
  info: { icon: Info, category: 'status', winterVariant: 'frost-crystal' },
  'alert-triangle': { icon: AlertTriangle, category: 'status', winterVariant: 'ice-shard' },
  'loader-2': { icon: Loader2, category: 'status' },

  // Content icons
  trophy: { icon: Trophy, category: 'content', winterVariant: 'frozen-trophy' },
  medal: { icon: Medal, category: 'content', winterVariant: 'frozen-trophy' },
  star: { icon: Star, category: 'content', winterVariant: 'winter-star' },
  flag: { icon: Flag, category: 'content' },
  target: { icon: Target, category: 'content', winterVariant: 'frost-crystal' },
  crown: { icon: Crown, category: 'content', winterVariant: 'frozen-trophy' },
  flame: { icon: Flame, category: 'content' }, // Keep flame as-is (contrast to winter)
  zap: { icon: Zap, category: 'content', winterVariant: 'sparkle-frost' },

  // Data icons
  search: { icon: Search, category: 'data' },
  filter: { icon: Filter, category: 'data' },
  'sort-asc': { icon: ArrowUpAZ, category: 'data' },
  'sort-desc': { icon: ArrowDownAZ, category: 'data' },
  list: { icon: List, category: 'data' },
  grid: { icon: Grid2X2, category: 'data' },
  table: { icon: Table, category: 'data' },

  // Social icons
  'message-circle': { icon: MessageCircle, category: 'social' },
  heart: { icon: Heart, category: 'social' },
  share: { icon: Share, category: 'social' },
  bookmark: { icon: Bookmark, category: 'social' },

  // Misc icons
  eye: { icon: Eye, category: 'misc' },
  'eye-off': { icon: EyeOff, category: 'misc' },
  lock: { icon: Lock, category: 'misc', winterVariant: 'frost-crystal' },
  unlock: { icon: Unlock, category: 'misc' },
  sun: { icon: Sun, category: 'misc' },
  moon: { icon: Moon, category: 'misc' },
  snowflake: { icon: Snowflake, category: 'misc', winterVariant: 'snowflake' },
};

/**
 * Get an icon component by name
 */
export const getIcon = (name: IconName) => iconRegistry[name]?.icon;

/**
 * Get the winter variant name for an icon (if it has one)
 */
export const getIconWinterVariant = (name: IconName): WinterGlyphName | undefined => {
  return iconRegistry[name]?.winterVariant;
};

/**
 * Check if an icon has a winter variant
 */
export const hasWinterVariant = (name: IconName): boolean => {
  return !!iconRegistry[name]?.winterVariant;
};

/**
 * Get all icons in a specific category
 */
export const getIconsByCategory = (category: IconRegistryEntry['category']) => {
  return Object.entries(iconRegistry)
    .filter(([_, entry]) => entry.category === category)
    .map(([name, entry]) => ({ name: name as IconName, ...entry }));
};
