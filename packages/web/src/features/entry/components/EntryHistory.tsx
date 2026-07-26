import { Trans } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { format, isSameYear, isToday, isYesterday } from 'date-fns';

import { ENTRIES } from '~/constants/query';

const MAX_ROWS = 8;

function DayLabel({ iso }: { iso: string }) {
  const date = new Date(iso);
  if (isToday(date)) return <Trans>Today</Trans>;
  if (isYesterday(date)) return <Trans>Yesterday</Trans>;
  return (
    <>
      {format(
        date,
        isSameYear(date, new Date()) ? 'EEE, MMM d' : 'EEE, MMM d, yyyy',
      )}
    </>
  );
}

/**
 * Read-only ledger of the most recent entries. Editing happens through
 * the calendar above — tap a day to add, correct, or delete it.
 */
export function EntryHistory({
  goalId,
  goalType,
}: {
  goalId: string;
  goalType: string;
}) {
  const { data: entries = [] } = useQuery(ENTRIES.goalId(goalId));
  const recent = entries.slice(-MAX_ROWS).reverse();
  const remaining = entries.length - recent.length;

  return (
    <section aria-label="History">
      <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
        <Trans>History</Trans>
      </h3>
      {recent.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          <Trans>No entries yet — tap a day in the calendar to log one.</Trans>
        </p>
      ) : (
        <>
          <div className="flex flex-col">
            {recent.map((entry) => (
              <div
                key={entry.id}
                className="border-border flex items-baseline justify-between gap-3 border-t py-1.5 text-sm first:border-t-0"
              >
                <span className="text-muted-foreground">
                  <DayLabel iso={entry.date} />
                </span>
                <span className="font-medium tabular-nums">
                  {goalType === 'PROGRESS'
                    ? `→ ${entry.value.toLocaleString()}`
                    : `+${entry.value.toLocaleString()}`}
                </span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            {remaining > 0 && (
              <>
                <Trans>and {remaining} earlier</Trans>
                {' · '}
              </>
            )}
            <Trans>Tap a day in the calendar to add or correct an entry.</Trans>
          </p>
        </>
      )}
    </section>
  );
}
