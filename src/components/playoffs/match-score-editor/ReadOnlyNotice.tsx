import React from 'react';

import { Button } from '@/components/ui/button';

interface ReadOnlyNoticeProps {
  /** Still working out whether this person is an admin: say nothing yet. */
  accessLoading?: boolean;
  /** The profile did not load, so "not an admin" cannot be told from a dropped request. */
  accessCheckFailed?: boolean;
  onRetryAccessCheck?: () => void;
}

/**
 * The one line under a read-only score pop-up that says why there is no Save.
 *
 * While the admin check is still running it stays silent: a real admin sees the
 * pop-up for a moment before the check ends, and must not read "Only admins".
 */
export const ReadOnlyNotice: React.FC<ReadOnlyNoticeProps> = ({
  accessLoading,
  accessCheckFailed,
  onRetryAccessCheck,
}) => {
  if (accessLoading) return null;

  if (accessCheckFailed) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">Could not check admin access.</p>
        <Button variant="ghost" size="sm" onClick={onRetryAccessCheck}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      Only admins can save scores. Sign in as an admin to edit.
    </p>
  );
};
