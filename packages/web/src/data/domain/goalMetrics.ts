import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfDay,
  subDays,
} from 'date-fns';

import type { Database } from '~/data/db/AppSchema';

/**
 * Pure calculations that turn a goal and its entries into the derived facts
 * the UI presents: pace status, today's suggested amount, projected finish,
 * consistency, and streak.
 *
 * Conventions shared with the rest of the app:
 * - Day boundaries are local time (recordEntry dedupes per local day).
 * - PROGRESS goals track an absolute value (latest entry wins);
 *   COUNT/BOOLEAN goals accumulate entry values on top of initialValue.
 * - Values are assumed to grow toward the target.
 */

export type EntryLike = Pick<Database['entry'], 'date' | 'value'>;

export type PaceStatus =
  | { kind: 'completed' }
  | { kind: 'notStarted' }
  | { kind: 'onPace' }
  | { kind: 'ahead'; days: number }
  | { kind: 'behind'; days: number };

export interface PaceGoalInput {
  initialValue: number;
  target: number;
  startDate: string | Date;
  targetDate: string | Date;
  currentValue: number;
}

const DAY_KEY_FORMAT = 'yyyy-MM-dd';

const dayKey = (date: Date) => format(date, DAY_KEY_FORMAT);

const toDayStart = (value: string | Date) => startOfDay(new Date(value));

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Distinct local days that have at least one non-zero entry. */
const activeDayKeys = (entries: EntryLike[]) => {
  const days = new Set<string>();
  for (const entry of entries) {
    if (entry.value !== 0) days.add(dayKey(new Date(entry.date)));
  }
  return days;
};

/**
 * Where the goal stands against the straight line from (startDate,
 * initialValue) to (targetDate, target).
 *
 * The expectation is measured at the *start* of today: on day one — or any
 * morning after fully logged days — the status is on pace, not behind. A day
 * only counts against you once it has actually passed unlogged.
 */
export function getPaceStatus(
  goal: PaceGoalInput,
  today: Date = new Date(),
): PaceStatus {
  const { initialValue, target, currentValue } = goal;

  if (currentValue >= target) return { kind: 'completed' };

  const start = toDayStart(goal.startDate);
  const end = toDayStart(goal.targetDate);
  const day = startOfDay(today);

  if (day < start) return { kind: 'notStarted' };

  const totalDays = differenceInCalendarDays(end, start) + 1;
  const perDay = (target - initialValue) / Math.max(totalDays, 1);

  if (perDay <= 0) return { kind: 'onPace' };

  const elapsedBeforeToday = clamp(
    differenceInCalendarDays(day, start),
    0,
    totalDays,
  );
  const expectedByToday = initialValue + perDay * elapsedBeforeToday;
  const gapDays = Math.round((expectedByToday - currentValue) / perDay);

  if (gapDays >= 1) return { kind: 'behind', days: gapDays };
  if (gapDays <= -1) return { kind: 'ahead', days: -gapDays };
  return { kind: 'onPace' };
}

/**
 * The amount to log today to stay on track, spreading any accumulated gap
 * over the remaining days (self-correcting: it never demands the whole gap
 * at once).
 *
 * For COUNT/BOOLEAN goals this is a delta ("do 13 today"); for PROGRESS
 * goals it is the absolute value to reach today ("get to 23").
 * Returns 0 once the target is met.
 */
export function getSuggestedToday(
  goal: PaceGoalInput & { type: string },
  today: Date = new Date(),
): number {
  const { target, currentValue } = goal;
  const remaining = target - currentValue;

  if (remaining <= 0) return 0;

  const start = toDayStart(goal.startDate);
  const end = toDayStart(goal.targetDate);
  const day = startOfDay(today);
  const effectiveFrom = day > start ? day : start;
  const daysLeft = Math.max(
    differenceInCalendarDays(end, effectiveFrom) + 1,
    1,
  );
  const perDay = remaining / daysLeft;

  return goal.type === 'PROGRESS'
    ? Math.ceil(currentValue + perDay)
    : Math.ceil(perDay);
}

/**
 * Progress gained within the trailing window of `windowDays` local days
 * (inclusive of today). Entries dated after today are ignored.
 */
function gainedInWindow(
  entries: EntryLike[],
  goal: { type: string; initialValue: number },
  today: Date,
  windowDays: number,
): number {
  const day = startOfDay(today);
  const windowStart = subDays(day, windowDays - 1);

  if (goal.type === 'PROGRESS') {
    let latest: { time: number; value: number } | null = null;
    let baseline: { time: number; value: number } | null = null;

    for (const entry of entries) {
      const entryDay = toDayStart(entry.date);
      const time = entryDay.getTime();
      if (entryDay > day) continue;
      if (!latest || time > latest.time) latest = { time, value: entry.value };
      if (entryDay < windowStart && (!baseline || time > baseline.time)) {
        baseline = { time, value: entry.value };
      }
    }

    if (!latest) return 0;
    return latest.value - (baseline?.value ?? goal.initialValue);
  }

  let sum = 0;
  for (const entry of entries) {
    const entryDay = toDayStart(entry.date);
    if (entryDay >= windowStart && entryDay <= day) sum += entry.value;
  }
  return sum;
}

/**
 * When the goal would be reached at the recent (trailing-window) rate.
 * Returns null when there is no recent progress to project from, or the
 * goal is already met. Suits dateless goals; works for any goal.
 */
export function getProjectedFinish(
  goal: { type: string; initialValue: number; target: number },
  entries: EntryLike[],
  currentValue: number,
  today: Date = new Date(),
  windowDays = 30,
): Date | null {
  const remaining = goal.target - currentValue;
  if (remaining <= 0) return null;

  const gained = gainedInWindow(entries, goal, today, windowDays);
  if (gained <= 0) return null;

  const perDay = gained / windowDays;
  return addDays(startOfDay(today), Math.ceil(remaining / perDay));
}

/**
 * How many of the trailing `windowDays` local days (inclusive of today)
 * have at least one non-zero entry. A missed day dents
 * the rate, it never resets anything.
 */
export function getConsistency(
  entries: EntryLike[],
  today: Date = new Date(),
  windowDays = 30,
): { done: number; windowDays: number } {
  const days = activeDayKeys(entries);
  const day = startOfDay(today);
  let done = 0;

  for (let i = 0; i < windowDays; i++) {
    if (days.has(dayKey(subDays(day, i)))) done++;
  }
  return { done, windowDays };
}

/**
 * Consecutive active days ending today — or yesterday, so the streak is
 * still "alive" before today's log.
 */
export function getStreak(entries: EntryLike[], today: Date = new Date()) {
  const days = activeDayKeys(entries);
  let cursor = startOfDay(today);

  if (!days.has(dayKey(cursor))) cursor = subDays(cursor, 1);

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export interface SparklineSeries {
  /** Cumulative value at the end of each of the trailing window's days. */
  values: number[];
  /** Endpoints of the linear expectation over the same window, if paced. */
  ideal: { start: number; end: number } | null;
}

/**
 * Daily cumulative series over the trailing `windowDays` local days
 * (inclusive of today), plus the pace line's endpoints over the same
 * window — the data a card sparkline draws.
 */
export function getSparklineSeries(
  goal: {
    type: string;
    initialValue: number;
    target: number;
    startDate: string | Date;
    targetDate: string | Date;
  },
  entries: EntryLike[],
  today: Date = new Date(),
  windowDays = 30,
): SparklineSeries {
  const day = startOfDay(today);
  const windowStart = subDays(day, windowDays - 1);
  const values: number[] = [];

  if (goal.type === 'PROGRESS') {
    const readings = entries
      .map((entry) => ({ day: toDayStart(entry.date), value: entry.value }))
      .filter((reading) => reading.day <= day)
      .sort((a, b) => a.day.getTime() - b.day.getTime());

    let value = goal.initialValue;
    let next = 0;
    for (let i = 0; i < windowDays; i++) {
      const current = addDays(windowStart, i);
      while (next < readings.length && readings[next].day <= current) {
        value = readings[next].value;
        next++;
      }
      values.push(value);
    }
  } else {
    let baseline = goal.initialValue;
    const sumsByDay = new Map<string, number>();
    for (const entry of entries) {
      const entryDay = toDayStart(entry.date);
      if (entryDay > day) continue;
      if (entryDay < windowStart) {
        baseline += entry.value;
      } else {
        const key = dayKey(entryDay);
        sumsByDay.set(key, (sumsByDay.get(key) ?? 0) + entry.value);
      }
    }

    let running = baseline;
    for (let i = 0; i < windowDays; i++) {
      running += sumsByDay.get(dayKey(addDays(windowStart, i))) ?? 0;
      values.push(running);
    }
  }

  const start = toDayStart(goal.startDate);
  const end = toDayStart(goal.targetDate);
  const totalDays = differenceInCalendarDays(end, start) + 1;
  const perDay = (goal.target - goal.initialValue) / Math.max(totalDays, 1);

  let ideal: SparklineSeries['ideal'] = null;
  if (perDay > 0) {
    const idealAt = (date: Date) =>
      goal.initialValue +
      perDay * clamp(differenceInCalendarDays(date, start), 0, totalDays);
    ideal = { start: idealAt(windowStart), end: idealAt(day) };
  }

  return { values, ideal };
}

/** Whether any non-zero entry exists on the given local day. */
export function hasEntryOnDay(
  entries: EntryLike[],
  day: Date = new Date(),
): boolean {
  return activeDayKeys(entries).has(dayKey(day));
}

/** Percent of target reached, clamped to 0–100 (existing card convention). */
export function getPercentComplete(currentValue: number, target: number) {
  if (target <= 0) return 0;
  return clamp((currentValue / target) * 100, 0, 100);
}

export type GoalMetricsGoal = Pick<
  Database['goal'],
  'type' | 'initialValue' | 'target' | 'startDate' | 'targetDate'
> & { currentValue: number | null };

export interface GoalMetrics {
  percentComplete: number;
  pace: PaceStatus;
  /** Delta to log today (COUNT/BOOLEAN) or absolute value to reach (PROGRESS). */
  suggestedToday: number;
  projectedFinishDate: Date | null;
  consistency: { done: number; windowDays: number };
  streak: number;
  loggedToday: boolean;
}

/** One-stop summary for cards and the Today view. */
export function getGoalMetrics(
  goal: GoalMetricsGoal,
  entries: EntryLike[],
  today: Date = new Date(),
): GoalMetrics {
  const currentValue = goal.currentValue ?? goal.initialValue;
  const paceInput = { ...goal, currentValue };
  const loggedToday = hasEntryOnDay(entries, today);
  const isBoolean = goal.type === 'BOOLEAN';
  const completed = currentValue >= goal.target;

  return {
    percentComplete: getPercentComplete(currentValue, goal.target),
    pace: getPaceStatus(paceInput, today),
    suggestedToday: isBoolean
      ? loggedToday || completed
        ? 0
        : 1
      : getSuggestedToday(paceInput, today),
    projectedFinishDate: getProjectedFinish(goal, entries, currentValue, today),
    consistency: getConsistency(entries, today),
    streak: getStreak(entries, today),
    loggedToday,
  };
}
