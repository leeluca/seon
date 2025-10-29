import { t } from '@lingui/core/macro';
import { createFormHook } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { add, startOfDay } from 'date-fns';
import { toast } from 'sonner';

import {
  DateField,
  ErrorInfo,
  NumberField,
  TextField,
} from '~/components/form/Fields';
import { GOALS } from '~/constants/query';
import type { Database } from '~/lib/powersync/AppSchema';
import { handleSave, handleUpdate } from '~/services/goal';
import { fieldContext, formContext } from '~/states/formContext';

// FIXME: add translations
// FIXME: move to types/goal.ts
export interface NewGoal {
  title: string;
  targetValue?: number;
  unit: string;
  startDate: Date;
  targetDate?: Date;
  initialValue: number;
  type: 'COUNT' | 'PROGRESS' | 'BOOLEAN';
}

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

type Mode = 'create' | 'edit';

interface UseGoalFormBase {
  mode: Mode;
}

interface UseGoalFormCreate extends UseGoalFormBase {
  mode: 'create';
  userId: string;
}

interface UseGoalFormEdit extends UseGoalFormBase {
  mode: 'edit';
  goal: Database['goal'];
}

export type UseGoalFormOptions = UseGoalFormCreate | UseGoalFormEdit;

export function useGoalForm(options: UseGoalFormOptions) {
  const queryClient = useQueryClient();

  const defaultValues: NewGoal =
    options.mode === 'create'
      ? {
          title: '',
          targetValue: 0,
          unit: '',
          startDate: new Date(),
          targetDate: add(startOfDay(new Date()), { months: 1 }),
          initialValue: 0,
          type: 'COUNT',
        }
      : {
          title: options.goal.title,
          targetValue: options.goal.target,
          unit: options.goal.unit,
          startDate: new Date(options.goal.startDate),
          targetDate: new Date(options.goal.targetDate),
          initialValue: options.goal.initialValue ?? 0,
          type: options.goal.type as NewGoal['type'],
        };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange({ value }) {
        const { title, targetValue, targetDate } = value;
        if (!title || !targetValue || !targetDate) {
          return t`Missing required fields`;
        }
      },
    },
    async onSubmit({ value, formApi }) {
      const { startDate, targetDate, targetValue, initialValue, title } = value;
      if (!targetDate || !targetValue) return;

      const payload = {
        ...value,
        title: value.title.trim(),
        unit: value.unit.trim(),
        target: targetValue,
        startDate: startDate.toISOString(),
        targetDate: targetDate.toISOString(),
      };

      if (options.mode === 'create') {
        await handleSave(
          { ...payload, userId: options.userId },
          {
            callback: () => {
              toast.success(t`Sucessfully added goal`);
            },
            onError: () => {
              toast.error(t`Failed to add goal`);
            },
          },
        );
        return;
      }
      // edit mode
      const completionCriteriaChanged =
        targetValue !== formApi.options.defaultValues?.targetValue ||
        initialValue !== formApi.options.defaultValues?.initialValue;

      await handleUpdate(options.goal.id, payload, {
        callback: () => {
          toast.success(t`Sucessfully updated goal`);
        },
        onError: () => {
          toast.error(t`Failed to update goal`);
        },
        completionCriteriaChanged,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GOALS.detailShortId(options.goal.shortId).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: GOALS.detail(options.goal.id).queryKey,
        }),
      ]);

      if (
        completionCriteriaChanged ||
        title !== formApi.options.defaultValues?.title
      ) {
        await queryClient.invalidateQueries({ queryKey: GOALS.all.queryKey });
      }

      setTimeout(() => {
        form.reset(value);
      }, 150);
    },
  });

  return form;
}
