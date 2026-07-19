import { t } from '@lingui/core/macro';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { GOALS } from '~/constants/query';
import type { Database } from '~/data/db/AppSchema';
import { createGoal, updateGoal } from '~/data/domain/goalRepo';
import {
  createGoalFormValues,
  goalFormValuesToPayload,
  goalToFormValues,
  type GoalFormValues,
} from '~/features/goal/model/form';
import { useAppForm, withForm } from '~/shared/components/common/form/appForm';

export type NewGoal = GoalFormValues;
export { withForm };

type Mode = 'create' | 'edit';

interface UseGoalFormBase {
  mode: Mode;
  onSuccess?: () => void;
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

export function useGoalForm({ onSuccess, ...options }: UseGoalFormOptions) {
  const queryClient = useQueryClient();

  const defaultValues: GoalFormValues =
    options.mode === 'create'
      ? createGoalFormValues()
      : goalToFormValues(options.goal);

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: ({ value }) => {
        if (!value.title.trim() || !value.targetValue || !value.targetDate) {
          return t`Missing required fields`;
        }
      },
    },
    async onSubmit({ value, formApi }) {
      const { targetValue, initialValue, title } = value;
      const payload = goalFormValuesToPayload(value);
      if (!payload || !targetValue) return;

      if (options.mode === 'create') {
        try {
          await createGoal({ ...payload, userId: options.userId });
          onSuccess?.();
          toast.success(t`Sucessfully added goal`);
        } catch (error) {
          console.error(error);
          toast.error(t`Failed to add goal`);
        }
        return;
      }
      // edit mode
      const completionCriteriaChanged =
        targetValue !== formApi.options.defaultValues?.targetValue ||
        initialValue !== formApi.options.defaultValues?.initialValue;

      try {
        await updateGoal(options.goal.id, payload, {
          completionCriteriaChanged,
        });
        toast.success(t`Sucessfully updated goal`);
      } catch (error) {
        console.error(error);
        toast.error(t`Failed to update goal`);
        return;
      }

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
