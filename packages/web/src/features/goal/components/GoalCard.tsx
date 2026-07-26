import { useMemo, useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { format, isSameYear, isToday } from 'date-fns';
import { ChevronRightIcon, PlusIcon } from 'lucide-react';

import { ENTRIES } from '~/constants/query';
import type { Database } from '~/data/db/AppSchema';
import {
  getGoalMetrics,
  getSparklineSeries,
  type GoalMetrics,
} from '~/data/domain/goalMetrics';
import CreateEntryForm from '~/features/entry/components/CreateEntryForm';
import type { GoalType } from '~/features/goal/model';
import { Button } from '~/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '~/shared/components/ui/card';
import { ResponsivePopover } from '~/shared/components/ui/responsive-popover';
import { useViewportStore } from '~/states/stores/viewportStore';
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

  const suggested = (
    <span className="text-foreground font-medium tabular-nums">
      {metrics.suggestedToday}
    </span>
  );

  return goal.type === 'PROGRESS' ? (
    <Trans>Reach {suggested} today to stay on pace</Trans>
  ) : (
    <Trans>{suggested}/day finishes on time</Trans>
  );
}

export default function GoalCard({ goal }: { goal: Database['goal'] }) {
  const { t } = useLingui();
  const isMobile = useViewportStore((state) => state.isMobile);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const { data: entries = [] } = useQuery(ENTRIES.goalId(goal.id));

  const { metrics, series, todayEntry } = useMemo(() => {
    const today = new Date();
    return {
      metrics: getGoalMetrics(goal, entries, today),
      series: getSparklineSeries(goal, entries, today),
      todayEntry: entries.find((entry) => isToday(new Date(entry.date))),
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
        <div className="flex items-center justify-between gap-2">
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
            <Trans>
              of {goal.target.toLocaleString()} {unit}
            </Trans>{' '}
            · <Trans>by {formatDay(goal.targetDate, new Date())}</Trans>
          </span>
        </p>
        <GoalSparkline series={series} />
        <div className="text-muted-foreground flex min-h-8 items-center justify-between gap-2 text-xs">
          <span>
            <CardFooterStatus goal={goal} metrics={metrics} />
          </span>
          {metrics.pace.kind !== 'completed' && (
            <ResponsivePopover
              open={isLogOpen}
              onOpenChange={setIsLogOpen}
              trigger={
                <Button
                  size="sm"
                  className="relative z-10 rounded-xl"
                  aria-label={t`Log progress for ${goal.title}`}
                >
                  <PlusIcon data-icon="inline-start" />
                  <Trans>Log</Trans>
                </Button>
              }
              contentClassName={isMobile ? '' : 'w-fit max-w-72'}
              overlayClassName={isMobile ? 'bg-black/50' : ''}
              drawerTitle={
                <span>
                  <Trans>
                    Add entry for{' '}
                    <span className="text-muted-foreground">{goal.title}</span>
                  </Trans>
                </span>
              }
            >
              <CreateEntryForm
                goalId={goal.id}
                entryId={todayEntry?.id}
                value={todayEntry?.value}
                orderedEntries={entries}
                goalType={goal.type as GoalType}
                onSubmitCallback={() => setIsLogOpen(false)}
              />
            </ResponsivePopover>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
