import { useCallback, useEffect, useMemo, useState } from 'react';

import type { NotificationRow } from '@/services/notifications/NotificationService';

import { useNotificationsQuery } from './useNotificationsQuery';

const STORAGE_KEY = '717rec:notifications:lastSeenAt';
const EPOCH = new Date(0).toISOString();

function readLastSeen(): string {
  if (typeof window === 'undefined') return EPOCH;
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? EPOCH;
  } catch {
    return EPOCH;
  }
}

function writeLastSeen(iso: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, iso);
  } catch {
    // private mode / quota — ignore
  }
}

export interface UseUnreadNotificationsResult {
  notifications: NotificationRow[];
  unreadCount: number;
  lastSeenAt: string;
  isLoading: boolean;
  markAllSeen: () => void;
}

export function useUnreadNotifications(): UseUnreadNotificationsResult {
  const { data, isLoading } = useNotificationsQuery();
  const [lastSeenAt, setLastSeenAt] = useState<string>(() => readLastSeen());

  // Cross-tab sync via storage event
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLastSeenAt(e.newValue ?? EPOCH);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const notifications = useMemo(() => data ?? [], [data]);

  const unreadCount = useMemo(() => {
    const lastSeenMs = Date.parse(lastSeenAt) || 0;
    return notifications.filter((n) => {
      const createdMs = Date.parse(n.created_at) || 0;
      return createdMs > lastSeenMs;
    }).length;
  }, [notifications, lastSeenAt]);

  const markAllSeen = useCallback(() => {
    const now = new Date().toISOString();
    writeLastSeen(now);
    setLastSeenAt(now);
  }, []);

  return { notifications, unreadCount, lastSeenAt, isLoading, markAllSeen };
}