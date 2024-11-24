import type { Messages } from '@lingui/core';

import { i18n } from '@lingui/core';
import { fromNavigator, multipleDetect } from '@lingui/detect-locale';

export const locales = {
  en: 'English',
  ko: '한국어',
};

const DEFAULT_FALLBACK = 'en';
export const defaultLocale = multipleDetect(fromNavigator(), DEFAULT_FALLBACK)
  .map((locale) => locale.split('-')[0])
  .find((locale) => locale in locales) as keyof typeof locales;

export async function dynamicallyImportLocale(locale: keyof typeof locales) {
  const { messages } = (await import(`../locales/${locale}/messages.ts`)) as {
    messages: Messages;
  };

  i18n.load(locale, messages);
  i18n.activate(locale);
}
