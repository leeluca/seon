import { StrictMode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';

import './tailwind.css';

import { QueryClientProvider } from '@tanstack/react-query';

import { useFetchAuthStatus } from './apis/hooks/useFetchAuthStatus';
import ErrorFallback from './components/ErrorFallback';
import { COMPATIBILITY_MESSAGE } from './constants/errors';
import { AUTH_CONTEXT_INITIAL_STATE } from './constants/state';
import { queryClient } from './lib/queryClient';
import { defaultLocale } from './locales/i18n';
import { routeTree } from './routeTree.gen';
import { useUserStore } from './states/stores/userStore';
import { isOpfsAvailable } from './utils/storage';

const router = createRouter({
  routeTree,
  context: {
    authStatus: AUTH_CONTEXT_INITIAL_STATE,
    isUserInitialized: false,
  },
  defaultPreload: 'viewport',
  defaultErrorComponent: ({ error }) => {
    return <ErrorFallback isRoot error={error} />;
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const [isCompatible, setIsCompatible] = useState(true);

  const isUserInitialized = useUserStore((state) => state.isInitialized);
  const { data: authStatus } = useFetchAuthStatus();

  useEffect(() => {
    async function checkCompatibility() {
      const isSupported = await isOpfsAvailable();
      setIsCompatible(isSupported);

      const loadingContainer = document.querySelector('#loading-container');
      if (!loadingContainer) return;

      if (!isSupported) {
        loadingContainer.innerHTML = COMPATIBILITY_MESSAGE[defaultLocale];
      } else {
        loadingContainer.remove();
      }
    }

    checkCompatibility();
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

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('no root element');
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}
