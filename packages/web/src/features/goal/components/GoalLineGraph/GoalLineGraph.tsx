import { useEffect, useMemo, useState } from 'react';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useSuspenseQuery } from '@tanstack/react-query';
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
  const { data: entries } = useSuspenseQuery(ENTRIES.goalId(goalId));
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

  const option =
    graphConfig.optionsByMode[mode]?.option ??
    graphConfig.optionsByMode[graphConfig.defaultMode]?.option;

  // TODO: use constant for heights (graph height + slider)
  const graphHeight = resolvedMobile ? 320 : 340;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <IntervalSwitcher active={mode} onChange={setMode} />
      </div>
      <LineGraph key={mode} option={option} height={graphHeight} />
    </div>
  );
}

export default GoalLineGraph;
