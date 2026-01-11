import { useMemo } from 'react';

interface UseVirtualizationOptions {
  /** Number of items in the list */
  itemCount: number;
  /** Minimum number of items before virtualization kicks in (default: 50) */
  threshold?: number;
  /** Force virtualization on/off regardless of threshold */
  forceVirtualization?: boolean;
}

interface UseVirtualizationResult {
  /** Whether to use virtualization for this list */
  shouldVirtualize: boolean;
  /** Current item count */
  itemCount: number;
}

/**
 * Hook to determine whether to virtualize a list based on item count.
 *
 * Virtualization has overhead, so for small lists it's more efficient
 * to render all items. This hook provides a threshold-based decision.
 *
 * @example
 * const { shouldVirtualize } = useVirtualization({ itemCount: teams.length });
 *
 * if (shouldVirtualize) {
 *   return <VirtualizedList items={teams} ... />;
 * }
 * return <RegularList items={teams} ... />;
 */
export function useVirtualization({
  itemCount,
  threshold = 50,
  forceVirtualization,
}: UseVirtualizationOptions): UseVirtualizationResult {
  const shouldVirtualize = useMemo(() => {
    if (forceVirtualization !== undefined) {
      return forceVirtualization;
    }
    return itemCount > threshold;
  }, [itemCount, threshold, forceVirtualization]);

  return {
    shouldVirtualize,
    itemCount,
  };
}

export default useVirtualization;
