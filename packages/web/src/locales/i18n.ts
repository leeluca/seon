import type { Messages } from '@lingui/core';

import { i18n } from '@lingui/core';
import { fromNavigator, multipleDetect } from '@lingui/detect-locale';
import { setDefaultOptions } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';

export const locales = {
  en: 'English',
  ko: '한국어',
};

const DEFAULT_FALLBACK = 'en';
export const defaultLocale = multipleDetect(fromNavigator(), DEFAULT_FALLBACK)
  .map((locale) => locale.split('-')[0])
  .find((locale) => locale in locales) as keyof typeof locales;

// FIXME: dynamically import only the necessary locales
const dateFnsLocaleMap = {
  en: enUS,
  ko,
};
setDefaultOptions({ locale: dateFnsLocaleMap[defaultLocale] });

export async function dynamicallyImportLocale(locale: keyof typeof locales) {
  const { messages } = (await import(`../locales/${locale}/messages.ts`)) as {
    messages: Messages;
  };

  i18n.load(locale, messages);
  i18n.activate(locale);
}
