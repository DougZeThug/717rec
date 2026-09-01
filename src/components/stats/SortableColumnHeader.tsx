import { ArrowDown, ArrowUp, ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

import type { SortDirection } from './types';

interface SortableColumnHeaderProps<F extends string> {
  /** The column this heading sorts by. */
  field: F;
  /** The column the table is currently sorted by. */
  activeField: string;
  direction: SortDirection;
  onSort: (field: F) => void;
  children: React.ReactNode;
  /** Classes for the cell itself (width, visibility, theme colours). */
  className?: string;
  /** Classes for the control inside it. */
  buttonClassName?: string;
  align?: 'left' | 'center';
  /** Which arrow marks the active column. Chevrons on the standings table, arrows on the career table. */
  icon?: 'chevron' | 'arrow';
}

/**
 * A sortable column heading.
 *
 * The control is a real `<Button>` inside the `<th>`, not a click handler on
 * the `<th>` itself, so the column can be sorted with Tab + Enter/Space and is
 * reachable by anything that navigates by interactive element. The `<th>` keeps
 * `scope` and `aria-sort` so the sort state is still announced.
 *
 * Both rankings tables used bare clickable `<th>` elements and could not be
 * sorted from a keyboard at all — see B-34 in
 * `docs/product-description/bug-triage.md`. The shape here follows `SortButton`
 * in `HeadToHeadRecords.tsx`, which already did it this way.
 */
export function SortableColumnHeader<F extends string>({
  field,
  activeField,
  direction,
  onSort,
  children,
  className,
  buttonClassName,
  align = 'center',
  icon = 'chevron',
}: SortableColumnHeaderProps<F>) {
  const isActive = activeField === field;
  const ariaSort = isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';

  const Up = icon === 'chevron' ? ChevronUp : ArrowUp;
  const Down = icon === 'chevron' ? ChevronDown : ArrowDown;

  return (
    <TableHead className={cn('font-medium', className)} aria-sort={ariaSort} scope="col">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort(field)}
        className={cn(
          'h-auto p-1 font-medium hover:bg-muted/50',
          align === 'center' ? 'mx-auto justify-center' : 'justify-start',
          'text-inherit hover:text-inherit',
          buttonClassName
        )}
      >
        {children}
        {isActive &&
          (direction === 'asc' ? (
            <Up className="ml-1 inline size-4" />
          ) : (
            <Down className="ml-1 inline size-4" />
          ))}
      </Button>
    </TableHead>
  );
}
