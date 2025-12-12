import { useEffect, type ReactNode } from 'react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';

import { defaultLocale, dynamicallyImportLocale } from '~/locales/i18n';
import { ViewportHandler } from '~/shared/components/common/ViewportHandler';
import { Toaster } from '~/shared/components/ui/sonner';
import { TooltipProvider } from '~/shared/components/ui/tooltip';
import OnlineStatusProvider from '~/states/isOnlineContext';
import { useUserStore } from '~/states/stores/userStore';
import SyncProvider from '~/states/syncContext';

export function AppProviders({ children }: { children: ReactNode }) {
  const languagePreference = useUserStore(
    (state) => state.userPreferences?.language,
  );

  useEffect(() => {
    const locale = languagePreference ?? defaultLocale;
    void dynamicallyImportLocale(locale);
    document.documentElement.lang = locale;
  }, [languagePreference]);

  return (
    <SyncProvider>
      <I18nProvider i18n={i18n}>
        <TooltipProvider delayDuration={300}>
          <Toaster
            position="top-right"
            duration={2500}
            closeButton
            className="mt-6"
          />
          <OnlineStatusProvider>
            <ViewportHandler />
            {children}
          </OnlineStatusProvider>
        </TooltipProvider>
      </I18nProvider>
    </SyncProvider>
  );
}
