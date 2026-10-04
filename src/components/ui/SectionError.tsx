import { AlertCircle, RefreshCw } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getUIErrorMessage } from '@/utils/errorHandler';

interface SectionErrorProps {
  /** What did not load, as a noun: "Team of the Week", "Weekly recap". */
  title: string;
  /** The thrown value. Reduced to a safe sentence before it is shown. */
  error?: unknown;
  onRetry: () => void;
  className?: string;
}

/**
 * A compact "this part did not load, try again" card for one section of a page.
 *
 * Home is built from independent sections that each fetch for themselves. When
 * one failed, it simply vanished: the page looked complete, and the visitor had
 * no way to tell a quiet week from a dropped connection. This puts a small,
 * honest card where the section would have been, with a retry that affects only
 * that section. Use `ErrorDisplay` when the whole page failed.
 */
export const SectionError: React.FC<SectionErrorProps> = ({ title, error, onRetry, className }) => (
  <div
    role="alert"
    className={cn(
      'flex flex-col gap-3 rounded-card border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between',
      className
    )}
  >
    <div className="flex items-start gap-3">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive-text" aria-hidden="true" />
      <div>
        <p className="font-medium">{title} could not load</p>
        <p className="text-sm text-muted-foreground">{getUIErrorMessage(error)}</p>
      </div>
    </div>
    <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 gap-2">
      <RefreshCw className="size-4" aria-hidden="true" />
      Try again
    </Button>
  </div>
);
