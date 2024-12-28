import type { Messages } from '@lingui/core';

import { i18n } from '@lingui/core';
import { fromNavigator, multipleDetect } from '@lingui/detect-locale';
import { setDefaultOptions } from 'date-fns';

import { LOCALES } from '~/constants/locales';

const DEFAULT_FALLBACK = 'en';
export const defaultLocale = multipleDetect(fromNavigator(), DEFAULT_FALLBACK)
  .map((locale) => locale.split('-')[0])
  .find((locale) => locale in LOCALES) as keyof typeof LOCALES;

export async function dynamicallyImportLocale(locale: keyof typeof LOCALES) {
  const dateFnslocaleMap = {
    en: async () => (await import('date-fns/locale/en-US')).enUS,
    ko: async () => (await import('date-fns/locale/ko')).ko,
  };

  const [importedMessages, dfnsLocale] = await Promise.all([
    import(`../locales/${locale}/messages.ts`) as Promise<{
      messages: Messages;
    }>,
    dateFnslocaleMap[locale](),
  ]);

  i18n.load(locale, importedMessages.messages);
  i18n.activate(locale);
  setDefaultOptions({ locale: dfnsLocale });
}
