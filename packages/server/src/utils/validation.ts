import type { StaticDecode, TSchema } from '@sinclair/typebox';
import { Errors } from '@sinclair/typebox/errors';
import { Check, TransformDecode } from '@sinclair/typebox/value';

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function parseType<T extends TSchema, D = StaticDecode<T>>(
  schema: T,
  value: unknown,
): D {
  if (!Check(schema, value))
    throw new Error('Invalid value', { cause: Errors(schema, value).First() });
  return TransformDecode(schema, [], value) as D;
}
