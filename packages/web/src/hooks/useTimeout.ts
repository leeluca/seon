import { useEffect, useState } from 'react';

interface UseTimeoutOptions {
  /**
   * The timeout duration in milliseconds
   */
  delay: number;
  /**
   * Whether the timeout should be active
   */
  enabled: boolean;
  /**
   * Optional callback to execute when timeout occurs
   */
  onTimeout?: () => void;
}

/**
 * A hook that conditionally tracks whether a timeout has occurred
 */
export function useTimeout({
  delay,
  enabled,
  onTimeout,
}: UseTimeoutOptions): boolean {
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHasTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setHasTimedOut(true);
      onTimeout?.();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [enabled, delay, onTimeout]);

  return hasTimedOut;
}
