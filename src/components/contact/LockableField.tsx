import { CheckCircle2 } from 'lucide-react';
import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface LockableFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Verified from the signed-in profile: shown with a badge and read-only. */
  locked: boolean;
  maxLength: number;
  placeholder: string;
  error?: string;
  type?: string;
}

/**
 * A labelled text field that turns read-only, with a "Verified" badge, when the
 * value comes from the signed-in profile rather than being typed.
 *
 * Lifted out of the home page's message panel when the two forms became one
 * (UX audit H-02), so a signed-in member is still recognised on the form that
 * survived.
 */
export const LockableField: React.FC<LockableFieldProps> = ({
  id,
  label,
  value,
  onChange,
  locked,
  maxLength,
  placeholder,
  error,
  type,
}) => (
  <div>
    <Label htmlFor={id} className="flex items-center gap-1.5">
      {label}
      {locked && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3" /> Verified
        </span>
      )}
    </Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={locked}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={cn('mt-1', locked && 'bg-muted/50')}
    />
    {error && (
      <p id={`${id}-error`} className="mt-1 text-sm text-destructive">
        {error}
      </p>
    )}
  </div>
);
