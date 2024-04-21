import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface LineGraphProps {
  data: ChartData<"line", number[], string>;
  options: ChartOptions<"line">;
}
export const LineGraph = ({ data, options }: LineGraphProps) => {
  return <Line data={data} options={options} />;
};
