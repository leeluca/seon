import type { LOCALES } from '~/constants/locales';
import type { Database } from '~/lib/powersync/AppSchema';

export interface Preferences {
  language?: keyof typeof LOCALES;
}

export type User = Database['user'];
