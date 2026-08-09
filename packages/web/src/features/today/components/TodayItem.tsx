import { useMemo, useState } from 'react';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { isToday } from 'date-fns';
import { CheckIcon, MinusIcon, PlusIcon } from 'lucide-react';

import { ENTRIES } from '~/constants/query';
import type { Database } from '~/data/db/AppSchema';
import { getGoalMetrics, getSparklineSeries } from '~/data/domain/goalMetrics';
import { useEntryMutations } from '~/features/entry/hooks/useEntryMutations';
import { GoalSparkline } from '~/features/goal/components/GoalSparkline';
import { paceStatusInfo } from '~/features/goal/model/paceStatusInfo';
import { Button } from '~/shared/components/ui/button';
import { Card } from '~/shared/components/ui/card';
import { cn } from '~/utils';

/**
 * Habits are one tap; goals get a stepper prefilled with the
 * amount that keeps them on pace.
 */
export function TodayItem({ goal }: { goal: Database['goal'] }) {
  const { t } = useLingui();
  const { data: entries = [] } = useQuery(ENTRIES.goalId(goal.id));
  const { save, remove } = useEntryMutations({ goalId: goal.id });
  const [pending, setPending] = useState<number | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const { metrics, series, todayEntry } = useMemo(() => {
    const today = new Date();
    return {
      metrics: getGoalMetrics(goal, entries, today),
      series: getSparklineSeries(goal, entries, today),
      todayEntry: entries.find((entry) => isToday(new Date(entry.date))),
    };
  }, [goal, entries]);

  const isHabit = goal.type === 'BOOLEAN';
  const isProgress = goal.type === 'PROGRESS';
  const logged = metrics.loggedToday;
  const pace = paceStatusInfo(metrics.pace);
  const isPending = save.isPending || remove.isPending;

  if (isHabit) {
    return (
      <Card
        size="sm"
        className="relative w-full flex-row items-center gap-3 rounded-2xl px-4 py-3 shadow-xs"
        data-testid={`today-item-${goal.id}`}
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{goal.title}</h3>
          <p className="text-muted-foreground text-xs tabular-nums">
            {logged ? (
              <>
                <span className="text-primary font-medium">
                  <Trans>Done</Trans>
                </span>
                {' · '}
              </>
            ) : null}
            <Trans>
              {metrics.consistency.done} of last{' '}
              {metrics.consistency.windowDays} days
            </Trans>
            {metrics.streak >= 2 && (
              <>
                {' · '}
                <Plural
                  value={metrics.streak}
                  one="#-day streak"
                  other="#-day streak"
                />
              </>
            )}
          </p>
        </div>
        <Button
          variant={logged ? 'default' : 'outline'}
          size="icon-lg"
          className="rounded-full"
          disabled={isPending}
          aria-pressed={logged}
          onClick={() =>
            logged && todayEntry
              ? remove.mutate(todayEntry.id)
              : save.mutate({ value: 1, date: new Date() })
          }
          aria-label={
            logged
              ? t`Unmark ${goal.title} for today`
              : t`Mark ${goal.title} done today`
          }
        >
          <CheckIcon />
        </Button>
      </Card>
    );
  }

  const showStepper = !logged || isAdjusting;
  const stepperValue =
    pending ??
    (isAdjusting && todayEntry ? todayEntry.value : metrics.suggestedToday);
  const minValue = isProgress ? 0 : 1;
  const currentValue = Math.round(goal.currentValue ?? goal.initialValue);

  const handleLog = () => {
    save.mutate(
      { value: stepperValue, date: new Date() },
      {
        onSuccess: () => {
          setPending(null);
          setIsAdjusting(false);
        },
      },
    );
  };

  return (
    <Card
      size="sm"
      className={cn(
        'relative w-full flex-row items-center gap-3 rounded-2xl px-4 py-3 shadow-xs transition-opacity',
        logged && !isAdjusting && 'opacity-75',
      )}
      data-testid={`today-item-${goal.id}`}
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">{goal.title}</h3>
        <p className="text-muted-foreground text-xs tabular-nums">
          {logged ? (
            <>
              <span className="text-primary font-medium">
                <Trans>{todayEntry?.value ?? 0} logged</Trans>
              </span>
              {' · '}
              <Trans>
                {currentValue} of {goal.target}
              </Trans>
            </>
          ) : isProgress ? (
            <Trans>
              Reach{' '}
              <span className="text-foreground font-medium">
                {metrics.suggestedToday}
              </span>{' '}
              today
            </Trans>
          ) : (
            <Trans>
              <span className="text-foreground font-medium">
                {metrics.suggestedToday}
              </span>{' '}
              to stay on pace
            </Trans>
          )}
          {' · '}
          <span className={pace.className}>{pace.label}</span>
        </p>
        {logged && !isAdjusting && (
          <GoalSparkline series={series} className="mt-1.5 h-7 w-28" />
        )}
      </div>

      {showStepper ? (
        <div className="flex shrink-0 flex-col items-stretch gap-1.5">
          <div className="border-input bg-background flex items-center rounded-xl border">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-xl"
              onClick={() => setPending(Math.max(minValue, stepperValue - 1))}
              aria-label={t`Less`}
            >
              <MinusIcon />
            </Button>
            <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
              {stepperValue}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-xl"
              onClick={() => setPending(stepperValue + 1)}
              aria-label={t`More`}
            >
              <PlusIcon />
            </Button>
          </div>
          <Button
            size="sm"
            className="rounded-xl"
            disabled={isPending}
            onClick={handleLog}
          >
            <Trans>Log</Trans>
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => {
            setPending(null);
            setIsAdjusting(true);
          }}
        >
          <Trans>Adjust</Trans>
        </Button>
      )}
    </Card>
  );
}
