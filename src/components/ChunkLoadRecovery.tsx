import { CloudOff, RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface ChunkLoadRecoveryProps {
  /** Reloading is the recovery; injected so a test does not reload the runner. */
  reload?: () => void;
}

/**
 * Shown when a page's code could not be downloaded, rather than the generic
 * "something went wrong" screen (UX audit X-12).
 *
 * **Why this reloads instead of re-rendering.** React 18's `React.lazy` caches
 * a failed download for the life of the document and re-throws the stored error
 * on every later attempt. That is exactly why the existing "Try Again" button
 * looked broken: it reset the boundary's state and the same error came straight
 * back. There is no way to evict that cache, so recovering the page means
 * loading the document again.
 *
 * Reloading while still offline would land on the browser's own error page, so
 * the reload only happens once the connection is back — by itself, which is
 * what the finding asks for. The button stays for anyone who would rather not
 * wait, and for the other cause of this error: a deploy that replaced the files
 * this tab was told to fetch.
 */
export const ChunkLoadRecovery: React.FC<ChunkLoadRecoveryProps> = ({ reload }) => {
  const isOnline = useOnlineStatus();
  // A reload replaces the document, so a second one is only ever a loop.
  const hasReloaded = useRef(false);

  const handleReload = useCallback(() => {
    if (reload) reload();
    else window.location.reload();
  }, [reload]);

  useEffect(() => {
    if (!isOnline || hasReloaded.current) return;
    hasReloaded.current = true;
    handleReload();
  }, [isOnline, handleReload]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-muted rounded-full">
            <CloudOff className="size-10 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">This page did not download</h2>
          <p className="text-muted-foreground text-sm">
            {isOnline
              ? 'The connection is back. Loading the page again…'
              : 'You are offline, so this page could not be fetched. It will open on its own as soon as the signal is back.'}
          </p>
        </div>

        <div className="flex justify-center">
          <Button onClick={handleReload} variant="default" size="sm">
            <RefreshCw className="mr-2 size-4" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
};
