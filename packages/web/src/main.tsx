import './lib/logging/instrument';
import '@fontsource-variable/inter/index.css';
import './tailwind.css';

import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';

import { App } from '~/app/App';
import { PwaProvider } from '~/states/PwaProvider';
import { queryClient } from './lib/queryClient';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('no root element');
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement, {
    onUncaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  });
  root.render(
    <StrictMode>
      <PwaProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </PwaProvider>
    </StrictMode>,
  );
}
