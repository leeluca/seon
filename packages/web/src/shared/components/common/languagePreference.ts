import type { LOCALES } from '~/constants/locales';
import db from '~/data/db/database';
import { useUserStore } from '~/states/stores/userStore';

interface UpdateProfileLanguageArgs {
  profileId: string;
  updatedLanguage: keyof typeof LOCALES;
}

export async function updateProfileLanguage({
  profileId,
  updatedLanguage,
}: UpdateProfileLanguageArgs) {
  const updatedPreferences = JSON.stringify({
    ...useUserStore.getState().userPreferences,
    language: updatedLanguage,
  });

  await db
    .updateTable('profile')
    .set({
      preferences: updatedPreferences,
    })
    .where('id', '=', profileId)
    .execute();

  useUserStore.getState().setPreferences(updatedPreferences);
}
