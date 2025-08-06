import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  updateTime: number;
  memoryUsage?: number;
  fps?: number;
}

interface PerformanceMonitorConfig {
  enableFpsMonitoring?: boolean;
  enableMemoryMonitoring?: boolean;
  sampleInterval?: number;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

/**
 * Hook for monitoring component performance
 * @param componentName - Name of the component for identification
 * @param config - Performance monitoring configuration
 * @returns Performance monitoring utilities
 */
export function usePerformanceMonitor(
  componentName: string,
  config: PerformanceMonitorConfig = {}
) {
  const {
    enableFpsMonitoring = false,
    enableMemoryMonitoring = false,
    sampleInterval = 1000,
    onMetricsUpdate
  } = config;

  const renderStartTime = useRef<number>(0);
  const lastRenderTime = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const lastFpsTime = useRef<number>(0);
  const fpsIntervalRef = useRef<NodeJS.Timeout>();
  const memoryIntervalRef = useRef<NodeJS.Timeout>();

  // Mark render start
  const startRender = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  // Mark render end and calculate metrics
  const endRender = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    lastRenderTime.current = renderTime;

    if (renderTime > 16) { // Warn about slow renders (> 16ms for 60fps)
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }, [componentName]);

  // Measure update performance
  const measureUpdate = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    operationName?: string
  ): T => {
    return ((...args: Parameters<T>) => {
      const start = performance.now();
      const result = fn(...args);
      const duration = performance.now() - start;

      if (duration > 10) { // Warn about slow updates
        console.warn(`Slow update in ${componentName}${operationName ? ` (${operationName})` : ''}: ${duration.toFixed(2)}ms`);
      }

      return result;
    }) as T;
  }, [componentName]);

  // FPS monitoring
  useEffect(() => {
    if (!enableFpsMonitoring) return;

    const updateFps = () => {
      frameCount.current++;
      
      if (fpsIntervalRef.current) {
        clearTimeout(fpsIntervalRef.current);
      }

      fpsIntervalRef.current = setTimeout(() => {
        const now = performance.now();
        const elapsed = now - lastFpsTime.current;
        const fps = (frameCount.current * 1000) / elapsed;
        
        onMetricsUpdate?.({
          renderTime: lastRenderTime.current,
          updateTime: 0,
          fps
        });

        frameCount.current = 0;
        lastFpsTime.current = now;
      }, sampleInterval);
    };

    // Monitor animation frames for FPS calculation
    let animationId: number;
    const animate = () => {
      updateFps();
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (fpsIntervalRef.current) {
        clearTimeout(fpsIntervalRef.current);
      }
    };
  }, [enableFpsMonitoring, sampleInterval, onMetricsUpdate]);

  // Memory monitoring
  useEffect(() => {
    if (!enableMemoryMonitoring || !('memory' in performance)) return;

    memoryIntervalRef.current = setInterval(() => {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB

      if (memoryUsage > 100) { // Warn about high memory usage
        console.warn(`High memory usage in ${componentName}: ${memoryUsage.toFixed(2)}MB`);
      }

      onMetricsUpdate?.({
        renderTime: lastRenderTime.current,
        updateTime: 0,
        memoryUsage
      });
    }, sampleInterval);

    return () => {
      if (memoryIntervalRef.current) {
        clearInterval(memoryIntervalRef.current);
      }
    };
  }, [enableMemoryMonitoring, sampleInterval, componentName, onMetricsUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fpsIntervalRef.current) {
        clearTimeout(fpsIntervalRef.current);
      }
      if (memoryIntervalRef.current) {
        clearInterval(memoryIntervalRef.current);
      }
    };
  }, []);

  return {
    startRender,
    endRender,
    measureUpdate,
    lastRenderTime: lastRenderTime.current
  };
}

/**
 * Hook for measuring async operation performance
 * @param operationName - Name of the operation
 * @returns Async performance measurement utilities
 */
export function useAsyncPerformance(operationName: string) {
  const measureAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    warningThreshold: number = 1000
  ): Promise<T> => {
    const start = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      if (duration > warningThreshold) {
        console.warn(`Slow async operation "${operationName}": ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`Failed async operation "${operationName}" after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }, [operationName]);

  return { measureAsync };
}