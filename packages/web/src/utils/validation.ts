import type { Updater } from '@tanstack/react-form';
import type { IPreferences } from '~/states/userContext';

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
    callback(0);
    return;
  }
  const parsedNumber = parseInt(value.replace(/[^0-9]/g, ''), 10);
  if (parsedNumber < 0 || parsedNumber >= max) {
    return;
  }

  callback(parsedNumber);
  return parsedNumber;
};

export const blockNonNumberInput = (
  e: React.KeyboardEvent<HTMLInputElement>,
) => {
  const NON_NUMBER_VALUES = new Set(['e', 'E', '-', '+', '.', ',']);
  if (NON_NUMBER_VALUES.has(e.key)) {
    e.preventDefault();
  }
};
// FIXME: internationalization
export const maxLengthValidator = (
  value: string,
  max: number,
  fieldName: string,
) => {
  if (value.length > max) {
    return `${fieldName} should be no longer than ${max} characters.`;
  }
};

// FIXME: internationalization
export const emailValidator = (value: string) => {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_REGEX.test(value)) {
    return 'Invalid email address';
  }
};

// FIXME: validate type on runtime
export const parseUserPreferences = (preferences?: string | null) => {
  try {
    if (!preferences) return undefined;
    const userPreferences = JSON.parse(preferences) as IPreferences;
    return userPreferences;
  } catch {
    console.error('Invalid user preferences');
    return undefined;
  }
};
