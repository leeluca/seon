import { createFormHook } from '@tanstack/react-form';
import { toast } from 'sonner';

import {
  DateField,
  ErrorInfo,
  NumberField,
  TextField,
} from '~/components/form/Fields';
import { handleSubmit as submitEntry } from '~/services/entry';
import { fieldContext, formContext } from '~/states/formContext';

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    NumberField,
    DateField,
    ErrorInfo,
  },
  formComponents: {},
});

export function useEntryForm(options: {
  goalId: string;
  userId: string;
  date: Date;
  value?: number;
  previousValue?: number;
  onSubmitCallback: () => void;
  t: (msg: TemplateStringsArray | string) => string;
}) {
  const {
    goalId,
    userId,
    date,
    value,
    previousValue = 0,
    onSubmitCallback,
    t,
  } = options;

  const form = useAppForm({
    defaultValues: {
      date,
      value: value ?? previousValue,
    },
    validators: {
      onChange({ value }) {
        const { value: inputtedValue } = value;
        if (inputtedValue === undefined) {
          return 'Missing required fields';
        }
      },
    },
    onSubmit: async ({ value }) => {
      const { value: inputtedValue, date } = value;
      if (inputtedValue === undefined) {
        return;
      }
      await submitEntry(
        {
          value: inputtedValue,
          date,
          goalId,
          userId,
        },
        {
          callback: onSubmitCallback,
          onError: () => {
            toast.error(t`Failed to add entry`);
          },
        },
      );
    },
  });

  return form;
}
