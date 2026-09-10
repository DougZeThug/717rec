import { CloudOff, RefreshCw } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { warnLog } from '@/utils/logger';

const RELOAD_MARKER = 'chunkReloadAt';

/**
 * How soon a second failure counts as a loop rather than a new problem.
 *
 * A reload that does not fix anything comes straight back, well inside this.
 * A genuine second incident — the signal dropping again later in the same
 * visit — is minutes away and gets its own automatic attempt.
 */
const LOOP_WINDOW_MS = 30_000;

/** Whether this document is here because a reload we asked for did not work. */
const reloadedRecently = (): boolean => {
  try {
    const at = Number(sessionStorage.getItem(RELOAD_MARKER));
    return Number.isFinite(at) && at > 0 && Date.now() - at < LOOP_WINDOW_MS;
  } catch (error) {
    // A browser that refuses storage cannot loop-check; better to not reload.
    warnLog('Could not read the page-reload marker:', error);
    return true;
  }
};

const markReloaded = (): void => {
  try {
    sessionStorage.setItem(RELOAD_MARKER, String(Date.now()));
  } catch (error) {
    warnLog('Could not record the page reload:', error);
  }
};

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
 *
 * The reload is called straight out of this component rather than through a
 * prop, so nothing is handed back to a parent and no extra render is spent on
 * it. Tests stand in for it by stubbing `window.location`.
 *
 * **The reload is allowed once, and the record of it outlives the document.**
 * A ref cannot hold that: a reload builds a new component with a fresh ref, so
 * a file that is genuinely gone — a deploy that removed it, a CDN that keeps
 * failing — would reload, fail, reload, forever. The marker lives in session
 * storage instead, and after that one attempt the reader gets the panel and
 * the button rather than another silent reload.
 */
export const ChunkLoadRecovery: React.FC = () => {
  const isOnline = useOnlineStatus();
  // Read once: this must not change under the effect between renders.
  const [alreadyTried] = useState(reloadedRecently);
  const hasReloaded = useRef(false);
  const canRetryItself = !alreadyTried;

  useEffect(() => {
    if (!isOnline || alreadyTried || hasReloaded.current) return;
    hasReloaded.current = true;
    markReloaded();
    window.location.reload();
  }, [isOnline, alreadyTried]);

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
            {!isOnline
              ? 'You are offline, so this page could not be fetched. It will open on its own as soon as the signal is back.'
              : canRetryItself
                ? 'The connection is back. Loading the page again…'
                : 'Loading the page again did not help. The site may have been updated a moment ago — try again, or come back shortly.'}
          </p>
        </div>

        <div className="flex justify-center">
          <Button onClick={() => window.location.reload()} variant="default" size="sm">
            <RefreshCw className="mr-2 size-4" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
};
