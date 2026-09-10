import type { ReactElement, ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

/**
 * Where a column goes once the table becomes a stack of cards.
 *
 * - `title`   the first line of the card, with no label — the team or person name
 * - `meta`    a "Heading: value" line in the card body (the default)
 * - `block`   the heading on its own line, then the value at full width below —
 *             for content too wide to sit beside a label, such as a badge list
 * - `actions` pinned to the bottom of the card, with no label
 * - `hidden`  not shown on a phone at all
 */
type ResponsiveTableCardSlot = 'title' | 'meta' | 'block' | 'actions' | 'hidden';

export interface ResponsiveTableColumn<T> {
  /** Stable id for this column. */
  id: string;
  /**
   * The heading text. The *same string* labels the value in card mode, which is
   * the point: a heading and its card label can never drift apart.
   */
  header: string;
  /** A richer heading (an icon beside the text). `header` stays the plain name. */
  headerNode?: ReactNode;
  cell: (row: T) => ReactNode;
  /** Where this column goes in card mode. Defaults to `'meta'`. */
  card?: ResponsiveTableCardSlot;
  align?: 'left' | 'center' | 'right';
  /** Classes for the table cell. Widths and `tabular-nums` belong here. */
  className?: string;
}

export interface ResponsiveTableProps<T> {
  columns: ResponsiveTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /**
   * Names the table for a screen reader. Renders as a visually hidden
   * `<caption>` in table mode and as the list's label in card mode.
   */
  caption: string;
  /**
   * Shown instead of the table when there are no rows. An element rather than
   * a node, so it can be returned as-is without a Fragment around it.
   */
  empty?: ReactElement;
  /**
   * Classes for whichever element is rendered — the `<table>` or the card list.
   * Because it applies to both, a fixed width (`min-w-[700px]`) does not belong
   * here: it would force a phone to scroll sideways, which is what card mode
   * exists to prevent. Put per-column widths on `column.className` instead.
   */
  className?: string;
  /**
   * Forces a rendering instead of measuring the viewport. `'auto'` is what the
   * app uses; the other two exist so a test can assert one rendering without
   * mocking `useIsMobile`.
   */
  mode?: 'auto' | 'table' | 'cards';
}

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

/**
 * A table that becomes a stack of cards below `md` (768px).
 *
 * Before this existed the app had four different answers to "what does this
 * table do on a phone", and one of them was "nothing — scroll sideways".
 *
 * Two decisions worth knowing about:
 *
 * **It switches in JavaScript, not CSS.** The tempting alternative is one DOM
 * with `::before` data-labels, but stacking cells needs `display:block` on
 * `table`/`tr`/`td`, and that strips the table role in Chrome and Safari — the
 * `scope` on every heading would stop meaning anything on phones, which is
 * where most members read this app. Rendering one tree also keeps
 * `useIsMobile()` as the single place the breakpoint lives; it is 768px, which
 * is exactly Tailwind's `md`.
 *
 * **Columns are data, not JSX.** A compound API would write each heading twice
 * — once in the header row and once as a label on every cell. One `columns`
 * array makes the heading and its card label physically the same string.
 *
 * Not every table fits. Rows that share inline-edit state across their cells
 * (`admin/divisions`) and tables with two header rows or a nested detail table
 * (`admin/power-migration`) keep their own layouts — see
 * `src/docs/TABLE_PATTERNS.md`.
 */
export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
  className,
  mode = 'auto',
}: ResponsiveTableProps<T>) {
  const isMobileViewport = useIsMobile();
  const asCards = mode === 'auto' ? isMobileViewport : mode === 'cards';

  if (rows.length === 0 && empty !== undefined) {
    return empty;
  }

  if (asCards) {
    const titleColumn = columns.find((column) => column.card === 'title');
    const bodyColumns = columns.filter((column) => {
      const slot = column.card ?? 'meta';
      return slot === 'meta' || slot === 'block';
    });
    const actionColumns = columns.filter((column) => column.card === 'actions');

    return (
      <ul aria-label={caption} className={cn('space-y-3', className)}>
        {rows.map((row) => (
          <li key={rowKey(row)}>
            <Card className="p-4 space-y-2">
              {titleColumn && <div className="font-medium">{titleColumn.cell(row)}</div>}
              {bodyColumns.map((column) =>
                column.card === 'block' ? (
                  <div key={column.id} className="space-y-1 text-sm">
                    <span className="text-muted-foreground">{column.header}</span>
                    <div>{column.cell(row)}</div>
                  </div>
                ) : (
                  <div
                    key={column.id}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-muted-foreground shrink-0">{column.header}</span>
                    <span className="text-right">{column.cell(row)}</span>
                  </div>
                )
              )}
              {actionColumns.map((column) => (
                <div key={column.id}>{column.cell(row)}</div>
              ))}
            </Card>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Table className={className}>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.id}
              className={cn(column.align && alignClass[column.align], column.className)}
            >
              {column.headerNode ?? column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={rowKey(row)}>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                className={cn(column.align && alignClass[column.align], column.className)}
              >
                {column.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
