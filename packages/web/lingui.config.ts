import { defineConfig } from '@lingui/cli';
import type { LinguiConfig } from '@lingui/conf';

import { LOCALES } from './src/constants/locales';

const config: LinguiConfig = defineConfig({
  sourceLocale: 'en',
  locales: Object.keys(LOCALES),
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}/messages',
      include: ['src'],
    },
  ],
});

export default config;
