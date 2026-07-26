import { Trans } from '@lingui/react/macro';
import { useQuery } from '@powersync/react';
import * as Sentry from '@sentry/react';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';

import { ENTRIES, GOALS } from '~/constants/query';
import ErrorFallback from '~/shared/components/common/ErrorFallback';
import { buttonVariants } from '~/shared/components/ui/button';
import { cn } from '~/utils';
import { TodayItem } from '../components/TodayItem';

export function TodayPage() {
  const { data: goals = [], isLoading } = useQuery(
    GOALS.list('createdAt desc', 'ongoing').query,
  );
  const { data: todayEntries = [] } = useQuery(ENTRIES.todayWatched().query);

  const today = new Date();
  const loggedIds = new Set(
    todayEntries
      .filter((entry) => entry.value !== 0)
      .map((entry) => entry.goalId),
  );
  const doneCount = goals.filter((goal) => loggedIds.has(goal.id)).length;
  const allDone = goals.length > 0 && doneCount === goals.length;

  const items = [
    ...goals.filter((goal) => goal.type === 'BOOLEAN'),
    ...goals.filter((goal) => goal.type !== 'BOOLEAN'),
  ];

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="sr-only">
        <Trans>Today</Trans>
      </h1>
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="font-serif text-2xl font-semibold">
            {format(today, 'EEEE')}
          </p>
          <p className="text-muted-foreground text-sm">
            {format(today, 'MMMM d')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-muted-foreground text-sm tabular-nums">
            <span className="sr-only">
              <Trans>Progress for today:</Trans>{' '}
            </span>
            <Trans>
              {doneCount} of {goals.length}
            </Trans>
          </p>
          <Link
            to="/goals"
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
          >
            <Trans>All goals</Trans>
          </Link>
        </div>
      </header>

      <div
        className="bg-border mb-6 h-1 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={goals.length}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${goals.length ? (doneCount / goals.length) * 100 : 0}%`,
          }}
        />
      </div>

      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        <div className="flex flex-col gap-3">
          {items.map((goal) => (
            <TodayItem key={goal.id} goal={goal} />
          ))}
        </div>
      </Sentry.ErrorBoundary>

      {!isLoading && goals.length === 0 && (
        <div className="text-muted-foreground mt-10 text-center text-sm">
          <p>
            <Trans>Nothing to work on yet.</Trans>
          </p>
          <Link
            to="/goals/new"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'mt-3',
            )}
          >
            <Trans>Create a goal</Trans>
          </Link>
        </div>
      )}

      {allDone && (
        <div className="bg-primary/10 mt-6 rounded-2xl p-5 text-center">
          <p className="text-primary font-serif text-base font-semibold">
            <Trans>That's everything for today.</Trans>
          </p>
          <p className="text-primary/80 mt-0.5 text-sm">
            <Trans>The lines grew a little. See you tomorrow.</Trans>
          </p>
        </div>
      )}
    </div>
  );
}
