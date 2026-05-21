import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCreateNotification,
  useDeleteNotification,
  useUpdateNotification,
} from '@/hooks/notifications/useNotificationMutations';
import { useNotificationsQuery } from '@/hooks/notifications/useNotificationsQuery';
import { useNotificationsRealtime } from '@/hooks/notifications/useNotificationsRealtime';
import { toast } from '@/hooks/useToast';
import type { NotificationRow } from '@/services/notifications/NotificationService';

const NotificationsAdmin: React.FC = () => {
  useNotificationsRealtime();
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotificationsQuery(100);
  const create = useCreateNotification();
  const update = useUpdateNotification();
  const del = useDeleteNotification();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<NotificationRow | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: { title: t, body: b } });
        setEditing(null);
        toast({ title: 'Notification updated' });
      } else {
        await create.mutateAsync({ title: t, body: b, createdBy: user?.id ?? null });
        toast({ title: 'Notification posted' });
      }
      setTitle('');
      setBody('');
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const startEdit = (n: NotificationRow) => {
    setEditing(n);
    setTitle(n.title);
    setBody(n.body);
  };

  const cancelEdit = () => {
    setEditing(null);
    setTitle('');
    setBody('');
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Admin Notifications</h1>

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
            const isExpired = n.expires_at && Date.parse(n.expires_at) < Date.now();
            const rel = (() => {
              try {
                return formatDistanceToNow(new Date(n.created_at), { addSuffix: true });
              } catch {
                return '';
              }
            })();
            return (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {n.title}
                      {isExpired && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                          Expired
                        </span>
                      )}
                    </h3>
                    <span className="shrink-0 text-xs text-muted-foreground">{rel}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {n.body}
                  </p>
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
                    onClick={() => del.mutate(n.id)}
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
    </div>
  );
};

export default NotificationsAdmin;