import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createTranslator } from 'short-uuid';
import { v7 as uuidv7 } from 'uuid';

import type { Database } from '~/data/db/AppSchema';
import { defaultLocale } from '~/locales/i18n';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateUUIDs = () => {
  const translator = createTranslator();

  const uuid = uuidv7();
  const shortUuid = translator.fromUUID(uuid);
  return { uuid, shortUuid };
};

export const generateOfflineUser = () => {
  const { uuid, shortUuid } = generateUUIDs();
  return {
    id: uuid,
    shortId: shortUuid,
    name: 'randomName',
    email: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    useSync: Number(false),
    preferences: JSON.stringify({
      language: defaultLocale,
    }),
  } satisfies Database['user'];
};
