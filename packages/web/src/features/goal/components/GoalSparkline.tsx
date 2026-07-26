import type { SparklineSeries } from '~/data/domain/goalMetrics';
import { cn } from '~/utils';

const WIDTH = 100;
const HEIGHT = 32;
const PAD = 2;

/**
 * The card's line: cumulative progress over the trailing window as an area
 * chart, with the dashed pace expectation behind it. The endpoint dot is a
 * positioned element so it stays round while the SVG stretches.
 */
export function GoalSparkline({
  series,
  className,
}: {
  series: SparklineSeries;
  className?: string;
}) {
  const { values, ideal } = series;

  if (values.length < 2) return null;

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (ideal) {
    min = Math.min(min, ideal.start);
    max = Math.max(max, ideal.end);
  }
  if (max === min) max = min + 1;

  const x = (index: number) =>
    PAD + (index * (WIDTH - 2 * PAD)) / (values.length - 1);
  const y = (value: number) =>
    HEIGHT - PAD - ((value - min) * (HEIGHT - 2 * PAD)) / (max - min);

  const lastIndex = values.length - 1;
  const points = values
    .map((value, index) => `${x(index).toFixed(2)},${y(value).toFixed(2)}`)
    .join(' ');
  const area = `${x(0).toFixed(2)},${HEIGHT - PAD} ${points} ${x(lastIndex).toFixed(2)},${HEIGHT - PAD}`;

  return (
    <div className={cn('relative h-14 w-full', className)} aria-hidden="true">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="presentation"
      >
        <polygon points={area} className="fill-primary/10" />
        {ideal && (
          <line
            x1={x(0)}
            y1={y(ideal.start)}
            x2={x(lastIndex)}
            y2={y(ideal.end)}
            className="stroke-chart-2"
            strokeWidth={1.2}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <polyline
          points={points}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className="bg-primary absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${(x(lastIndex) / WIDTH) * 100}%`,
          top: `${(y(values[lastIndex]) / HEIGHT) * 100}%`,
        }}
      />
    </div>
  );
}
