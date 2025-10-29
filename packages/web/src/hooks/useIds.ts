import { useId } from 'react';

type SuffixMap = Record<string, string>;

export function useIds<T extends SuffixMap>(
  suffixes: T,
): {
  [K in keyof T]: string;
} {
  const uid = useId();
  const entries = Object.entries(suffixes) as [keyof T, T[keyof T]][];
  const result = entries.reduce(
    (acc, [key, value]) => {
      acc[key] = `${uid}-${value}`;
      return acc;
    },
    {} as { [K in keyof T]: string },
  );
  return result;
}
