import { describe, expect, it } from 'vitest';

import {
  getConsistency,
  getGoalMetrics,
  getPaceStatus,
  getPercentComplete,
  getProjectedFinish,
  getReplanDate,
  getSparklineSeries,
  getStreak,
  getSuggestedToday,
  hasEntryOnDay,
  type EntryLike,
} from '~/data/domain/goalMetrics';

// Local-time dates at midday to stay clear of day boundaries in any TZ.
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

const entry = (date: Date, value: number): EntryLike => ({
  date: date.toISOString(),
  value,
});

// 100 units in 10 days (Jan 1–10) → 10/day.
const paceGoal = {
  initialValue: 0,
  target: 100,
  startDate: day(2026, 1, 1).toISOString(),
  targetDate: day(2026, 1, 10).toISOString(),
  currentValue: 0,
};

describe('getPaceStatus', () => {
  it('is on pace on the morning of day one, before any logging', () => {
    expect(getPaceStatus(paceGoal, day(2026, 1, 1))).toEqual({
      kind: 'onPace',
    });
  });

  it('is on pace when fully logged through yesterday', () => {
    // Morning of day 4: 3 days passed, expectation is 30.
    expect(
      getPaceStatus({ ...paceGoal, currentValue: 30 }, day(2026, 1, 4)),
    ).toEqual({ kind: 'onPace' });
  });

  it('reports whole days behind', () => {
    expect(
      getPaceStatus({ ...paceGoal, currentValue: 10 }, day(2026, 1, 4)),
    ).toEqual({ kind: 'behind', days: 2 });
  });

  it('reports whole days ahead', () => {
    expect(
      getPaceStatus({ ...paceGoal, currentValue: 50 }, day(2026, 1, 4)),
    ).toEqual({ kind: 'ahead', days: 2 });
  });

  it('treats a sub-half-day gap as on pace', () => {
    // Expectation 30, current 26 → gap 0.4 days.
    expect(
      getPaceStatus({ ...paceGoal, currentValue: 26 }, day(2026, 1, 4)),
    ).toEqual({ kind: 'onPace' });
  });

  it('is not started before the start date', () => {
    expect(getPaceStatus(paceGoal, day(2025, 12, 28))).toEqual({
      kind: 'notStarted',
    });
  });

  it('is completed at or past the target regardless of dates', () => {
    expect(
      getPaceStatus({ ...paceGoal, currentValue: 100 }, day(2026, 1, 3)),
    ).toEqual({ kind: 'completed' });
  });

  it('keeps a meaningful gap after the target date has passed', () => {
    // All 10 days elapsed, expectation capped at 100; current 80 → 2 days of work.
    expect(
      getPaceStatus({ ...paceGoal, currentValue: 80 }, day(2026, 1, 15)),
    ).toEqual({ kind: 'behind', days: 2 });
  });

  it('respects a non-zero initial value', () => {
    // 50→100 in 10 days → 5/day. Morning of day 4: expectation 65.
    const goal = { ...paceGoal, initialValue: 50, currentValue: 55 };
    expect(getPaceStatus(goal, day(2026, 1, 4))).toEqual({
      kind: 'behind',
      days: 2,
    });
  });
});

describe('getReplanDate', () => {
  it('suggests the date implied by the demonstrated rate, landing on pace', () => {
    // Day 15 (elapsed 14), 150 of 900 done → ~10.7/day → 82-day plan.
    const goal = {
      initialValue: 0,
      target: 900,
      startDate: day(2026, 7, 12).toISOString(),
      targetDate: day(2026, 8, 26).toISOString(),
      currentValue: 150,
    };
    const today = day(2026, 7, 26);
    const replanned = getReplanDate(goal, today);

    expect(replanned).toEqual(new Date(2026, 9, 1)); // Oct 1
    expect(
      getPaceStatus({ ...goal, targetDate: replanned as Date }, today),
    ).toEqual({ kind: 'onPace' });
  });

  it('returns null when not behind', () => {
    expect(
      getReplanDate({ ...paceGoal, currentValue: 30 }, day(2026, 1, 4)),
    ).toBeNull();
  });

  it('returns null with no progress to project from', () => {
    expect(
      getReplanDate({ ...paceGoal, currentValue: 0 }, day(2026, 1, 4)),
    ).toBeNull();
  });
});

describe('getSuggestedToday', () => {
  it('spreads the remaining amount over the days left, today included', () => {
    // Day 4: 90 remaining over 7 days → ceil(12.86) = 13.
    expect(
      getSuggestedToday(
        { ...paceGoal, currentValue: 10, type: 'COUNT' },
        day(2026, 1, 4),
      ),
    ).toBe(13);
  });

  it('returns 0 once the target is met', () => {
    expect(
      getSuggestedToday(
        { ...paceGoal, currentValue: 100, type: 'COUNT' },
        day(2026, 1, 4),
      ),
    ).toBe(0);
  });

  it('asks for the full remainder when the target date has passed', () => {
    expect(
      getSuggestedToday(
        { ...paceGoal, currentValue: 80, type: 'COUNT' },
        day(2026, 1, 15),
      ),
    ).toBe(20);
  });

  it('gives the planned daily rate before the goal starts', () => {
    expect(
      getSuggestedToday(
        { ...paceGoal, currentValue: 0, type: 'COUNT' },
        day(2025, 12, 28),
      ),
    ).toBe(10);
  });

  it('returns an absolute value to reach for PROGRESS goals', () => {
    // Day 4: current 10, remaining 90 over 7 days → reach ceil(22.86) = 23.
    expect(
      getSuggestedToday(
        { ...paceGoal, currentValue: 10, type: 'PROGRESS' },
        day(2026, 1, 4),
      ),
    ).toBe(23);
  });
});

describe('getProjectedFinish', () => {
  const goal = { type: 'COUNT', initialValue: 0, target: 100 };

  it('projects from the trailing-window rate', () => {
    // 30 gained in the last 30 days → 1/day; 70 remaining → 70 days out.
    const entries = [
      entry(day(2026, 3, 1), 10),
      entry(day(2026, 3, 10), 10),
      entry(day(2026, 3, 20), 10),
    ];
    const projected = getProjectedFinish(goal, entries, 30, day(2026, 3, 20));
    expect(projected).toEqual(new Date(2026, 4, 29)); // Mar 20 + 70 days
  });

  it('returns null with no recent progress', () => {
    const entries = [entry(day(2025, 11, 1), 30)];
    expect(getProjectedFinish(goal, entries, 30, day(2026, 3, 20))).toBeNull();
  });

  it('returns null once completed', () => {
    expect(
      getProjectedFinish(
        goal,
        [entry(day(2026, 3, 19), 100)],
        100,
        day(2026, 3, 20),
      ),
    ).toBeNull();
  });

  it('ignores entries dated after today', () => {
    const entries = [entry(day(2026, 3, 19), 30), entry(day(2026, 3, 25), 500)];
    const projected = getProjectedFinish(goal, entries, 30, day(2026, 3, 20));
    expect(projected).toEqual(new Date(2026, 4, 29)); // 1/day → 70 days out
  });

  it('measures PROGRESS goals by value gained, not entry sums', () => {
    const progressGoal = { type: 'PROGRESS', initialValue: 0, target: 100 };
    // Absolute readings: 40 before the window, 70 inside it → gained 30.
    const entries = [entry(day(2026, 1, 10), 40), entry(day(2026, 3, 15), 70)];
    const projected = getProjectedFinish(
      progressGoal,
      entries,
      70,
      day(2026, 3, 20),
    );
    expect(projected).toEqual(new Date(2026, 3, 19)); // 30/30d → 30 remaining → 30 days
  });
});

describe('getConsistency', () => {
  it('counts distinct active days inside the window, today inclusive', () => {
    const today = day(2026, 3, 30);
    const entries = [
      entry(day(2026, 3, 30), 1), // today
      entry(day(2026, 3, 29), 1),
      entry(day(2026, 3, 1), 1), // windowStart (today - 29)
      entry(day(2026, 2, 28), 1), // outside the 30-day window
    ];
    expect(getConsistency(entries, today)).toEqual({
      done: 3,
      windowDays: 30,
    });
  });

  it('ignores zero-value entries and duplicate days', () => {
    const today = day(2026, 3, 30);
    const entries = [
      entry(day(2026, 3, 30), 0),
      entry(day(2026, 3, 29), 2),
      entry(day(2026, 3, 29), 3),
    ];
    expect(getConsistency(entries, today).done).toBe(1);
  });
});

describe('getStreak', () => {
  it('counts back from today when today is logged', () => {
    const entries = [
      entry(day(2026, 3, 30), 1),
      entry(day(2026, 3, 29), 1),
      entry(day(2026, 3, 28), 1),
      entry(day(2026, 3, 26), 1), // gap on the 27th
    ];
    expect(getStreak(entries, day(2026, 3, 30))).toBe(3);
  });

  it('stays alive from yesterday before today is logged', () => {
    const entries = [entry(day(2026, 3, 29), 1), entry(day(2026, 3, 28), 1)];
    expect(getStreak(entries, day(2026, 3, 30))).toBe(2);
  });

  it('is zero after a full missed day', () => {
    expect(getStreak([entry(day(2026, 3, 27), 1)], day(2026, 3, 30))).toBe(0);
  });
});

describe('getSparklineSeries', () => {
  const goal = {
    type: 'COUNT',
    initialValue: 0,
    target: 100,
    startDate: day(2026, 1, 1).toISOString(),
    targetDate: day(2026, 1, 10).toISOString(),
  };

  it('accumulates COUNT entries per day, seeding pre-window history', () => {
    const today = day(2026, 1, 8);
    const entries = [
      entry(day(2026, 1, 2), 10), // before the 5-day window
      entry(day(2026, 1, 5), 5),
      entry(day(2026, 1, 7), 5),
    ];
    const series = getSparklineSeries(goal, entries, today, 5);

    // Window: Jan 4–8. Baseline 10, +5 on the 5th, +5 on the 7th.
    expect(series.values).toEqual([10, 15, 15, 20, 20]);
  });

  it('carries the latest PROGRESS reading forward', () => {
    const today = day(2026, 1, 8);
    const entries = [entry(day(2026, 1, 2), 40), entry(day(2026, 1, 6), 55)];
    const series = getSparklineSeries(
      { ...goal, type: 'PROGRESS' },
      entries,
      today,
      5,
    );
    expect(series.values).toEqual([40, 40, 55, 55, 55]);
  });

  it('exposes the pace line endpoints over the same window', () => {
    // 10/day; expectation at start-of-day: Jan 4 → 30, Jan 8 → 70.
    const series = getSparklineSeries(goal, [], day(2026, 1, 8), 5);
    expect(series.ideal).toEqual({ start: 30, end: 70 });
  });

  it('has no pace line for degenerate targets', () => {
    const series = getSparklineSeries(
      { ...goal, target: 0 },
      [],
      day(2026, 1, 8),
      5,
    );
    expect(series.ideal).toBeNull();
  });
});

describe('getPercentComplete', () => {
  it('follows the current/target convention, clamped', () => {
    expect(getPercentComplete(31, 50)).toBe(62);
    expect(getPercentComplete(120, 100)).toBe(100);
    expect(getPercentComplete(10, 0)).toBe(0);
  });
});

describe('getGoalMetrics', () => {
  const goal = {
    type: 'COUNT',
    initialValue: 0,
    target: 100,
    startDate: day(2026, 1, 1).toISOString(),
    targetDate: day(2026, 1, 10).toISOString(),
    currentValue: 30,
  };

  it('summarizes a paced goal', () => {
    const today = day(2026, 1, 4);
    const entries = [
      entry(day(2026, 1, 1), 10),
      entry(day(2026, 1, 2), 10),
      entry(day(2026, 1, 3), 10),
    ];
    const metrics = getGoalMetrics(goal, entries, today);

    expect(metrics.pace).toEqual({ kind: 'onPace' });
    expect(metrics.suggestedToday).toBe(10);
    expect(metrics.percentComplete).toBe(30);
    expect(metrics.streak).toBe(3);
    expect(metrics.loggedToday).toBe(false);
  });

  it('falls back to initialValue when currentValue is null', () => {
    const metrics = getGoalMetrics(
      { ...goal, initialValue: 20, currentValue: null },
      [],
      day(2026, 1, 1),
    );
    expect(metrics.percentComplete).toBe(20);
  });

  it('suggests a single unit for unlogged BOOLEAN goals', () => {
    const today = day(2026, 1, 4);
    const habit = { ...goal, type: 'BOOLEAN', target: 365 };

    expect(getGoalMetrics(habit, [], today).suggestedToday).toBe(1);
    expect(getGoalMetrics(habit, [entry(today, 1)], today).suggestedToday).toBe(
      0,
    );
  });

  it('flags loggedToday from any non-zero entry today', () => {
    const today = day(2026, 1, 4);
    expect(hasEntryOnDay([entry(today, 5)], today)).toBe(true);
    expect(getGoalMetrics(goal, [entry(today, 5)], today).loggedToday).toBe(
      true,
    );
  });
});
