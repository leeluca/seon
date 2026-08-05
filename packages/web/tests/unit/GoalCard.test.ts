import { afterEach, describe, expect, it, vi } from 'vitest';

import { getProgressStatus } from '~/features/goal/goalProgress';

describe('getProgressStatus', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps an untouched future goal on track', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1, 12));

    expect(
      getProgressStatus({
        currentValue: 10,
        initialValue: 10,
        target: 110,
        startDate: '2026-08-10',
        targetDate: '2026-08-31',
      }),
    ).toBe('onTrack');
  });
});
