import { Trophy, Star, Calendar, Shuffle, History, Sparkles, Megaphone, Medal, Flag, Zap, PartyPopper, Target, Users, Crown } from 'lucide-react';

export const HERO_CARD_COLOR_PRESETS = [
  {
    id: 'blue-amber',
    name: '717REC Blue & Amber',
    description: 'Default league gradient',
    background_color: 'bg-gradient-to-r from-blue-600 to-amber-500',
    text_color: 'text-white',
    preview: 'linear-gradient(to right, #2563eb, #f59e0b)'
  },
  {
    id: 'emerald-teal',
    name: 'Event Green',
    description: 'Great for events & announcements',
    background_color: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
    text_color: 'text-white',
    preview: 'linear-gradient(to right, #10b981, #14b8a6, #06b6d4)'
  },
  {
    id: 'dark-slate',
    name: 'Dark Mode',
    description: 'Sleek dark appearance',
    background_color: 'bg-gradient-to-r from-slate-800 to-slate-900',
    text_color: 'text-white',
    preview: 'linear-gradient(to right, #1e293b, #0f172a)'
  },
  {
    id: 'amber-gold',
    name: 'Champions Gold',
    description: 'Perfect for champion highlights',
    background_color: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600',
    text_color: 'text-amber-900',
    preview: 'linear-gradient(to right, #fbbf24, #eab308, #d97706)'
  },
  {
    id: 'red-warning',
    name: 'Alert / Warning',
    description: 'Draw attention to important notices',
    background_color: 'bg-gradient-to-r from-red-500 to-orange-500',
    text_color: 'text-white',
    preview: 'linear-gradient(to right, #ef4444, #f97316)'
  },
  {
    id: 'purple-violet',
    name: 'Special Event',
    description: 'Unique events & celebrations',
    background_color: 'bg-gradient-to-r from-purple-600 to-violet-500',
    text_color: 'text-white',
    preview: 'linear-gradient(to right, #9333ea, #8b5cf6)'
  },
  {
    id: 'light-neutral',
    name: 'Light & Clean',
    description: 'Subtle, professional look',
    background_color: 'bg-gradient-to-r from-slate-100 to-gray-200',
    text_color: 'text-slate-800',
    preview: 'linear-gradient(to right, #f1f5f9, #e5e7eb)'
  }
] as const;

export const HERO_CARD_ICONS = [
  { id: '', name: 'No Icon', icon: null, description: 'No icon displayed' },
  { id: 'Trophy', name: 'Trophy', icon: Trophy, description: 'Championships & winners' },
  { id: 'Crown', name: 'Crown', icon: Crown, description: 'Royalty & champions' },
  { id: 'Star', name: 'Star', icon: Star, description: 'Featured content' },
  { id: 'Medal', name: 'Medal', icon: Medal, description: 'Awards & recognition' },
  { id: 'Calendar', name: 'Calendar', icon: Calendar, description: 'Events & dates' },
  { id: 'Shuffle', name: 'Shuffle', icon: Shuffle, description: 'Blind draw events' },
  { id: 'History', name: 'History', icon: History, description: 'Past seasons & records' },
  { id: 'Sparkles', name: 'Sparkles', icon: Sparkles, description: 'Special announcements' },
  { id: 'Megaphone', name: 'Megaphone', icon: Megaphone, description: 'Important announcements' },
  { id: 'Flag', name: 'Flag', icon: Flag, description: 'Milestones & goals' },
  { id: 'Zap', name: 'Zap', icon: Zap, description: 'Action & energy' },
  { id: 'PartyPopper', name: 'Party', icon: PartyPopper, description: 'Celebrations' },
  { id: 'Target', name: 'Target', icon: Target, description: 'Goals & focus' },
  { id: 'Users', name: 'Team', icon: Users, description: 'Team-related content' },
] as const;

export const HERO_CARD_TYPES = [
  { id: 'standard', name: 'Simple Banner', description: 'Basic text with optional link' },
  { id: 'champions', name: 'Champions Highlight', description: 'Feature season winners' },
  { id: 'event', name: 'Event Promo', description: 'Events with countdowns & details' },
  { id: 'announcement', name: 'Announcement', description: 'Important league news' },
] as const;

export const TARGET_TYPE_OPTIONS = [
  { id: 'none', name: 'No specific target', description: 'Show to everyone' },
  { id: 'team', name: 'Highlight a Team', description: 'Feature a specific team' },
  { id: 'division', name: 'Highlight a Division', description: 'Feature a division' },
  { id: 'season', name: 'Highlight a Season', description: 'Feature a season' },
] as const;

// Helper to find preset by background color
export const findPresetByColors = (bgColor: string, textColor: string) => {
  return HERO_CARD_COLOR_PRESETS.find(
    p => p.background_color === bgColor && p.text_color === textColor
  );
};

// Helper to find icon by id
export const findIconById = (iconId: string) => {
  return HERO_CARD_ICONS.find(i => i.id === iconId);
};
