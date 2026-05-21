import { CheckCircle2, Inbox, RefreshCcw, Trash2 } from 'lucide-react';
import React, { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  useContactRequests,
  useDeleteContactRequest,
  useMarkContactRequestResolved,
  useReopenContactRequest,
} from '@/hooks/contact/useContactRequests';
import { cn } from '@/lib/utils';
import { formatNotificationDate } from '@/utils/formatNotificationDate';

const TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  timeslot: {
    label: 'Timeslot',
    cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30',
  },
  score: {
    label: 'Score',
    cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30',
  },
  join_league: {
    label: 'Join the league',
    cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
  },
  general: {
    label: 'General',
    cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30',
  },
  other: {
    label: 'Other',
    cls: 'bg-muted text-muted-foreground border-border',
  },
};

function contactHref(contact: string): string | undefined {
  const trimmed = contact.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
  const digits = trimmed.replace(/[^0-9+]/g, '');
  if (digits.length >= 7) return `tel:${digits}`;
  return undefined;
}

const ContactInboxSection: React.FC = () => {
  const { user } = useAuth();
  const { data: requests = [], isLoading } = useContactRequests();
  const markResolved = useMarkContactRequestResolved();
  const reopen = useReopenContactRequest();
  const remove = useDeleteContactRequest();

  const newCount = useMemo(
    () => requests.filter((r) => r.status === 'new').length,
    [requests]
  );

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Inbox className="size-5 text-muted-foreground" />
          Contact inbox
        </CardTitle>
        {newCount > 0 && (
          <Badge variant="destructive" className="rounded-full">
            {newCount} new
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contact requests yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {requests.map((r) => {
              const stamp = formatNotificationDate(r.created_at);
              const type = TYPE_LABELS[r.request_type] ?? TYPE_LABELS.other;
              const href = contactHref(r.submitter_contact);
              const isResolved = r.status === 'resolved';
              return (
                <li
                  key={r.id}
                  className={cn(
                    'rounded-md border border-border bg-card p-3',
                    isResolved && 'opacity-60'
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn('font-medium', type.cls)}>
                      {type.label}
                    </Badge>
                    {r.is_verified && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="mr-1 size-3" /> Verified
                      </Badge>
                    )}
                    {isResolved && (
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        Resolved
                      </Badge>
                    )}
                    <time
                      dateTime={stamp.iso}
                      title={stamp.iso}
                      className="ml-auto text-[11px] tabular-nums text-muted-foreground"
                    >
                      {stamp.absolute}
                    </time>
                  </div>

                  <div className="mt-2 text-sm text-foreground">
                    <span className="font-semibold">{r.submitter_name}</span>
                    {r.submitter_team && (
                      <span className="text-muted-foreground"> · {r.submitter_team}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {href ? (
                      <a className="hover:underline" href={href}>
                        {r.submitter_contact}
                      </a>
                    ) : (
                      r.submitter_contact
                    )}
                  </div>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground/90">
                    {r.message}
                  </p>

                  {r.players && (
                    <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
                      <span className="font-medium text-foreground">Players: </span>
                      <span className="text-muted-foreground">{r.players}</span>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {isResolved ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => reopen.mutate(r.id)}
                        disabled={reopen.isPending}
                      >
                        <RefreshCcw className="mr-1 size-3.5" /> Reopen
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          markResolved.mutate({ id: r.id, userId: user?.id ?? null })
                        }
                        disabled={markResolved.isPending}
                      >
                        <CheckCircle2 className="mr-1 size-3.5" /> Mark resolved
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => remove.mutate(r.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="mr-1 size-3.5" /> Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactInboxSection;