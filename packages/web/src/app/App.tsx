import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react';
import { createRouter, RouterProvider } from '@tanstack/react-router';

import { isLocalDbAvailable } from '~/data/db/storage';
import ErrorFallback from '~/shared/components/common/ErrorFallback';
import NotFound from '~/shared/components/common/NotFound';
import { COMPATIBILITY_MESSAGE } from '~/constants/errors';
import { AUTH_CONTEXT_INITIAL_STATE } from '~/constants/state';
import { useFetchAuthStatus } from '~/features/auth/hooks/useFetchAuthStatus';
import { defaultLocale } from '~/locales/i18n';
import { routeTree } from '~/routeTree.gen';
import { useUserStore } from '~/states/stores/userStore';
import { AppProviders } from './providers';

const router = createRouter({
  routeTree,
  context: {
    authStatus: AUTH_CONTEXT_INITIAL_STATE,
    isUserInitialized: false,
  },
  defaultPreload: 'viewport',
  defaultErrorComponent: ({ error }) => {
    return <ErrorFallback error={error} />;
  },
  defaultNotFoundComponent: () => {
    return <NotFound className="min-h-dvh" />;
  },
  defaultOnCatch(error, errorInfo) {
    Sentry.captureReactException(error, errorInfo);
  },
  Wrap: ({ children }) => <AppProviders>{children}</AppProviders>,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  const [isCompatible, setIsCompatible] = useState(true);

  const isUserInitialized = useUserStore((state) => state.isInitialized);
  const { data: authStatus } = useFetchAuthStatus();

  useEffect(() => {
    async function checkCompatibility() {
      const isSupported = await isLocalDbAvailable();
      setIsCompatible(isSupported);

      const loadingContainer = document.querySelector('#loading-container');
      if (!loadingContainer) return;

      if (!isSupported) {
        loadingContainer.innerHTML = COMPATIBILITY_MESSAGE[defaultLocale];
      } else {
        loadingContainer.remove();
      }
    }

    void checkCompatibility();
  }, []);

  if (!isCompatible) {
    return null;
  }

  return (
    <RouterProvider
      router={router}
      context={{ authStatus, isUserInitialized }}
    />
  );
}
