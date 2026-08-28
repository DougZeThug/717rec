import { CheckCircle2, Inbox, RefreshCcw, Trash2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleButtonGroup } from '@/components/ui/ToggleButtonGroup';
import { useAuth } from '@/contexts/auth-context';
import {
  useContactRequests,
  useDeleteContactRequest,
  useMarkContactRequestResolved,
  useReopenContactRequest,
} from '@/hooks/contact/useContactRequests';
import {
  useMarkSupportTicketResolved,
  useReopenSupportTicket,
  useSupportTickets,
} from '@/hooks/support/useSupportTickets';
import { cn } from '@/lib/utils';
import { formatNotificationDate } from '@/utils/formatNotificationDate';

const TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  timeslot: {
    label: 'Timeslot Request',
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

/** Subjects offered by the /contact form, mapped to the label an admin reads. */
const SUPPORT_SUBJECT_LABELS: Record<string, string> = {
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
  account_issue: 'Account Issue',
  score_dispute: 'Score Dispute',
  general_question: 'General Question',
  other: 'Other',
};

const SUPPORT_CLS = 'bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/30';

function contactHref(contact: string): string | undefined {
  const trimmed = contact.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
  const digits = trimmed.replace(/[^0-9+]/g, '');
  if (digits.length >= 7) return `tel:${digits}`;
  return undefined;
}

type InboxSource = 'league' | 'support';
type InboxFilter = 'all' | InboxSource;

/**
 * One row shape for both message channels: league requests from the home page
 * panel (`contact_requests`) and support tickets from /contact
 * (`support_tickets`). Before this, /contact messages reached no admin screen
 * at all — see B-10.
 */
interface InboxItem {
  id: string;
  source: InboxSource;
  kindLabel: string;
  kindCls: string;
  name: string;
  team: string | null;
  contact: string;
  message: string;
  players: string | null;
  verified: boolean;
  /** support_tickets has no DELETE policy, so only league rows can be removed. */
  canDelete: boolean;
  isResolved: boolean;
  createdAt: string;
}

const ContactInboxSection: React.FC = () => {
  const { user } = useAuth();
  const { data: requests = [], isLoading: requestsLoading } = useContactRequests();
  const { data: tickets = [], isLoading: ticketsLoading } = useSupportTickets();

  const markResolved = useMarkContactRequestResolved();
  const reopen = useReopenContactRequest();
  const remove = useDeleteContactRequest();
  const markTicketResolved = useMarkSupportTicketResolved();
  const reopenTicket = useReopenSupportTicket();

  const [filter, setFilter] = useState<InboxFilter>('all');

  const isLoading = requestsLoading || ticketsLoading;

  const items = useMemo<InboxItem[]>(() => {
    const leagueItems: InboxItem[] = requests.map((r) => {
      const type = TYPE_LABELS[r.request_type] ?? TYPE_LABELS.other;
      return {
        id: r.id,
        source: 'league',
        kindLabel: type.label,
        kindCls: type.cls,
        name: r.submitter_name,
        team: r.submitter_team,
        contact: r.submitter_contact,
        message: r.message,
        players: r.players,
        verified: r.is_verified,
        canDelete: true,
        isResolved: r.status === 'resolved',
        createdAt: r.created_at,
      };
    });

    const supportItems: InboxItem[] = tickets.map((t) => ({
      id: t.id,
      source: 'support',
      kindLabel: SUPPORT_SUBJECT_LABELS[t.subject] ?? t.subject,
      kindCls: SUPPORT_CLS,
      name: t.name,
      team: null,
      contact: t.email,
      message: t.message,
      players: null,
      verified: false,
      canDelete: false,
      isResolved: t.status === 'resolved',
      createdAt: t.created_at,
    }));

    return [...leagueItems, ...supportItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [requests, tickets]);

  const leagueCount = items.filter((i) => i.source === 'league').length;
  const supportCount = items.length - leagueCount;
  const newCount = useMemo(() => items.filter((i) => !i.isResolved).length, [items]);

  const visibleItems = filter === 'all' ? items : items.filter((i) => i.source === filter);

  const handleResolve = (item: InboxItem) => {
    if (item.source === 'support') markTicketResolved.mutate(item.id);
    else markResolved.mutate({ id: item.id, userId: user?.id ?? null });
  };

  const handleReopen = (item: InboxItem) => {
    if (item.source === 'support') reopenTicket.mutate(item.id);
    else reopen.mutate(item.id);
  };

  const resolvePending = markResolved.isPending || markTicketResolved.isPending;
  const reopenPending = reopen.isPending || reopenTicket.isPending;

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
        <div className="mb-4">
          <ToggleButtonGroup<InboxFilter>
            variant="segmented"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All (${items.length})` },
              { value: 'league', label: `League requests (${leagueCount})` },
              { value: 'support', label: `Support (${supportCount})` },
            ]}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            League requests come from the message form at the foot of the home page. Support
            messages come from the Contact page and are also emailed to the league.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : visibleItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {items.length === 0 ? 'No messages yet.' : 'No messages of this kind.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visibleItems.map((item) => {
              const stamp = formatNotificationDate(item.createdAt);
              const href = contactHref(item.contact);
              return (
                <li
                  key={`${item.source}-${item.id}`}
                  className={cn(
                    'rounded-md border border-border bg-card p-3',
                    item.isResolved && 'opacity-60'
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn('font-medium', item.kindCls)}>
                      {item.kindLabel}
                    </Badge>
                    {item.source === 'support' && (
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        Support
                      </Badge>
                    )}
                    {item.verified && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="mr-1 size-3" /> Verified
                      </Badge>
                    )}
                    {item.isResolved && (
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
                    <span className="font-semibold">{item.name}</span>
                    {item.team && <span className="text-muted-foreground"> · {item.team}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.contact ? (
                      href ? (
                        <a className="hover:underline" href={href}>
                          {item.contact}
                        </a>
                      ) : (
                        item.contact
                      )
                    ) : (
                      <span className="italic">No contact provided</span>
                    )}
                  </div>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground/90">
                    {item.message}
                  </p>

                  {item.players && (
                    <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
                      <span className="font-medium text-foreground">Players: </span>
                      <span className="text-muted-foreground">{item.players}</span>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.isResolved ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReopen(item)}
                        disabled={reopenPending}
                      >
                        <RefreshCcw className="mr-1 size-3.5" /> Reopen
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleResolve(item)}
                        disabled={resolvePending}
                      >
                        <CheckCircle2 className="mr-1 size-3.5" /> Mark resolved
                      </Button>
                    )}
                    {item.canDelete && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => remove.mutate(item.id)}
                        disabled={remove.isPending}
                      >
                        <Trash2 className="mr-1 size-3.5" /> Delete
                      </Button>
                    )}
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
