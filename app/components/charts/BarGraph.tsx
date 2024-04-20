import type { ChartData } from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarGraphProps {
  data: ChartData<"bar", number[], string>;
}
export const BarGraph = ({ data }: BarGraphProps) => {
  return <Bar data={data} />;
};
