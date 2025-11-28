import type { CSSProperties } from 'react';

import type { EChartsOption } from './echarts';
import { ReactEChartsCore, echarts } from './echarts';

interface BarGraphProps {
  option: EChartsOption;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

export const BarGraph = ({
  option,
  height = 280,
  className,
  style,
}: BarGraphProps) => {
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      className={className}
      style={{ width: '100%', height, ...style }}
      opts={{ renderer: 'canvas' }}
    />
  );
};
