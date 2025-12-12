import { t } from '@lingui/core/macro';
import { createFormHook } from '@tanstack/react-form';
import { toast } from 'sonner';

import { recordEntry } from '~/data/domain/entryRepo';
import {
  DateField,
  ErrorInfo,
  NumberField,
  TextField,
} from '~/shared/components/common/form/Fields';
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
}) {
  const {
    goalId,
    userId,
    date,
    value,
    previousValue = 0,
    onSubmitCallback,
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
          return t`Missing required fields`;
        }
      },
    },
    onSubmit: async ({ value }) => {
      const { value: inputtedValue, date } = value;
      if (inputtedValue === undefined) {
        return;
      }
      try {
        await recordEntry({
          value: inputtedValue,
          date,
          goalId,
          userId,
        });
        onSubmitCallback();
      } catch (error) {
        console.error(error);
        toast.error(t`Failed to add entry`);
      }
    },
  });

  return form;
}
