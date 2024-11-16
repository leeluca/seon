import type { ChartData, ChartOptions } from 'chart.js';

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export interface LineGraphProps {
  data: ChartData<'line', number[], string | string[]>;
  options?: ChartOptions<'line'>;
}
export const LineGraph = ({ data, options }: LineGraphProps) => {
  return <Line data={data} options={options} />;
};
