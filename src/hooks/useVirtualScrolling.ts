import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  totalItems: number;
}

interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  visibleItems: number;
  totalHeight: number;
  offsetY: number;
}

/**
 * Hook for virtual scrolling to improve performance with large lists
 * @param config - Configuration for virtual scrolling
 * @param scrollTop - Current scroll position
 * @returns Virtual scroll calculations
 */
export function useVirtualScrolling(
  config: VirtualScrollConfig,
  scrollTop: number
): VirtualScrollResult {
  const { itemHeight, containerHeight, overscan = 5, totalItems } = config;

  const result = useMemo(() => {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(totalItems - 1, startIndex + visibleItems + overscan * 2);
    const totalHeight = totalItems * itemHeight;
    const offsetY = startIndex * itemHeight;

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight,
      offsetY
    };
  }, [itemHeight, containerHeight, overscan, totalItems, scrollTop]);

  return result;
}

/**
 * Hook for managing scroll state and virtual scrolling
 * @param config - Virtual scroll configuration
 * @returns Scroll management utilities
 */
export function useScrollManager(config: VirtualScrollConfig) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);

    // Track scrolling state for optimization
    isScrollingRef.current = true;
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    if (scrollElementRef.current) {
      const scrollPosition = index * config.itemHeight;
      scrollElementRef.current.scrollTop = scrollPosition;
      setScrollTop(scrollPosition);
    }
  }, [config.itemHeight]);

  const virtualScroll = useVirtualScrolling(config, scrollTop);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    scrollTop,
    scrollElementRef,
    handleScroll,
    scrollToIndex,
    isScrolling: isScrollingRef.current,
    virtualScroll
  };
}

/**
 * Hook for row recycling to optimize memory usage
 * @param visibleRange - The range of visible items
 * @param recycleThreshold - Threshold for recycling rows
 * @returns Row recycling utilities
 */
export function useRowRecycling<T>(
  items: T[],
  visibleRange: { startIndex: number; endIndex: number },
  recycleThreshold: number = 1000
) {
  const [recycledRows, setRecycledRows] = useState<Map<number, T>>(new Map());
  const recyclePoolRef = useRef<T[]>([]);

  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1);
  }, [items, visibleRange]);

  const shouldRecycle = items.length > recycleThreshold;

  // Recycle rows that are no longer visible
  useEffect(() => {
    if (!shouldRecycle) return;

    const { startIndex, endIndex } = visibleRange;
    const newRecycledRows = new Map<number, T>();

    // Move out-of-view rows to recycle pool
    recycledRows.forEach((item, index) => {
      if (index < startIndex || index > endIndex) {
        recyclePoolRef.current.push(item);
      } else {
        newRecycledRows.set(index, item);
      }
    });

    setRecycledRows(newRecycledRows);
  }, [visibleRange, shouldRecycle, recycledRows]);

  const getRecycledRow = useCallback((index: number): T | undefined => {
    if (!shouldRecycle) return undefined;
    
    if (recycledRows.has(index)) {
      return recycledRows.get(index);
    }

    // Get from recycle pool if available
    if (recyclePoolRef.current.length > 0) {
      const recycledItem = recyclePoolRef.current.pop();
      if (recycledItem) {
        recycledRows.set(index, recycledItem);
        return recycledItem;
      }
    }

    return undefined;
  }, [shouldRecycle, recycledRows]);

  return {
    visibleItems,
    shouldRecycle,
    getRecycledRow,
    recyclePoolSize: recyclePoolRef.current.length
  };
}