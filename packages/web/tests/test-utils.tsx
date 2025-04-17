import type React from 'react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, type RenderOptions } from '@testing-library/react';

import { messages as enMessages } from '~/locales/en/messages';
import { messages as koMessages } from '~/locales/ko/messages';

const ContextProviders = ({ children }: { children: React.ReactNode }) => {
  i18n.load({
    en: enMessages,
    ko: koMessages,
  });
  i18n.activate('en');

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
};

const customRender = (ui: React.ReactNode, options?: RenderOptions) =>
  render(ui, { wrapper: ContextProviders, ...options });

export * from '@testing-library/react';

export { customRender };
