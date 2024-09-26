import short from 'short-uuid';
import { v7 as uuidv7 } from 'uuid';

export const generateUUIDs = () => {
  const translator = short();

  const uuid = uuidv7();
  const shortUuid = translator.fromUUID(uuid);
  return { uuid, shortUuid };
};
