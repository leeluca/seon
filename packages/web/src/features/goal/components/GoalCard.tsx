import { useMemo } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { format, isSameYear } from 'date-fns';
import { ChevronRightIcon } from 'lucide-react';

import { ENTRIES } from '~/constants/query';
import type { Database } from '~/data/db/AppSchema';
import {
  getGoalMetrics,
  getSparklineSeries,
  type GoalMetrics,
} from '~/data/domain/goalMetrics';
import { EntryLogger } from '~/features/entry/components/EntryLogger';
import { Card, CardContent, CardHeader } from '~/shared/components/ui/card';
import { GoalSparkline } from './GoalSparkline';
import { PaceChip } from './StatChips';

const formatDay = (value: string, today: Date) => {
  const date = new Date(value);
  return format(date, isSameYear(date, today) ? 'MMM d' : 'MMM d, yyyy');
};

function CardFooterStatus({
  goal,
  metrics,
}: {
  goal: Database['goal'];
  metrics: GoalMetrics;
}) {
  if (metrics.pace.kind === 'completed') {
    return <Trans>Goal achieved</Trans>;
  }
  if (metrics.pace.kind === 'notStarted') {
    return <Trans>Starts {formatDay(goal.startDate, new Date())}</Trans>;
  }

  const unit = goal.unit?.trim();
  const suggested = (
    <span className="text-foreground font-medium tabular-nums">
      {metrics.suggestedToday.toLocaleString()} {unit}
    </span>
  );

  return goal.type === 'PROGRESS' ? (
    <Trans>Reach {suggested} today to stay on pace</Trans>
  ) : (
    <Trans>{suggested} a day finishes on time</Trans>
  );
}

export default function GoalCard({ goal }: { goal: Database['goal'] }) {
  const { t } = useLingui();
  const { data: entries = [] } = useQuery(ENTRIES.goalId(goal.id));

  const { metrics, series } = useMemo(() => {
    const today = new Date();
    return {
      metrics: getGoalMetrics(goal, entries, today),
      series: getSparklineSeries(goal, entries, today),
    };
  }, [goal, entries]);

  const currentValue = Math.round(goal.currentValue ?? goal.initialValue);
  const unit = goal.unit?.trim();

  return (
    <Card
      size="sm"
      className="ring-border hover:ring-border relative w-full max-w-[600px] rounded-2xl shadow-xs transition-[translate,box-shadow] hover:-translate-y-px hover:shadow-sm"
      data-testid={`goal-card-${goal.id}`}
    >
      <CardHeader>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h3 className="font-heading min-w-0 truncate text-base font-semibold sm:text-lg">
            <Link
              to="/goals/$id"
              params={{ id: goal.id }}
              mask={{ to: '/goals/$id', params: { id: goal.shortId } }}
              aria-label={t`View ${goal.title} details`}
              className="focus-visible:after:ring-ring/50 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2"
            >
              {goal.title}
            </Link>
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <PaceChip status={metrics.pace} />
            <ChevronRightIcon size={16} className="text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-2xl leading-none font-semibold tabular-nums">
          {currentValue.toLocaleString()}{' '}
          <span className="text-muted-foreground text-sm font-normal">
            {goal.target !== null && (
              <Trans>
                of {goal.target.toLocaleString()} {unit}
              </Trans>
            )}
            {goal.targetDate !== null && (
              <>
                {' '}
                · <Trans>by {formatDay(goal.targetDate, new Date())}</Trans>
              </>
            )}
          </span>
        </p>
        <GoalSparkline series={series} />
        <div className="text-muted-foreground flex min-h-9 items-center justify-between gap-3 text-xs">
          <span className="min-w-0">
            <CardFooterStatus goal={goal} metrics={metrics} />
          </span>
          {metrics.pace.kind !== 'completed' && (
            <EntryLogger
              goal={goal}
              entries={entries}
              className="relative z-10"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
