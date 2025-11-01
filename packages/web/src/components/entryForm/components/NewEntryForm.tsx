import { useMemo } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import FormError from '~/components/form/FormError';
import FormItem from '~/components/FormItem';
import { Button } from '~/components/ui/button';
import { MAX_INPUT_NUMBER } from '~/constants';
import { ENTRIES, GOALS } from '~/constants/query';
import { useIds } from '~/hooks/useIds';
import type { Database } from '~/lib/powersync/AppSchema';
import { deleteEntry } from '~/services/entry';
import { useUserStore } from '~/states/stores/userStore';
import { useViewportStore } from '~/states/stores/viewportStore';
import type { GoalType } from '~/types/goal';
import { cn } from '~/utils';
import { ENTRY_FIELD_SUFFIX } from '../constants';
import { useEntryForm } from '../hooks/useEntryForm';

const findPreviousEntry = (
  entries: Database['entry'][],
  selectedDate: Date,
) => {
  return entries
    .filter((entry) => new Date(entry.date) < selectedDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
};

interface NewEntryFormProps {
  goalId: string;
  entryId?: string;
  date?: Date;
  value?: number;
  orderedEntries: Database['entry'][];
  goalType: GoalType;
  onSubmitCallback?: () => void;
  className?: string;
}
// TODO: rename to CreateEntryForm
const NewEntryForm = ({
  goalId,
  entryId,
  date = new Date(),
  value,
  goalType,
  orderedEntries,
  onSubmitCallback: onSubmitCallbackProp,
  className,
}: NewEntryFormProps) => {
  const userId = useUserStore((state) => state.user.id);
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isMobile = useViewportStore((state) => state.isMobile);
  const isTouchScreen = useViewportStore((state) => state.isTouchScreen);

  const previousValue = useMemo(() => {
    return (
      (goalType === 'PROGRESS' &&
        findPreviousEntry(orderedEntries, date)?.value) ||
      0
    );
  }, [goalType, orderedEntries, date]);

  const goalTypeTitle = useMemo(
    () => ({
      COUNT: t`Amount`,
      PROGRESS: t`Progress`,
      BOOLEAN: t`Did you achieve it?`,
    }),
    [t],
  );

  const onSubmitCallback = () => {
    queryClient.invalidateQueries({
      queryKey: ENTRIES.goalId(goalId).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: GOALS.detail(goalId).queryKey,
    });
    onSubmitCallbackProp?.();
  };

  const ids = useIds(ENTRY_FIELD_SUFFIX);

  const form = useEntryForm({
    goalId,
    userId,
    date,
    value,
    previousValue,
    onSubmitCallback,
  });

  // TODO: refactor to separate goal type components
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className={cn('grid gap-4', className)}>
        <div className="grid gap-4 sm:gap-2">
          <FormItem
            label={t`Date`}
            labelFor={ids.entryDate}
            className="grid items-center gap-4 sm:grid-cols-3"
            labelClassName="text-start"
          >
            <form.AppField name="date">
              {(field) => {
                const {
                  meta: { errors },
                } = field.state;
                return (
                  <FormError.Wrapper
                    errors={errors}
                    errorClassName="col-span-2 col-start-2"
                  >
                    <div className="col-span-2">
                      <field.DateField
                        id={ids.entryDate}
                        defaultDate={field.state.value}
                        readOnly
                      />
                    </div>
                  </FormError.Wrapper>
                );
              }}
            </form.AppField>
          </FormItem>
          {goalType === 'BOOLEAN' ? (
            <FormItem
              label={goalTypeTitle[goalType]}
              labelFor="entry-value"
              className="mt-2 flex w-full flex-col items-start gap-y-2"
              labelClassName="text-start col-span-2"
              required
            >
              <form.Field name="value">
                {(field) => {
                  const {
                    value,
                    meta: { errors },
                  } = field.state;
                  return (
                    <FormError.Wrapper errors={errors}>
                      <div className="mt-1 flex w-full items-center gap-1">
                        <div className="flex w-full items-center gap-1">
                          <Button
                            variant="outline"
                            onClick={() => {
                              field.handleChange(1);
                            }}
                            className={cn(
                              value === 1
                                ? 'border-emerald-200 bg-emerald-100'
                                : '',
                              'h-10 w-1/2 px-8 text-base',
                            )}
                          >
                            <Trans>Yes</Trans>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              field.handleChange(0);
                            }}
                            className={cn(
                              value === 0
                                ? 'border-orange-200 bg-orange-100'
                                : '',
                              'h-10 w-1/2 px-8 text-base hover:bg-orange-100/80',
                            )}
                          >
                            <Trans>No</Trans>
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="hover:bg-destructive/90 hover:text-destructive-foreground shrink-0 justify-self-end"
                          size="icon"
                          disabled={!entryId}
                          onClick={() =>
                            entryId &&
                            void deleteEntry(entryId, goalId, {
                              callback: onSubmitCallback,
                              onError: () => {
                                toast.error(t`Failed to delete entry`);
                              },
                            })
                          }
                          aria-label={t`Delete entry`}
                        >
                          <Trash2Icon size={18} />
                        </Button>
                      </div>
                    </FormError.Wrapper>
                  );
                }}
              </form.Field>
            </FormItem>
          ) : (
            <FormItem
              label={goalTypeTitle[goalType]}
              labelFor="entry-value"
              className="grid items-center gap-4 sm:grid-cols-3"
              labelClassName="text-start"
              required
            >
              <form.AppField name="value">
                {(field) => {
                  const {
                    value,
                    meta: { errors },
                  } = field.state;
                  const showPreviousValueHelper =
                    !entryId && value === previousValue && !!previousValue;
                  return (
                    <FormError.Wrapper
                      errors={errors}
                      errorClassName="col-span-2 col-start-2"
                    >
                      <div className="col-span-2">
                        <field.NumberField
                          id={ids.entryValue}
                          min={0}
                          max={MAX_INPUT_NUMBER}
                          buttonStacked={!isMobile}
                          autoFocus={!isMobile && !isTouchScreen}
                          autoComplete="off"
                          helperText={
                            showPreviousValueHelper ? `${t`Last:`} ` : undefined
                          }
                        />
                      </div>
                    </FormError.Wrapper>
                  );
                }}
              </form.AppField>
            </FormItem>
          )}
          {goalType !== 'BOOLEAN' && (
            <form.Subscribe
              selector={(state) => [
                state.isSubmitting,
                !state.canSubmit || state.isSubmitting,
              ]}
            >
              {([isSubmitting, isSubmitDisabled]) => (
                <div
                  className={cn('mt-1 grid grid-cols-4 gap-2', {
                    'cursor-not-allowed': !isSubmitting && isSubmitDisabled,
                    'mt-2': isMobile,
                  })}
                >
                  <div
                    className={cn('col-span-1', {
                      'cursor-not-allowed': !entryId,
                    })}
                  >
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full"
                      disabled={!entryId}
                      onClick={() =>
                        entryId &&
                        void deleteEntry(entryId, goalId, {
                          callback: onSubmitCallback,
                          onError: () => {
                            toast.error(t`Failed to delete entry`);
                          },
                        })
                      }
                      size="responsive"
                      aria-label={t`Delete entry`}
                    >
                      <Trash2Icon size={18} />
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="col-span-3"
                    size="responsive"
                  >
                    <Trans>Save</Trans>
                  </Button>
                </div>
              )}
            </form.Subscribe>
          )}
        </div>
      </div>
    </form>
  );
};

export default NewEntryForm;
