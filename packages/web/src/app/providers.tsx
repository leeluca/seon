import { useEffect, type ReactNode } from 'react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { domAnimation, LazyMotion } from 'motion/react';

import { defaultLocale, dynamicallyImportLocale } from '~/locales/i18n';
import { AuthSessionChangeListener } from '~/features/auth/components/AuthSessionChangeListener';
import { WorkspaceAccountGate } from '~/features/auth/components/WorkspaceAccountGate';
import { PendingSignOutProcessor } from '~/features/auth/components/PendingSignOutProcessor';
import { ViewportHandler } from '~/shared/components/common/ViewportHandler';
import { LegacyWorkspaceRecovery } from '~/shared/components/common/LegacyWorkspaceRecovery';
import { RetiredWorkspaceCleanup } from '~/shared/components/common/RetiredWorkspaceCleanup';
import { WorkspaceChangeListener } from '~/shared/components/common/WorkspaceChangeListener';
import { Toaster } from '~/shared/components/ui/sonner';
import { TooltipProvider } from '~/shared/components/ui/tooltip';
import { OnlineStatusProvider } from '~/states/OnlineStatusProvider';
import { useUserStore } from '~/states/stores/userStore';
import { SyncProvider } from '~/states/SyncProvider';

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
        <LazyMotion features={domAnimation}>
          <TooltipProvider delay={300}>
            <Toaster
              position="top-right"
              duration={2500}
              closeButton
              className="mt-6"
            />
            <OnlineStatusProvider>
              <WorkspaceChangeListener />
              <RetiredWorkspaceCleanup />
              <AuthSessionChangeListener />
              <PendingSignOutProcessor />
              <WorkspaceAccountGate />
              <LegacyWorkspaceRecovery />
              <ViewportHandler />
              {children}
            </OnlineStatusProvider>
          </TooltipProvider>
        </LazyMotion>
      </I18nProvider>
    </SyncProvider>
  );
}
