import type { CSSProperties } from 'react';

import type { EChartsOption } from './echarts';
import { ReactEChartsCore, echarts } from './echarts';

export interface LineGraphProps {
  option: EChartsOption;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

export const LineGraph = ({
  option,
  height = 320,
  className,
  style,
}: LineGraphProps) => {
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
