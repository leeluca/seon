import { useCallback, useEffect, useState } from 'react';

const DEFAULT_TIMEOUT = 400;

type timeout = ReturnType<typeof setTimeout>;
const useDelayedExecution = (
  callback: () => void,
  delay: number = DEFAULT_TIMEOUT,
) => {
  const [timeoutId, setTimeoutId] = useState<timeout | null>(null);

  const startTimeout = useCallback(() => {
    const id = setTimeout(callback, delay);
    setTimeoutId(id);
  }, [callback, delay]);

  const clearExistingTimeout = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [timeoutId]);

  useEffect(() => {
    return () => clearExistingTimeout();
  }, [clearExistingTimeout]);

  return { startTimeout, clearExistingTimeout };
};

export default useDelayedExecution;
