import {
  Activity,
  AlertTriangle,
  ExternalLink,
  FileText,
  Inbox,
  ListChecks,
  Mail,
  RefreshCw,
  Server,
  Wrench,
} from 'lucide-react';
import React, { useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useLastPowerSnapshot,
  usePendingOpsCounts,
  useRealtimeHealth,
  type RealtimeConnectionState,
} from '@/hooks/useOpsHealth';
import { cn } from '@/lib/utils';

export const OPS_LINKS = {
  supabaseStatus: 'https://status.supabase.com',
  lovableStatus: 'https://status.lovable.dev',
  operationsDoc:
    'https://github.com/717rec/717rec/blob/main/docs/OPERATIONS.md#2-league-night-playbook',
  supabaseSqlEditor: 'https://supabase.com/dashboard/project/wcitdamvochthvxvtxyb/sql/new',
};

const STORAGE_KEY = 'adminActiveTab';

const SNAPSHOT_STALE_DAYS = 8;

const dotClass = (state: RealtimeConnectionState): string => {
  switch (state) {
    case 'connected':
      return 'bg-emerald-500';
    case 'connecting':
      return 'bg-amber-500';
    case 'closed':
      return 'bg-muted-foreground';
    case 'error':
    default:
      return 'bg-red-500';
  }
};

const stateLabel = (state: RealtimeConnectionState): string => {
  switch (state) {
    case 'connected':
      return 'Realtime connected';
    case 'connecting':
      return 'Connecting…';
    case 'closed':
      return 'Channel closed';
    case 'error':
    default:
      return 'Realtime error';
  }
};

const daysSince = (iso: string): number => {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
};

const relativeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'moments ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const formatEst = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const switchAdminTab = (tabId: string): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, tabId);
  } catch {
    // ignore storage errors (private mode, etc.)
  }
  window.location.reload();
};

interface QueueTileProps {
  label: string;
  count: number;
  icon: React.ElementType;
  onClick: () => void;
  loading: boolean;
}

const QueueTile: React.FC<QueueTileProps> = ({ label, count, icon: Icon, onClick, loading }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors',
      'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      count > 0 && 'border-primary/50'
    )}
    aria-label={`${label}: ${count} — open section`}
  >
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </div>
    <div className="text-2xl font-semibold tabular-nums">{loading ? '—' : count}</div>
  </button>
);

const LeagueNightStatusTab: React.FC = () => {
  const realtime = useRealtimeHealth();
  const snapshotQuery = useLastPowerSnapshot();
  const countsQuery = usePendingOpsCounts();

  const snapshot = snapshotQuery.data ?? null;
  const isSnapshotStale = snapshot ? daysSince(snapshot.created_at) >= SNAPSHOT_STALE_DAYS : false;
  const isSnapshotMissing = !snapshotQuery.isLoading && !snapshot;

  const goToTab = useCallback((tabId: string) => () => switchAdminTab(tabId), []);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">League Night Status</h2>
        <p className="text-sm text-muted-foreground">
          At-a-glance health for the incident commander. Everything here is read-only — actions
          open the relevant admin section or an external status page.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Realtime health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" aria-hidden="true" />
              Realtime
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={cn('inline-block size-2.5 rounded-full', dotClass(realtime.state))}
                aria-hidden="true"
              />
              <span className="font-medium">{stateLabel(realtime.state)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {realtime.lastChangeAt
                ? `Last state change: ${relativeAgo(realtime.lastChangeAt.toISOString())}`
                : 'Waiting for first status…'}
            </p>
            {realtime.state === 'error' && (
              <p className="text-xs text-red-500">
                If a scorer is stuck, ask them to refresh once — that re-subscribes the channel.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Last power snapshot */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="size-4" aria-hidden="true" />
              Last power snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshotQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {isSnapshotMissing && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertTriangle className="size-4" aria-hidden="true" />
                No snapshot has ever been captured.
              </div>
            )}
            {snapshot && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Ran {relativeAgo(snapshot.created_at)}</span>
                  {isSnapshotStale && (
                    <Badge variant="destructive" className="text-xs">
                      Stale
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Week {snapshot.week_number} · {snapshot.row_count} team
                  {snapshot.row_count === 1 ? '' : 's'} captured
                </p>
                <p className="text-xs text-muted-foreground">{formatEst(snapshot.created_at)} EST</p>
                {isSnapshotStale && (
                  <p className="text-xs text-red-500">
                    Older than {SNAPSHOT_STALE_DAYS} days — verify pg_cron and CRON_WEBHOOK_SECRET.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending queues */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pending queues</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QueueTile
            label="Score reports"
            count={countsQuery.data?.pendingScoreSubmissions ?? 0}
            icon={ListChecks}
            loading={countsQuery.isLoading}
            onClick={goToTab('pending-matches')}
          />
          <QueueTile
            label="Team requests"
            count={countsQuery.data?.pendingTeamRequests ?? 0}
            icon={Inbox}
            loading={countsQuery.isLoading}
            onClick={goToTab('requests')}
          />
          <QueueTile
            label="Contact inbox"
            count={countsQuery.data?.newContactRequests ?? 0}
            icon={Mail}
            loading={countsQuery.isLoading}
            onClick={goToTab('contact-inbox')}
          />
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={goToTab('live-corrections')}>
            <Wrench className="mr-2 size-4" aria-hidden="true" />
            Live corrections
          </Button>
          <Button variant="secondary" size="sm" onClick={goToTab('scores')}>
            <ListChecks className="mr-2 size-4" aria-hidden="true" />
            Mass score entry
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={OPS_LINKS.supabaseStatus} target="_blank" rel="noopener noreferrer">
              <Server className="mr-2 size-4" aria-hidden="true" />
              Supabase status
              <ExternalLink className="ml-2 size-3" aria-hidden="true" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={OPS_LINKS.lovableStatus} target="_blank" rel="noopener noreferrer">
              <Server className="mr-2 size-4" aria-hidden="true" />
              Lovable status
              <ExternalLink className="ml-2 size-3" aria-hidden="true" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={OPS_LINKS.supabaseSqlEditor} target="_blank" rel="noopener noreferrer">
              <FileText className="mr-2 size-4" aria-hidden="true" />
              SQL editor
              <ExternalLink className="ml-2 size-3" aria-hidden="true" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={OPS_LINKS.operationsDoc} target="_blank" rel="noopener noreferrer">
              <FileText className="mr-2 size-4" aria-hidden="true" />
              Playbook
              <ExternalLink className="ml-2 size-3" aria-hidden="true" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeagueNightStatusTab;