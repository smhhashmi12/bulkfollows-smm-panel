/**
 * Performance optimization utilities for reducing JavaScript execution time
 * and minimizing main-thread work
 */

import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Hook to defer non-critical work using requestIdleCallback
 * Helps reduce main-thread blocking (22.2s issue)
 */
export function useDeferredWork(
  work: () => void,
  dependencies: React.DependencyList = [],
  options?: { timeout?: number }
) {
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(work, {
        timeout: options?.timeout || 2000,
      });
      return () => (window as any).cancelIdleCallback(id);
    } else {
      // Fallback for browsers without requestIdleCallback
      const id = setTimeout(work, 0);
      return () => clearTimeout(id);
    }
  }, dependencies);
}

/**
 * Hook to defer data fetching with prioritization
 * Reduces JavaScript execution time
 */
export function usePrioritizedFetch<T>(
  fetchFn: () => Promise<T>,
  dependencies: React.DependencyList = [],
  priority: 'high' | 'normal' | 'low' = 'normal'
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeWithPriority = useCallback(async () => {
    const delay =
      priority === 'high' ? 0 : priority === 'normal' ? 100 : 300;

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      setLoading(true);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [fetchFn, priority]);

  useEffect(() => {
    executeWithPriority();
  }, dependencies);

  return { data, loading, error };
}

/**
 * Utility to batch DOM updates and reduce reflows
 * Addresses forced reflow issues
 */
export function batchDOMUpdates(updates: () => void) {
  if ('requestAnimationFrame' in window) {
    requestAnimationFrame(updates);
  } else {
    updates();
  }
}

/**
 * Hook to track and warn about long-running tasks (20 found)
 * Helps identify performance bottlenecks
 */
export function usePerformanceMonitoring(componentName: string) {
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = performance.now();

    return () => {
      const duration = performance.now() - startTimeRef.current;
      if (duration > 50) {
        // Warn if component takes longer than 50ms to render
        console.warn(
          `[Performance] ${componentName} render took ${duration.toFixed(
            2
          )}ms`
        );
      }
    };
  }, [componentName]);
}

/**
 * Hook to lazy-load components and images
 * Reduces initial bundle size and offscreen image loading
 */
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  onVisible: () => void
) {
  useEffect(() => {
    if (!ref.current || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onVisible();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, onVisible]);
}

/**
 * Performance mark utility for tracking custom metrics
 * Addresses user timing marks issue (11 found)
 */
export const performanceMark = {
  start: (label: string) => {
    if ('performance' in window) {
      performance.mark(`${label}-start`);
    }
  },
  end: (label: string) => {
    if ('performance' in window) {
      performance.mark(`${label}-end`);
      try {
        performance.measure(label, `${label}-start`, `${label}-end`);
      } catch (e) {
        // Silently fail if marks don't exist
      }
    }
  },
  getMetrics: () => {
    if ('performance' in window) {
      return performance.getEntriesByType('measure');
    }
    return [];
  },
};

/**
 * Lazy load third-party scripts to avoid blocking rendering
 * Addresses 3rd parties performance issue
 */
export function loadThirdPartyAsync(
  src: string,
  options?: {
    async?: boolean;
    defer?: boolean;
    attributes?: Record<string, string>;
  }
) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = options?.async ?? true;
    script.defer = options?.defer ?? false;

    if (options?.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        script.setAttribute(key, value);
      });
    }

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));

    document.head.appendChild(script);
  });
}

/**
 * Get current page performance metrics
 * Useful for monitoring and debugging
 */
export function getPerformanceMetrics() {
  if (!('performance' in window) || !('navigation' in performance)) {
    return null;
  }

  const perfData = (performance as any).timing;
  const pageLoadTime =
    perfData.loadEventEnd - perfData.navigationStart;
  const connectTime = perfData.responseEnd - perfData.requestStart;
  const renderTime = perfData.domComplete - perfData.domLoading;
  const domContentLoadedTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;

  return {
    pageLoadTime,
    connectTime,
    renderTime,
    domContentLoadedTime,
    resourceTiming: (performance as any).getEntriesByType('resource'),
  };
}
