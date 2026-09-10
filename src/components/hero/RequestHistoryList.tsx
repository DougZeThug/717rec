import { Loader2 } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS, type TeamRequest } from '@/types/teamRequest';
import { formatWithPattern } from '@/utils/formatDateSafe';

/** Approved reads as done, refused as a warning, and anything else as waiting. */
const statusVariant = (status: TeamRequest['status']) => {
  if (status === 'APPROVED') return 'default';
  if (status === 'DENIED') return 'destructive';
  return 'secondary';
};

/** One past request: what was asked for, how it went, and for which night. */
const RequestRow: React.FC<{ request: TeamRequest }> = ({ request }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-background/10 border border-white/10">
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{REQUEST_TYPE_LABELS[request.request_type]}</span>
        <Badge variant={statusVariant(request.status)} className="text-xs">
          {REQUEST_STATUS_LABELS[request.status]}
        </Badge>
      </div>
      {request.match_date && (
        <span className="text-xs opacity-70" suppressHydrationWarning>
          {formatWithPattern(request.match_date, 'MMM d, yyyy')}
        </span>
      )}
    </div>
    <span className="text-xs opacity-50" suppressHydrationWarning>
      {formatWithPattern(request.created_at, 'MMM d')}
    </span>
  </div>
);

interface RequestHistoryListProps {
  requests: TeamRequest[] | undefined;
  isLoading: boolean;
  onBack: () => void;
}

/** What this team has asked for before, and how each one went. */
const RequestHistoryList: React.FC<RequestHistoryListProps> = ({ requests, isLoading, onBack }) => (
  <>
    <Label className="text-sm font-medium opacity-90">Recent Requests</Label>

    {isLoading && (
      <div className="flex justify-center p-4">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )}

    {!isLoading && requests && requests.length > 0 && (
      <div className="space-y-2">
        {requests.map((request) => (
          <RequestRow key={request.id} request={request} />
        ))}
      </div>
    )}

    {!isLoading && !requests?.length && (
      <p className="text-sm opacity-70 text-center py-4">No requests yet</p>
    )}

    <Button
      variant="ghost"
      size="sm"
      onClick={onBack}
      className="w-full text-inherit hover:bg-white/10"
    >
      Back to form
    </Button>
  </>
);

export default RequestHistoryList;
