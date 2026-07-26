import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createTranslator } from 'short-uuid';
import { v7 as uuidv7 } from 'uuid';

import type { Database } from '~/data/db/AppSchema';
import { defaultLocale } from '~/locales/i18n';
import type { User } from '~/types/user';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateUUIDs = () => {
  const translator = createTranslator();

  const uuid = uuidv7();
  const shortUuid = translator.fromUUID(uuid);
  return { uuid, shortUuid };
};

export const profileToUser = (
  profile: Database['profile'],
  useSync = false,
): User => {
  const translator = createTranslator();
  return {
    ...profile,
    shortId: translator.fromUUID(profile.id),
    useSync: Number(useSync),
  };
};

export const generateOfflineProfile = (
  id = generateUUIDs().uuid,
): Database['profile'] => {
  const timestamp = new Date().toISOString();
  return {
    id,
    name: 'randomName',
    email: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    preferences: JSON.stringify({
      language: defaultLocale,
    }),
  };
};

export const generateOfflineUser = (id?: string): User =>
  profileToUser(generateOfflineProfile(id));
