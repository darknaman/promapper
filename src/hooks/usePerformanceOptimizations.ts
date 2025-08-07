import { useCallback, useMemo, useRef, useEffect } from 'react';

// Debounce hook for input optimization
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]) as T;
};

// Throttle hook for scroll events optimization
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): T => {
  const inThrottle = useRef(false);
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    if (!inThrottle.current) {
      callbackRef.current(...args);
      inThrottle.current = true;
      setTimeout(() => (inThrottle.current = false), limit);
    }
  }, [limit]) as T;
};

// Batch state updates hook
export const useBatchedUpdates = () => {
  const updateQueue = useRef<(() => void)[]>([]);
  const isScheduled = useRef(false);

  const scheduleUpdate = useCallback(() => {
    if (!isScheduled.current) {
      isScheduled.current = true;
      requestAnimationFrame(() => {
        const updates = updateQueue.current.splice(0);
        updates.forEach(update => update());
        isScheduled.current = false;
      });
    }
  }, []);

  const batchUpdate = useCallback((update: () => void) => {
    updateQueue.current.push(update);
    scheduleUpdate();
  }, [scheduleUpdate]);

  return { batchUpdate };
};

// Memoized search filter hook
export const useMemoizedFilter = <T>(
  items: T[],
  searchQuery: string,
  searchFields: (keyof T)[],
  additionalFilters?: (item: T) => boolean
) => {
  return useMemo(() => {
    let filtered = items;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(query);
        })
      );
    }
    
    if (additionalFilters) {
      filtered = filtered.filter(additionalFilters);
    }
    
    return filtered;
  }, [items, searchQuery, searchFields, additionalFilters]);
};

// Virtual scrolling calculations hook
export const useVirtualScrolling = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  buffer: number = 5
) => {
  return useMemo(() => {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const totalVisibleItems = visibleItems + buffer * 2;
    
    return {
      visibleItems,
      totalVisibleItems,
      getVisibleRange: (scrollTop: number) => {
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
        const endIndex = Math.min(itemCount, startIndex + totalVisibleItems);
        return { startIndex, endIndex };
      }
    };
  }, [itemCount, itemHeight, containerHeight, buffer]);
};

// Optimized event handler cache
export const useEventHandlerCache = () => {
  const handlersRef = useRef(new Map<string, (...args: any[]) => void>());
  
  const getHandler = useCallback(<T extends (...args: any[]) => void>(
    key: string,
    handlerFactory: () => T
  ): T => {
    if (!handlersRef.current.has(key)) {
      handlersRef.current.set(key, handlerFactory());
    }
    return handlersRef.current.get(key) as T;
  }, []);
  
  const clearCache = useCallback(() => {
    handlersRef.current.clear();
  }, []);
  
  return { getHandler, clearCache };
};

// Memory cleanup hook
export const useMemoryCleanup = (cleanupFn: () => void, deps: any[] = []) => {
  useEffect(() => {
    return cleanupFn;
  }, deps);
};

// Intersection Observer hook for efficient visibility detection
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const observerRef = useRef<IntersectionObserver>();
  const elementsRef = useRef(new Map<Element, (entry: IntersectionObserverEntry) => void>());
  
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const callback = elementsRef.current.get(entry.target);
        callback?.(entry);
      });
    }, options);
    
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);
  
  const observe = useCallback((
    element: Element,
    callback: (entry: IntersectionObserverEntry) => void
  ) => {
    if (observerRef.current) {
      elementsRef.current.set(element, callback);
      observerRef.current.observe(element);
    }
  }, []);
  
  const unobserve = useCallback((element: Element) => {
    if (observerRef.current) {
      elementsRef.current.delete(element);
      observerRef.current.unobserve(element);
    }
  }, []);
  
  return { observe, unobserve };
};

// Request idle callback hook for non-critical operations
export const useIdleCallback = (
  callback: () => void,
  deps: any[] = [],
  timeout: number = 5000
) => {
  useEffect(() => {
    const handleIdle = (deadline: IdleDeadline) => {
      if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
        callback();
      }
    };
    
    const id = requestIdleCallback ? 
      requestIdleCallback(handleIdle, { timeout }) :
      setTimeout(callback, 0);
    
    return () => {
      if (requestIdleCallback) {
        cancelIdleCallback(id as number);
      } else {
        clearTimeout(id as NodeJS.Timeout);
      }
    };
  }, deps);
};