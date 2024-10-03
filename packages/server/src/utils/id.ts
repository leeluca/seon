import short from 'short-uuid';
import {
  v7 as uuidv7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';

export const generateUUIDs = () => {
  const translator = short();

  const uuid = uuidv7();
  const shortUuid = translator.fromUUID(uuid);
  return { uuid, shortUuid };
};

export function validateUuidV7(uuid: string) {
  return uuidValidate(uuid) && uuidVersion(uuid) === 7;
}
