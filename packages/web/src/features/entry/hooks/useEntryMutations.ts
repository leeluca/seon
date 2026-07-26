import { t } from '@lingui/core/macro';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ENTRIES, GOALS } from '~/constants/query';
import {
  deleteEntry as deleteEntryRecord,
  recordEntry,
} from '~/data/domain/entryRepo';

interface EntryMutationOptions {
  goalId: string;
  onSuccess?: () => void;
}

export function useEntryMutations({ goalId, onSuccess }: EntryMutationOptions) {
  const queryClient = useQueryClient();

  const invalidateEntryQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ENTRIES.goalId(goalId).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: GOALS.detail(goalId).queryKey,
      }),
    ]);
    onSuccess?.();
  };

  const save = useMutation({
    mutationFn: ({ value, date }: { value: number; date: Date }) =>
      recordEntry({ value, date, goalId }),
    onSuccess: invalidateEntryQueries,
    onError: (error) => {
      console.error(error);
      toast.error(t`Failed to add entry`);
    },
  });

  const remove = useMutation({
    mutationFn: (entryId: string) => deleteEntryRecord(entryId, goalId),
    onSuccess: invalidateEntryQueries,
    onError: (error) => {
      console.error(error);
      toast.error(t`Failed to delete entry`);
    },
  });

  return { save, remove };
}
