import { useMemo } from 'react';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isSameYear } from 'date-fns';
import { toast } from 'sonner';

import { ENTRIES, GOALS } from '~/constants/query';
import type { Database } from '~/data/db/AppSchema';
import { getGoalMetrics, getReplanDate } from '~/data/domain/goalMetrics';
import { updateGoal } from '~/data/domain/goalRepo';
import { Button } from '~/shared/components/ui/button';
import { Chip, PaceChip } from './StatChips';

const formatDay = (value: string | Date, today: Date) => {
  const date = new Date(value);
  return format(date, isSameYear(date, today) ? 'MMM d' : 'MMM d, yyyy');
};

/**
 * The detail view's summary: the card language at full size. For paced
 * goals it also carries the re-plan action — moving the target date is
 * one guilt-free tap, never buried in a form.
 */
export function GoalDetailStats({ goal }: { goal: Database['goal'] }) {
  const { data: entries = [] } = useQuery(ENTRIES.goalId(goal.id));
  const queryClient = useQueryClient();

  const { metrics, replanDate } = useMemo(() => {
    const today = new Date();
    const currentValue = goal.currentValue ?? goal.initialValue;
    return {
      metrics: getGoalMetrics(goal, entries, today),
      replanDate: getReplanDate({ ...goal, currentValue }, today),
    };
  }, [goal, entries]);

  const replan = useMutation({
    mutationFn: (newTargetDate: string) =>
      updateGoal(goal.id, {
        title: goal.title,
        target: goal.target,
        unit: goal.unit,
        startDate: goal.startDate,
        targetDate: newTargetDate,
        initialValue: goal.initialValue,
        type: goal.type,
      }),
    onSuccess: async (_, newTargetDate) => {
      await queryClient.invalidateQueries({ queryKey: GOALS.all.queryKey });
      toast.success(
        t`Target date moved to ${formatDay(newTargetDate, new Date())}`,
      );
    },
    onError: (error) => {
      console.error(error);
      toast.error(t`Failed to move the target date`);
    },
  });

  if (goal.type === 'BOOLEAN') {
    const allTime = Math.round(goal.currentValue ?? goal.initialValue);
    return (
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xl leading-none font-semibold tabular-nums">
            {allTime.toLocaleString()}{' '}
            <span className="text-muted-foreground text-sm font-normal">
              <Trans>days all-time</Trans>
            </span>
          </p>
          <Chip className="bg-muted text-muted-foreground">
            <Trans>
              {metrics.consistency.done} of last{' '}
              {metrics.consistency.windowDays}
            </Trans>
          </Chip>
        </div>
        <p className="text-muted-foreground text-xs tabular-nums">
          {metrics.streak >= 2 && (
            <>
              <Plural
                value={metrics.streak}
                one="#-day streak"
                other="#-day streak"
              />
              {' · '}
            </>
          )}
          {metrics.loggedToday ? (
            <Trans>done today</Trans>
          ) : (
            <Trans>not yet today</Trans>
          )}
        </p>
      </section>
    );
  }

  const currentValue = Math.round(goal.currentValue ?? goal.initialValue);
  const unit = goal.unit?.trim();
  const canReplan = replanDate !== null && !goal.archivedAt;

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-2xl leading-none font-semibold tabular-nums">
          {currentValue.toLocaleString()}{' '}
          <span className="text-muted-foreground text-sm font-normal">
            <Trans>
              of {goal.target.toLocaleString()} {unit}
            </Trans>{' '}
            · <Trans>by {formatDay(goal.targetDate, new Date())}</Trans>
          </span>
        </p>
        <PaceChip status={metrics.pace} />
      </div>
      <div className="text-muted-foreground flex min-h-6 flex-wrap items-center justify-between gap-x-2 text-xs">
        <span>
          {metrics.pace.kind === 'completed' ? (
            <Trans>Goal achieved</Trans>
          ) : metrics.pace.kind === 'notStarted' ? (
            <Trans>Starts {formatDay(goal.startDate, new Date())}</Trans>
          ) : goal.type === 'PROGRESS' ? (
            <Trans>
              Reach{' '}
              <span className="text-foreground font-medium tabular-nums">
                {metrics.suggestedToday}
              </span>{' '}
              today to stay on pace
            </Trans>
          ) : (
            <Trans>
              <span className="text-foreground font-medium tabular-nums">
                {metrics.suggestedToday}
              </span>
              /day finishes on time
            </Trans>
          )}
        </span>
        {canReplan && replanDate && (
          <Button
            variant="ghost"
            size="xs"
            className="text-primary -mr-2"
            disabled={replan.isPending}
            onClick={() => replan.mutate(replanDate.toISOString())}
          >
            <Trans>
              or move the date → {formatDay(replanDate, new Date())}
            </Trans>
          </Button>
        )}
      </div>
    </section>
  );
}
