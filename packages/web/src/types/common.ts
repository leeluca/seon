export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonType<T> = {
  [K in keyof T]: T[K] extends JsonValue ? T[K] : string;
};
