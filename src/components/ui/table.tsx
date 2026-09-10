import * as React from 'react';

import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    const { isWinterTheme } = useSeasonalThemeBase();

    return (
      <div
        className={cn(
          'relative w-full overflow-auto rounded-xl',
          isWinterTheme && 'winter-card-surface'
        )}
      >
        <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
      </div>
    );
  }
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  const { isWinterTheme } = useSeasonalThemeBase();

  return (
    <thead
      ref={ref}
      className={cn(
        '[&_tr]:border-b font-semibold',
        isWinterTheme
          ? 'border-frost-border/30 text-card-foreground'
          : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100',
        className
      )}
      {...props}
    />
  );
});
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  const { isWinterTheme } = useSeasonalThemeBase();

  return (
    <tbody
      ref={ref}
      className={cn(
        '[&_tr:last-child]:border-0',
        isWinterTheme ? 'text-card-foreground' : 'text-gray-800 dark:text-gray-100',
        className
      )}
      {...props}
    />
  );
});
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => {
    const { isWinterTheme } = useSeasonalThemeBase();

    return (
      <tr
        ref={ref}
        className={cn(
          'border-b transition-colors',
          isWinterTheme
            ? 'border-frost-border/20 even:bg-white/5 hover:bg-white/10'
            : 'border-gray-200 dark:border-gray-700 even:bg-gray-50 dark:even:bg-white/5 hover:bg-muted/50',
          'data-[state=selected]:bg-muted',
          className
        )}
        {...props}
      />
    );
  }
);
TableRow.displayName = 'TableRow';

/**
 * A column heading.
 *
 * `scope` defaults to `'col'` because every `TableHead` in the app is a column
 * heading, and without it a screen reader reads a row of numbers with nothing
 * naming the columns. Callers can still pass `scope="row"` and win — it is
 * destructured out of `props`, not overwritten by the spread.
 *
 * See L3 in `docs/audits/UX-AUDIT-2026-09.md`.
 */
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, scope = 'col', ...props }, ref) => (
  <th
    ref={ref}
    scope={scope}
    className={cn(
      'h-12 px-4 text-left align-middle font-medium text-gray-700 dark:text-gray-200',
      className
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  const { isWinterTheme } = useSeasonalThemeBase();

  return (
    <td
      ref={ref}
      className={cn(
        'p-4 align-middle [&:has([role=checkbox])]:pr-0',
        isWinterTheme ? 'text-card-foreground' : 'text-gray-800 dark:text-gray-100',
        className
      )}
      {...props}
    />
  );
});
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
));
TableCaption.displayName = 'TableCaption';

export { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow };
