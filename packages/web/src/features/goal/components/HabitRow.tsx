import { useMemo } from 'react';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { isToday, subDays } from 'date-fns';
import { CheckIcon, ChevronRightIcon, FlameIcon } from 'lucide-react';

import { ENTRIES } from '~/constants/query';
import type { Database } from '~/data/db/AppSchema';
import {
  getConsistency,
  getStreak,
  hasEntryOnDay,
} from '~/data/domain/goalMetrics';
import { useEntryMutations } from '~/features/entry/hooks/useEntryMutations';
import { Button } from '~/shared/components/ui/button';
import { Card } from '~/shared/components/ui/card';
import { cn } from '~/utils';
import { Chip } from './StatChips';

const DOT_DAYS = 7;

/**
 * Compact row for a daily practice (BOOLEAN goal): last-7-days dots,
 * rolling consistency, celebration-only streak, one-tap done.
 * No streak resets, no "missed" states — numbers only go up.
 */
export function HabitRow({ goal }: { goal: Database['goal'] }) {
  const { t } = useLingui();
  const { data: entries = [] } = useQuery(ENTRIES.goalId(goal.id));
  const { save, remove } = useEntryMutations({ goalId: goal.id });

  const { dots, consistency, streak, doneToday, todayEntry, allTime } =
    useMemo(() => {
      const today = new Date();
      const days = Array.from({ length: DOT_DAYS }, (_, i) =>
        subDays(today, DOT_DAYS - 1 - i),
      );
      return {
        dots: days.map((day) => ({
          key: day.toDateString(),
          done: hasEntryOnDay(entries, day),
        })),
        consistency: getConsistency(entries, today),
        streak: getStreak(entries, today),
        doneToday: hasEntryOnDay(entries, today),
        todayEntry: entries.find((entry) => isToday(new Date(entry.date))),
        allTime: Math.round(goal.currentValue ?? goal.initialValue),
      };
    }, [entries, goal.currentValue, goal.initialValue]);

  return (
    <Card
      size="sm"
      className="ring-border @container relative w-full max-w-[600px] flex-row items-center gap-3 rounded-2xl px-4 py-3 shadow-xs transition-[translate,box-shadow] hover:-translate-y-px hover:shadow-sm"
      data-testid={`habit-row-${goal.id}`}
    >
      <div className="min-w-0 flex-1">
        <h3 className="font-heading truncate text-sm font-semibold">
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
        <p className="text-muted-foreground text-xs tabular-nums">
          <Plural
            value={allTime}
            one="# day all-time"
            other="# days all-time"
          />
        </p>
      </div>

      <div className="@sm:flex hidden items-center gap-1" aria-hidden="true">
        {dots.map((dot, index) => {
          const isTodayDot = index === DOT_DAYS - 1;
          return (
            <span
              key={dot.key}
              className={cn(
                'size-2 rounded-full',
                dot.done
                  ? 'bg-primary'
                  : isTodayDot
                    ? 'border-primary border bg-transparent'
                    : 'bg-border',
              )}
            />
          );
        })}
      </div>

      <span className="text-muted-foreground @md:inline hidden text-xs tabular-nums">
        <Trans>
          {consistency.done} of last {consistency.windowDays}
        </Trans>
      </span>

      {streak >= 2 && (
        <Chip className="bg-primary/10 text-primary">
          <FlameIcon size={12} className="text-warning" />
          {streak}
        </Chip>
      )}

      <Button
        variant={doneToday ? 'default' : 'outline'}
        size="icon-sm"
        className="relative z-10 rounded-full"
        disabled={save.isPending || remove.isPending}
        aria-pressed={doneToday}
        onClick={() =>
          doneToday && todayEntry
            ? remove.mutate(todayEntry.id)
            : save.mutate({ value: 1, date: new Date() })
        }
        aria-label={
          doneToday
            ? t`Unmark ${goal.title} for today`
            : t`Mark ${goal.title} done today`
        }
      >
        <CheckIcon />
      </Button>

      <ChevronRightIcon size={16} className="text-muted-foreground shrink-0" />
    </Card>
  );
}
