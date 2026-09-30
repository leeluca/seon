import { useMemo, useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import { isSameDay, isToday } from 'date-fns';
import { CheckIcon, MinusIcon, PlusIcon } from 'lucide-react';

import { MAX_INPUT_NUMBER } from '~/constants';
import type { Database } from '~/data/db/AppSchema';
import { getPreviousEntry } from '~/data/domain/entryRepo';
import { getGoalMetrics } from '~/data/domain/goalMetrics';
import { useEntryMutations } from '~/features/entry/hooks/useEntryMutations';
import { Button } from '~/shared/components/ui/button';
import { cn } from '~/utils';

interface EntryLoggerProps {
  goal: Database['goal'];
  /** The goal's entries, as returned by ENTRIES.goalId. */
  entries: Database['entry'][];
  /** The day being logged. Defaults to today. */
  date?: Date;
  onSaved?: () => void;
  className?: string;
}

/**
 * The one control for logging a day, used on Today, on goal cards, and in
 * the detail calendar. Habits get a single check toggle. Amounts get
 * a typeable number with −/+ beside the same check: an outlined check means
 * there is something to save, a filled check means the day is saved.
 * Tapping a filled check clears the day, the same way a habit unchecks.
 */
export function EntryLogger({
  goal,
  entries,
  date,
  onSaved,
  className,
}: EntryLoggerProps) {
  const { t } = useLingui();
  const { save, remove } = useEntryMutations({
    goalId: goal.id,
    onSuccess: onSaved,
  });
  const [draft, setDraft] = useState<string | null>(null);

  const day = useMemo(() => date ?? new Date(), [date]);
  const dayEntry = entries.find((entry) =>
    isSameDay(new Date(entry.date), day),
  );
  const isDone = dayEntry !== undefined && dayEntry.value !== 0;
  const isPending = save.isPending || remove.isPending;
  const isProgress = goal.type === 'PROGRESS';

  const suggested = useMemo(() => {
    if (isProgress) {
      // PROGRESS values are readings ("page 208"), so start from the pace
      // target for today, or else from the last reading before this day.
      const previous =
        getPreviousEntry(entries, day)?.value ?? goal.initialValue;
      if (!isToday(day)) return previous;
      return getGoalMetrics(goal, entries, day).suggestedToday || previous;
    }
    if (isToday(day)) {
      return Math.max(getGoalMetrics(goal, entries, day).suggestedToday, 1);
    }
    return 1;
  }, [day, entries, goal, isProgress]);

  const saveValue = (value: number) =>
    save.mutate(
      { value, date: new Date(day) },
      { onSuccess: () => setDraft(null) },
    );

  const clearDay = () => {
    if (!dayEntry) return;
    remove.mutate(dayEntry.id, { onSuccess: () => setDraft(null) });
  };

  if (goal.type === 'BOOLEAN') {
    return (
      <Button
        variant={isDone ? 'default' : 'outline'}
        size="icon"
        className={cn('shrink-0 rounded-full', className)}
        disabled={isPending}
        aria-pressed={isDone}
        onClick={() => (isDone ? clearDay() : saveValue(1))}
        aria-label={
          isDone ? t`Unmark ${goal.title}` : t`Mark ${goal.title} done`
        }
      >
        <CheckIcon />
      </Button>
    );
  }

  const savedValue = dayEntry?.value;
  const shown = draft ?? String(savedValue ?? suggested);
  const value = shown === '' ? 0 : Number(shown);
  const isDirty = savedValue === undefined || value !== savedValue;
  const unit = goal.unit?.trim();

  const setValue = (next: number) =>
    setDraft(String(Math.min(Math.max(next, 0), MAX_INPUT_NUMBER)));

  const handleCheck = () => {
    if (!isDirty) return clearDay();
    if (value === 0) return dayEntry ? clearDay() : undefined;
    saveValue(value);
  };

  return (
    <div className={cn('flex shrink-0 items-center gap-2', className)}>
      <div className="border-input bg-background flex h-9 items-center rounded-full border">
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          disabled={isPending || value <= 0}
          onClick={() => setValue(value - 1)}
          aria-label={t`Less`}
        >
          <MinusIcon />
        </Button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="done"
          className="w-12 bg-transparent text-center text-sm font-semibold tabular-nums outline-none focus-visible:underline focus-visible:underline-offset-4"
          value={shown}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^0-9]/g, '');
            setDraft(
              digits === ''
                ? ''
                : String(Math.min(Number(digits), MAX_INPUT_NUMBER)),
            );
          }}
          onBlur={() => {
            if (draft === '') setDraft(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleCheck();
            }
          }}
          aria-label={
            unit
              ? t`Amount for ${goal.title} in ${unit}`
              : t`Amount for ${goal.title}`
          }
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          disabled={isPending}
          onClick={() => setValue(value + 1)}
          aria-label={t`More`}
        >
          <PlusIcon />
        </Button>
      </div>
      <Button
        variant={isDirty ? 'outline' : 'default'}
        size="icon"
        className="rounded-full"
        disabled={isPending || (isDirty && value === 0 && !dayEntry)}
        aria-pressed={!isDirty}
        onClick={handleCheck}
        aria-label={
          isDirty
            ? t`Save ${value} for ${goal.title}`
            : t`Clear ${goal.title} for this day`
        }
      >
        <CheckIcon />
      </Button>
    </div>
  );
}
