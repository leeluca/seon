import type { LinguiConfig } from '@lingui/conf';

import { LOCALES } from './src/constants/locales';

const config: LinguiConfig = {
  locales: Object.keys(LOCALES),
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}/messages',
      include: ['src'],
    },
  ],
};

export default config;
