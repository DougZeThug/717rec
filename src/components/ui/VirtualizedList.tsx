import React, { CSSProperties, ReactElement, useMemo } from 'react';
import { List, RowComponentProps } from 'react-window';

import { cn } from '@/lib/utils';

interface VirtualizedListProps<T> {
  items: T[];
  rowHeight: number;
  height: number | string;
  renderRow: (item: T, index: number, style: CSSProperties) => ReactElement;
  overscanCount?: number;
  className?: string;
}

// Props passed via rowProps (excluding forbidden keys)
interface CustomRowProps<T> {
  items: T[];
  renderRow: (item: T, index: number, style: CSSProperties) => ReactElement;
}

// Full props received by row component (includes index, style, ariaAttributes from react-window)
type FullRowProps<T> = RowComponentProps<CustomRowProps<T>>;

function RowComponent<T>(props: FullRowProps<T>): ReactElement {
  const { index, style, items, renderRow } = props;
  const item = items[index];
  return renderRow(item, index, style);
}

/**
 * VirtualizedList - A wrapper around react-window's List component
 *
 * Only renders visible items to improve performance for large lists.
 * Use for lists with 50+ items for meaningful performance gains.
 *
 * @example
 * <VirtualizedList
 *   items={teams}
 *   rowHeight={48}
 *   height={400}
 *   renderRow={(team, index, style) => (
 *     <div key={team.id} style={style}>
 *       {team.name}
 *     </div>
 *   )}
 * />
 */
export function VirtualizedList<T>({
  items,
  rowHeight,
  height,
  renderRow,
  overscanCount = 5,
  className,
}: VirtualizedListProps<T>): ReactElement {
  // Memoize rowProps to prevent unnecessary re-renders
  const rowProps = useMemo(
    () => ({
      items,
      renderRow,
    }),
    [items, renderRow]
  );

  // Create a typed row component to satisfy List requirements
  const TypedRowComponent = RowComponent as (props: FullRowProps<T>) => ReactElement;

  return (
    <List<CustomRowProps<T>>
      rowComponent={TypedRowComponent}
      rowCount={items.length}
      rowHeight={rowHeight}
      rowProps={rowProps}
      overscanCount={overscanCount}
      className={cn('scrollbar-thin', className)}
      style={{ height }}
    />
  );
}

export default VirtualizedList;
