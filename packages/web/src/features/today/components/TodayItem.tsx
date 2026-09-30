import { useMemo } from 'react';
import { Plural, Trans } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { isToday } from 'date-fns';

import { ENTRIES } from '~/constants/query';
import type { Database } from '~/data/db/AppSchema';
import { getGoalMetrics } from '~/data/domain/goalMetrics';
import { EntryLogger } from '~/features/entry/components/EntryLogger';
import { paceStatusInfo } from '~/features/goal/model/paceStatusInfo';
import { Card } from '~/shared/components/ui/card';

/**
 * One line per goal: what to do today on the left, the shared logging
 * control on the right. Habits are one tap; amounts start at the number
 * that keeps the goal on pace and can be typed over.
 */
export function TodayItem({ goal }: { goal: Database['goal'] }) {
  const { data: entries = [] } = useQuery(ENTRIES.goalId(goal.id));

  const { metrics, todayEntry } = useMemo(() => {
    const today = new Date();
    return {
      metrics: getGoalMetrics(goal, entries, today),
      todayEntry: entries.find((entry) => isToday(new Date(entry.date))),
    };
  }, [goal, entries]);

  const logged = metrics.loggedToday;
  const unit = goal.unit?.trim();
  const pace = paceStatusInfo(metrics.pace);
  // "On pace" repeats "to stay on pace", so only a gap is worth showing.
  const showPace =
    metrics.pace.kind === 'ahead' || metrics.pace.kind === 'behind';

  return (
    <Card
      size="sm"
      className="relative w-full flex-row items-center gap-3 rounded-2xl px-4 py-3 shadow-xs"
      data-testid={`today-item-${goal.id}`}
    >
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold">
          {goal.title}
        </h3>
        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
          {goal.type === 'BOOLEAN' ? (
            <HabitStatus metrics={metrics} />
          ) : logged ? (
            <>
              <span className="text-primary font-medium">
                {goal.type === 'PROGRESS' ? (
                  <Trans>
                    At {todayEntry?.value.toLocaleString()} {unit}
                  </Trans>
                ) : (
                  <Trans>
                    {todayEntry?.value.toLocaleString()} {unit} today
                  </Trans>
                )}
              </span>
              {goal.target !== null && (
                <>
                  {' · '}
                  <Trans>
                    {Math.round(
                      goal.currentValue ?? goal.initialValue,
                    ).toLocaleString()}{' '}
                    of {goal.target.toLocaleString()}
                  </Trans>
                </>
              )}
            </>
          ) : goal.type === 'PROGRESS' ? (
            <Trans>
              Reach{' '}
              <span className="text-foreground font-medium">
                {metrics.suggestedToday.toLocaleString()} {unit}
              </span>{' '}
              today
            </Trans>
          ) : (
            <Trans>
              <span className="text-foreground font-medium">
                {metrics.suggestedToday.toLocaleString()} {unit}
              </span>{' '}
              to stay on pace
            </Trans>
          )}
          {goal.type !== 'BOOLEAN' && showPace && (
            <>
              {' · '}
              <span className={pace.className}>{pace.label}</span>
            </>
          )}
        </p>
      </div>
      <EntryLogger goal={goal} entries={entries} />
    </Card>
  );
}

function HabitStatus({
  metrics,
}: {
  metrics: ReturnType<typeof getGoalMetrics>;
}) {
  return (
    <>
      {metrics.loggedToday && (
        <>
          <span className="text-primary font-medium">
            <Trans>Done</Trans>
          </span>
          {' · '}
        </>
      )}
      <Trans>
        {metrics.consistency.done} of last {metrics.consistency.windowDays} days
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
    </>
  );
}
