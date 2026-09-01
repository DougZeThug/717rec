import { Trash2 } from 'lucide-react';
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
import type { NotificationRow } from '@/services/notifications/NotificationService';
import { isoToLocalInput, localInputToIso } from '@/utils/datetimeLocal';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { formatNotificationDate } from '@/utils/formatNotificationDate';

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
  const [pendingDelete, setPendingDelete] = useState<NotificationRow | null>(null);
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
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;
    const expires = localInputToIso(expiresAt);
    isSubmittingRef.current = true;
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          patch: { title: t, body: b, expires_at: expires },
        });
        setEditingId(null);
        toast({ title: 'Notification updated' });
      } else {
        await create.mutateAsync({
          title: t,
          body: b,
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

  const startEdit = (n: NotificationRow) => {
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
          {notifications.map((n) => {
            const isExpired = n.expires_at && Date.parse(n.expires_at) < currentTimeMs;
            const posted = formatNotificationDate(n.created_at);
            const expires = n.expires_at ? formatNotificationDate(n.expires_at) : null;
            return (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <h3 className="text-sm font-semibold text-foreground sm:truncate">
                      {n.title}
                      {isExpired && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                          Expired
                        </span>
                      )}
                    </h3>
                    <time
                      dateTime={posted.iso}
                      title={posted.iso}
                      className="flex shrink-0 flex-col text-right text-[11px] leading-tight text-muted-foreground sm:items-end"
                    >
                      <span className="font-medium text-foreground/80 tabular-nums">
                        {posted.absolute}
                      </span>
                      {posted.relative && <span>{posted.relative}</span>}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {n.body}
                  </p>
                  {expires && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Expires <span className="tabular-nums">{expires.absolute}</span>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(n)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDelete(n)}
                    disabled={del.isPending}
                    aria-label="Delete notification"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
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
