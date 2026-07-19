import ReactEChartsCore from 'echarts-for-react/esm/core.js';
import {
  BarChart,
  LineChart,
  type BarSeriesOption,
  type LineSeriesOption,
} from 'echarts/charts';
import {
  DatasetComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  type DatasetComponentOption,
  type DataZoomComponentOption,
  type GridComponentOption,
  type LegendComponentOption,
  type TitleComponentOption,
  type TooltipComponentOption,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export type EChartsOption = echarts.ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | DatasetComponentOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | TitleComponentOption
  | DataZoomComponentOption
>;

export { echarts, ReactEChartsCore };
