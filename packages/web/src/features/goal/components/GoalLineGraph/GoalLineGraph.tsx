import { useEffect, useMemo, useState } from 'react';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { ChartLineIcon } from 'lucide-react';

import { ENTRIES } from '~/constants/query';
import type { GoalType } from '~/features/goal/model';
import { LineGraph } from '~/shared/components/common/charts/LineGraph';
import { Button } from '~/shared/components/ui/button';
import { useViewportStore } from '~/states/stores/viewportStore';
import {
  buildGoalLineGraphOptions,
  getModeLabels,
  MODE_ORDER,
  type IntervalMode,
} from './logic';

interface GoalLineGraphProps {
  goalId: string;
  target: number;
  targetDate: string;
  startDate: string;
  initialValue: number;
  goalType: GoalType;
  isMobile?: boolean;
}

const ChartLegend = ({ showAfterTarget }: { showAfterTarget: boolean }) => (
  <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
    <span className="flex items-center gap-1.5">
      <span className="bg-primary h-0.5 w-4 rounded-full" aria-hidden="true" />
      <Trans>Your Progress</Trans>
    </span>
    <span className="flex items-center gap-1.5">
      <span
        className="border-chart-2 w-4 border-t-2 border-dashed"
        aria-hidden="true"
      />
      <Trans>Goal Benchmark</Trans>
    </span>
    {showAfterTarget && (
      <span className="flex items-center gap-1.5">
        <span
          className="bg-warning h-0.5 w-4 rounded-full"
          aria-hidden="true"
        />
        <Trans>After target date</Trans>
      </span>
    )}
  </div>
);

const IntervalSwitcher = ({
  active,
  onChange,
}: {
  active: IntervalMode;
  onChange: (mode: IntervalMode) => void;
}) => {
  const modeLabels = getModeLabels();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {MODE_ORDER.map((mode) => {
        const isActive = active === mode;
        return (
          <Button
            key={mode}
            size="sm"
            variant={isActive ? 'secondary' : 'ghost'}
            onClick={() => onChange(mode)}
            aria-pressed={isActive}
            className="px-3"
          >
            {modeLabels[mode]}
          </Button>
        );
      })}
    </div>
  );
};

function GoalLineGraph({
  goalId,
  target,
  targetDate,
  startDate,
  initialValue,
  isMobile,
  goalType,
}: GoalLineGraphProps) {
  const { i18n } = useLingui();
  const {
    data: entries = [],
    error,
    isPending,
  } = useQuery(ENTRIES.goalId(goalId));
  const isMobileViewport = useViewportStore((state) => state.isMobile);
  const resolvedMobile = isMobile ?? isMobileViewport;

  const graphConfig = useMemo(
    () =>
      buildGoalLineGraphOptions({
        entries,
        target,
        targetDate,
        startDate,
        initialValue,
        goalType,
        locale: i18n.locale,
        isMobile: resolvedMobile,
      }),
    [
      entries,
      goalType,
      initialValue,
      i18n.locale,
      resolvedMobile,
      startDate,
      target,
      targetDate,
    ],
  );

  const [mode, setMode] = useState<IntervalMode>(graphConfig.defaultMode);

  useEffect(() => {
    setMode(graphConfig.defaultMode);
  }, [graphConfig.defaultMode]);

  if (error) {
    throw error;
  }

  if (isPending) {
    return null;
  }

  if (!entries.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <ChartLineIcon size={28} />
          <p className="text-lg">
            <Trans>Your progress graph will be shown here</Trans>
          </p>
        </div>
        <p className="text-md text-muted-foreground">
          <Trans>Add your first entry to start</Trans>
        </p>
      </div>
    );
  }

  const activeGraph =
    graphConfig.optionsByMode[mode] ??
    graphConfig.optionsByMode[graphConfig.defaultMode];
  const option = activeGraph?.option;

  // TODO: use constant for heights (graph height + slider)
  const graphHeight = resolvedMobile ? 320 : 340;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChartLegend showAfterTarget={activeGraph?.hasAfterTarget ?? false} />
        <IntervalSwitcher active={mode} onChange={setMode} />
      </div>
      <LineGraph key={mode} option={option} height={graphHeight} />
    </div>
  );
}

export default GoalLineGraph;
