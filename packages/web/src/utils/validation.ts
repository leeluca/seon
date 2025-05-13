import { t } from '@lingui/core/macro';
import type { Updater } from '@tanstack/react-form';

import { MAX_INPUT_NUMBER } from '~/constants';
import type { Preferences } from '~/types/user';

export const parseInputtedNumber = (
  value: string,
  callback:
    | ((v?: number) => void)
    | ((updater: Updater<number | undefined>) => void),
  { max = MAX_INPUT_NUMBER } = {},
) => {
  // Input value being deleted
  if (!value) {
    callback(0);
    return;
  }
  const parsedNumber = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
  if (parsedNumber < 0 || parsedNumber >= max) {
    return;
  }

  callback(parsedNumber);
  return parsedNumber;
};

export const blockNonNumberInput = (
  e: React.KeyboardEvent<HTMLInputElement>,
) => {
  const NUMBER_VALUES = new Set([
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
  ]);
  const ALLOWED_KEYS = new Set([
    'Backspace',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Tab',
    'Delete',
    'Enter',
    'Escape',
    'Home',
    'End',
  ]);

  const isCommand = e.metaKey || e.ctrlKey;

  if (!ALLOWED_KEYS.has(e.key) && !NUMBER_VALUES.has(e.key) && !isCommand) {
    e.preventDefault();
  }
};

export const maxLengthValidator = (
  value: string,
  max: number,
  fieldName: string,
) => {
  if (value.length > max) {
    return t`${fieldName} should be no longer than ${max} characters.`;
  }
};

export const emailValidator = (value: string) => {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_REGEX.test(value)) {
    return t`Invalid email address`;
  }
};

// FIXME: validate type on runtime
export const parseUserPreferences = (preferences?: string | null) => {
  try {
    if (!preferences) return {};
    const userPreferences = JSON.parse(preferences) as Preferences;
    return userPreferences;
  } catch {
    console.error('Invalid user preferences');
    return {};
  }
};
