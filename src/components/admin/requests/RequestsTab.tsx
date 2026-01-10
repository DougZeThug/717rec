import { format } from 'date-fns';
import { Check, Clock, Inbox, Loader2, X } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useAllRequests,
  usePendingRequestsCount,
  useUpdateRequestStatus,
} from '@/hooks/useTeamRequests';
import { cn } from '@/lib/utils';
import { REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS, TeamRequestStatus } from '@/types/teamRequest';

const RequestsTab: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<TeamRequestStatus | 'ALL'>('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'deny' | null>(null);

  const { data: requests, isLoading } = useAllRequests(
    statusFilter === 'ALL' ? undefined : statusFilter
  );
  const { data: pendingCount } = usePendingRequestsCount();
  const updateMutation = useUpdateRequestStatus();

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    await updateMutation.mutateAsync({
      id: selectedRequest,
      status: actionType === 'approve' ? 'APPROVED' : 'DENIED',
      admin_notes: adminNotes || undefined,
    });

    setSelectedRequest(null);
    setAdminNotes('');
    setActionType(null);
  };

  const openActionDialog = (requestId: string, action: 'approve' | 'deny') => {
    setSelectedRequest(requestId);
    setActionType(action);
    setAdminNotes('');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          Team Requests
          {pendingCount !== undefined && pendingCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingCount} pending
            </Badge>
          )}
        </CardTitle>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as TeamRequestStatus | 'ALL')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Requests</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="DENIED">Denied</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className={cn(
                  'border rounded-lg p-4 space-y-3',
                  request.status === 'PENDING' && 'border-amber-500/50 bg-amber-500/5'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{request.teams?.name || 'Unknown Team'}</span>
                      <Badge
                        variant={
                          request.request_type === 'EMERGENCY_CANCEL' ? 'destructive' : 'outline'
                        }
                      >
                        {REQUEST_TYPE_LABELS[request.request_type]}
                      </Badge>
                      <Badge
                        variant={
                          request.status === 'APPROVED'
                            ? 'default'
                            : request.status === 'DENIED'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {REQUEST_STATUS_LABELS[request.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Submitted {format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}
                      {request.submitted_by_name && ` by ${request.submitted_by_name}`}
                    </p>
                  </div>

                  {/* Actions for pending requests */}
                  {request.status === 'PENDING' && (
                    <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => openActionDialog(request.id, 'approve')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openActionDialog(request.id, 'deny')}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  )}
                </div>

                {/* Request details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {request.match_date && (
                    <div>
                      <span className="text-muted-foreground">Date:</span>{' '}
                      <span className="font-medium">
                        {format(new Date(request.match_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {request.current_timeslot && (
                    <div>
                      <span className="text-muted-foreground">Current:</span>{' '}
                      <span className="font-medium">{request.current_timeslot}</span>
                    </div>
                  )}
                  {request.requested_timeslot && (
                    <div>
                      <span className="text-muted-foreground">Requested:</span>{' '}
                      <span className="font-medium">{request.requested_timeslot}</span>
                    </div>
                  )}
                </div>

                {/* Reason */}
                {request.reason && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Reason:</span>{' '}
                    <span>{request.reason}</span>
                  </div>
                )}

                {/* Admin notes */}
                {request.admin_notes && (
                  <div className="text-sm bg-muted/50 p-2 rounded">
                    <span className="text-muted-foreground">Admin notes:</span>{' '}
                    <span>{request.admin_notes}</span>
                  </div>
                )}

                {/* Processed info */}
                {request.processed_at && (
                  <p className="text-xs text-muted-foreground">
                    Processed {format(new Date(request.processed_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No requests found</p>
            {statusFilter !== 'ALL' && <p className="text-sm mt-1">Try changing the filter</p>}
          </div>
        )}
      </CardContent>

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Request' : 'Deny Request'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Approve this request? You can add optional notes.'
                : 'Deny this request? Consider adding a reason.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Add notes (optional)..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={updateMutation.isPending}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {actionType === 'approve' ? 'Approve' : 'Deny'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RequestsTab;
