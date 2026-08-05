import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { PwaContext } from './pwa';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function PwaProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, nextRegistration) {
      setRegistration(nextRegistration);
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
      Sentry.captureException(error, {
        tags: { update_error: 'register_service_worker' },
      });
    },
  });

  useEffect(() => {
    if (!registration) return;

    let isChecking = false;
    let lastCheckedAt = Date.now();

    const checkForUpdate = async (force = false) => {
      if (!navigator.onLine || registration.installing || isChecking) return;

      const now = Date.now();
      if (!force && now - lastCheckedAt < UPDATE_CHECK_INTERVAL_MS) return;

      lastCheckedAt = now;
      isChecking = true;
      try {
        await registration.update();
      } catch (error) {
        Sentry.captureException(error, {
          tags: { update_error: 'check_service_worker_update' },
        });
      } finally {
        isChecking = false;
      }
    };

    const handleOnline = () => void checkForUpdate(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    };
    const intervalId = window.setInterval(
      () => void checkForUpdate(),
      UPDATE_CHECK_INTERVAL_MS,
    );

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [registration]);

  const value = useMemo(
    () => ({ needRefresh, updateServiceWorker }),
    [needRefresh, updateServiceWorker],
  );

  return <PwaContext value={value}>{children}</PwaContext>;
}
