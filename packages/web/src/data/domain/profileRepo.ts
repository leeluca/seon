import type { Database } from '~/data/db/AppSchema';
import db from '~/data/db/database';
import { requestPersistentStorage } from '~/data/db/storage';

export async function initializeLocalProfile(profile: Database['profile']) {
  await db.insertInto('profile').values(profile).executeTakeFirstOrThrow();

  void requestPersistentStorage();
}
