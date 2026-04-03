import { useEffect, useRef, useState } from 'react';

/**
 * Configuration options for the useThrottle hook
 */
export interface UseThrottleOptions {
  /**
   * The delay in milliseconds for throttling
   * @default 500
   */
  delay?: number;
  /**
   * Whether to call the throttled update on the leading edge
   * @default false
   */
  leading?: boolean;
  /**
   * Whether to call the throttled update on the trailing edge
   * @default true
   */
  trailing?: boolean;
}

/**
 * Custom hook that throttles a value, limiting how often it can be updated
 *
 * @template T The type of the value to throttle
 * @param value The value to throttle
 * @param options Configuration options for throttling behavior
 * @returns The throttled value
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const throttledSearchTerm = useThrottle(searchTerm, { delay: 300 });
 *
 * useEffect(() => {
 *   // This will only run at most once every 300ms
 *   performSearch(throttledSearchTerm);
 * }, [throttledSearchTerm]);
 * ```
 */
export function useThrottle<T>(value: T, options: UseThrottleOptions = {}): T {
  const { delay = 500, leading = false, trailing = true } = options;

  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecutedRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValueRef = useRef<T>(value);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutedRef.current;

    // Store the latest value
    lastValueRef.current = value;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // If this is the first call or leading edge is enabled and enough time has passed
    if (
      leading &&
      (lastExecutedRef.current === 0 || timeSinceLastExecution >= delay)
    ) {
      setThrottledValue(value);
      lastExecutedRef.current = now;
      return;
    }

    // If trailing edge is enabled, set up a timeout
    if (trailing) {
      const remainingTime = delay - timeSinceLastExecution;
      const timeoutDelay = remainingTime > 0 ? remainingTime : delay;

      timeoutRef.current = setTimeout(() => {
        setThrottledValue(lastValueRef.current);
        lastExecutedRef.current = Date.now();
        timeoutRef.current = null;
      }, timeoutDelay);
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, delay, leading, trailing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledValue;
}
