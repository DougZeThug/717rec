import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import {
  useCreateNotification,
  useDeleteNotification,
  useUpdateNotification,
} from '@/hooks/notifications/useNotificationMutations';
import { useNotificationsQuery } from '@/hooks/notifications/useNotificationsQuery';
import { useNotificationsRealtime } from '@/hooks/notifications/useNotificationsRealtime';
import { toast } from '@/hooks/useToast';
import type { NotificationRow as NotificationRecord } from '@/services/notifications/NotificationService';
import { isoToLocalInput, localInputToIso } from '@/utils/datetimeLocal';
import { getUIErrorMessage } from '@/utils/errorHandler';

import NotificationRow from './NotificationRow';

const getCurrentTimeMs = () => Date.now();
const NOTIFICATION_CLOCK_FALLBACK_INTERVAL_MS = 60_000;
const NOTIFICATION_EXPIRY_REFRESH_BUFFER_MS = 1_000;

const NotificationsTab: React.FC<{ currentTimeMs?: number }> = ({
  currentTimeMs: suppliedTimeMs,
}) => {
  const [liveTimeMs, setLiveTimeMs] = useState(() => getCurrentTimeMs());
  const currentTimeMs = suppliedTimeMs ?? liveTimeMs;
  useNotificationsRealtime();
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotificationsQuery(100);

  useEffect(() => {
    if (suppliedTimeMs !== undefined) return undefined;

    let timeout: number | undefined;

    // Re-arms itself after every tick. The earlier version scheduled one timeout
    // from the notification list and never rescheduled — `liveTimeMs` is not a
    // dependency, so the effect did not re-run when the timeout fired. Only the
    // first expiry was ever noticed; a second one never re-rendered the list.
    const tick = () => {
      const now = getCurrentTimeMs();
      setLiveTimeMs(now);

      // One pass, and only the soonest is needed. `>= now` rather than `> now`:
      // a row counts as expired once the clock is strictly past it, so an expiry
      // landing on this exact millisecond is still ahead of us and must be
      // scheduled — dropping it would leave the badge waiting for the fallback.
      let nextExpiry = Number.POSITIVE_INFINITY;
      for (const n of notifications) {
        if (!n.expires_at) continue;
        const expiresAt = Date.parse(n.expires_at);
        if (Number.isFinite(expiresAt) && expiresAt >= now && expiresAt < nextExpiry) {
          nextExpiry = expiresAt;
        }
      }

      const untilNextExpiry =
        nextExpiry === Number.POSITIVE_INFINITY
          ? Number.POSITIVE_INFINITY
          : nextExpiry - now + NOTIFICATION_EXPIRY_REFRESH_BUFFER_MS;

      // Capped at the fallback interval. setTimeout overflows past ~24.9 days
      // and fires at once, and an expiry far in the future needs no precision.
      const delay = Math.min(
        Math.max(untilNextExpiry, NOTIFICATION_EXPIRY_REFRESH_BUFFER_MS),
        NOTIFICATION_CLOCK_FALLBACK_INTERVAL_MS
      );

      timeout = window.setTimeout(tick, delay);
    };

    // Runs immediately so a newly-arrived, already-expired notification is
    // evaluated against a fresh clock on this render cycle.
    tick();

    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [notifications, suppliedTimeMs]);

  const create = useCreateNotification();
  const update = useUpdateNotification();
  const del = useDeleteNotification();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  // The EXPIRED tag and the "Expires" line already existed, but nothing in the
  // app could set an expiry, so neither could ever be produced.
  const [expiresAt, setExpiresAt] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NotificationRecord | null>(null);
  const isSubmittingRef = useRef(false);

  const editing = useMemo(
    () => (editingId ? (notifications.find((n) => n.id === editingId) ?? null) : null),
    [editingId, notifications]
  );

  useEffect(() => {
    if (editingId && !editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale edit state when the underlying notification is removed by a realtime update
      setEditingId(null);
      setTitle('');
      setBody('');
      setExpiresAt('');
      toast({
        title: 'Notification deleted',
        description: 'The notification you were editing has been removed.',
        variant: 'destructive',
      });
    }
  }, [editingId, editing]);

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    del.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Enter in the title submits the form. The button is disabled while the
    // mutation runs, but that disable only lands on the next render, so a fast
    // double Enter could post the same notification twice. A ref closes the
    // window because it is set in the same tick as the press.
    if (isSubmittingRef.current) return;
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) return;
    const expires = localInputToIso(expiresAt);
    isSubmittingRef.current = true;
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          patch: { title: trimmedTitle, body: trimmedBody, expires_at: expires },
        });
        setEditingId(null);
        toast({ title: 'Notification updated' });
      } else {
        await create.mutateAsync({
          title: trimmedTitle,
          body: trimmedBody,
          createdBy: user?.id ?? null,
          expiresAt: expires,
        });
        toast({ title: 'Notification posted' });
      }
      setTitle('');
      setBody('');
      setExpiresAt('');
    } catch (err) {
      toast({
        title: 'Save failed',
        description: getUIErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const startEdit = (n: NotificationRecord) => {
    setEditingId(n.id);
    setTitle(n.title);
    setBody(n.body);
    setExpiresAt(isoToLocalInput(n.expires_at));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setExpiresAt('');
  };

  return (
    <div className="flex flex-col">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{editing ? 'Edit notification' : 'New notification'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input
              placeholder="Title (max 120 chars)"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Message (max 1000 chars)"
              maxLength={1000}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label
                htmlFor="notification-expires-at"
                className="text-sm font-medium text-foreground"
              >
                Expires (optional)
              </label>
              <Input
                id="notification-expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave this empty to keep the notification until it is deleted. After this time it is
                tagged EXPIRED.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={create.isPending || update.isPending || !title.trim() || !body.trim()}
              >
                {editing ? 'Save changes' : 'Post notification'}
              </Button>
              {editing && (
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Recent notifications</h2>
      {isLoading && notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              currentTimeMs={currentTimeMs}
              onEdit={startEdit}
              onDelete={setPendingDelete}
              isDeleting={del.isPending}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={() => setPendingDelete(null)}
        title="Delete this notification?"
        description={
          <>
            <strong>{pendingDelete?.title}</strong> will be removed from the notification bell for
            everyone in the league. This cannot be undone.
          </>
        }
        onConfirm={handleConfirmDelete}
        isPending={del.isPending}
      />
    </div>
  );
};

export default NotificationsTab;
