import type { Updater } from '@tanstack/react-form';

import { MAX_INPUT_NUMBER } from '~/constants';

export const parseInputtedNumber = (
  value: string,
  callback:
    | ((v?: number) => void)
    | ((updater: Updater<number | undefined>) => void),
  { max = MAX_INPUT_NUMBER } = {},
) => {
  // Input being deleted
  if (!value) {
    callback(undefined);
    return;
  }
  const parsedNumber = parseInt(value.replace(/[^0-9]/g, ''), 10);
  if (parsedNumber < 0 || parsedNumber >= max) {
    return;
  }

  callback(parsedNumber);
  return parsedNumber;
};

const NON_NUMBER_VALUES = new Set(['e', 'E', '-', '+', '.', ',']);

export const blockNonNumberInput = (
  e: React.KeyboardEvent<HTMLInputElement>,
) => {
  if (NON_NUMBER_VALUES.has(e.key)) {
    e.preventDefault();
  }
};

export const maxLengthValidator = (
  value: string,
  max: number,
  fieldName: string,
) => {
  if (value.length > max) {
    return `${fieldName} should be no longer than ${max} characters.`;
  }
};
