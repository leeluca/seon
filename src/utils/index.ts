import type { Database } from '~/lib/powersync/AppSchema';

import short from 'short-uuid';
import { v7 as uuidv7 } from 'uuid';

export const generateUUIDs = () => {
  const translator = short();

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
  } satisfies Database['user'];
};
