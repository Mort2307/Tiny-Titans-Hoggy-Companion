import { useId, useMemo } from "react";
import type { WeightRecord } from "../types/Weight";
import { useUnits } from "../context/UnitContextValue";

type WeightChartProps = {
  history: WeightRecord[];
  compact?: boolean;
};

type ChartPoint = {
  date: string;
  label: string;
  displayWeight: number;
};

const OUNCES_PER_GRAM = 1 / 28.349523125;

function recordWeightInGrams(record: WeightRecord): number {
  return record.unit === "kg" ? record.weight * 1000 : record.weight;
}

function formatChartDate(value: string): string {
  const parsed = new Date(value + "T00:00:00");
  if (!Number.isFinite(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function formatChartWeight(value: number, unit: string): string {
  const decimals = Math.abs(value) >= 100 ? 0 : 1;
  return value.toFixed(decimals) + " " + unit;
}

export default function WeightChart({ history, compact = false }: WeightChartProps) {
  const { isImperial, weightUnit } = useUnits();
  const gradientId = useId().replace(/:/g, "");

  const chartData = useMemo<ChartPoint[]>(() => {
    return [...(history ?? [])]
      .map((record) => {
        const grams = recordWeightInGrams(record);
        const displayWeight = isImperial ? grams * OUNCES_PER_GRAM : grams;
        return {
          date: record.date,
          label: formatChartDate(record.date),
          displayWeight,
        };
      })
      .filter((point) => Number.isFinite(point.displayWeight) && point.displayWeight > 0)
      .sort(
        (a, b) =>
          new Date(a.date + "T00:00:00").getTime() -
          new Date(b.date + "T00:00:00").getTime(),
      );
  }, [history, isImperial]);

  if (chartData.length < 2) {
    return (
      <div className="weight-chart-empty">
        Add another weight record to unlock the growth chart.
      </div>
    );
  }

  const width = compact ? 620 : 760;
  const height = compact ? 210 : 320;
  const margin = compact
    ? { top: 16, right: 18, bottom: 42, left: 58 }
    : { top: 20, right: 24, bottom: 48, left: 66 };

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const values = chartData.map((point) => point.displayWeight);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const rawRange = maxValue - minValue;
  const padding = rawRange === 0
    ? Math.max(maxValue * 0.08, isImperial ? 0.25 : 2)
    : rawRange * 0.16;
  const yMin = Math.max(0, minValue - padding);
  const yMax = Math.max(yMin + 1, maxValue + padding);
  const yRange = yMax - yMin;

  const points = chartData.map((point, index) => {
    const x =
      margin.left +
      (index / Math.max(1, chartData.length - 1)) * plotWidth;
    const y =
      margin.top +
      ((yMax - point.displayWeight) / yRange) * plotHeight;
    return { ...point, x, y };
  });

  const linePath = points
    .map((point, index) => (index === 0 ? "M " : "L ") + point.x.toFixed(2) + " " + point.y.toFixed(2))
    .join(" ");

  const baselineY = margin.top + plotHeight;
  const areaPath =
    "M " +
    points[0].x.toFixed(2) +
    " " +
    baselineY.toFixed(2) +
    " L " +
    points.map((point) => point.x.toFixed(2) + " " + point.y.toFixed(2)).join(" L ") +
    " L " +
    points[points.length - 1].x.toFixed(2) +
    " " +
    baselineY.toFixed(2) +
    " Z";

  const yTicks = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    const value = yMax - yRange * ratio;
    return {
      value,
      y: margin.top + plotHeight * ratio,
    };
  });

  const xTickIndexes = Array.from(
    new Set([0, Math.floor((chartData.length - 1) / 2), chartData.length - 1]),
  );

  const latest = points[points.length - 1];
  const first = points[0];
  const delta = latest.displayWeight - first.displayWeight;

  return (
    <div
      className={compact ? "weight-chart-container tt-native-weight-chart compact" : "weight-chart-container weight-chart-container--detail tt-native-weight-chart"}
      data-weight-chart="native-svg"
    >
      <svg
        viewBox={"0 0 " + width + " " + height}
        role="img"
        aria-label={
          "Weight growth chart with " +
          chartData.length +
          " records from " +
          first.label +
          " to " +
          latest.label
        }
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          minHeight: compact ? 170 : 230,
          overflow: "visible",
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d5aa4b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d5aa4b" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={margin.left}
              y1={tick.y}
              x2={width - margin.right}
              y2={tick.y}
              stroke="rgba(255,255,255,0.09)"
              strokeWidth="1"
            />
            <text
              x={margin.left - 10}
              y={tick.y + 4}
              textAnchor="end"
              fill="#a5a7a1"
              fontSize={compact ? 18 : 16}
              fontWeight="700"
            >
              {formatChartWeight(tick.value, weightUnit)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={"url(#" + gradientId + ")"} />
        <path
          d={linePath}
          fill="none"
          stroke="#d5aa4b"
          strokeWidth={compact ? 4 : 4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => {
          const isLatest = index === points.length - 1;
          return (
            <g key={point.date + "-" + index}>
              <circle
                cx={point.x}
                cy={point.y}
                r={isLatest ? 6 : compact ? 3.5 : 4}
                fill={isLatest ? "#f1c55b" : "#20180a"}
                stroke="#d5aa4b"
                strokeWidth={isLatest ? 3 : 2}
              >
                <title>
                  {point.label + ": " + formatChartWeight(point.displayWeight, weightUnit)}
                </title>
              </circle>
            </g>
          );
        })}

        {xTickIndexes.map((index) => {
          const point = points[index];
          return (
            <text
              key={point.date + "-label"}
              x={point.x}
              y={height - 15}
              textAnchor={
                index === 0
                  ? "start"
                  : index === chartData.length - 1
                    ? "end"
                    : "middle"
              }
              fill="#a5a7a1"
              fontSize={compact ? 18 : 16}
              fontWeight="700"
            >
              {point.label}
            </text>
          );
        })}
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          marginTop: compact ? 4 : 8,
          color: "var(--tt-track-muted, #a5a7a1)",
          fontSize: compact ? ".72rem" : ".78rem",
          fontWeight: 750,
        }}
      >
        <span>
          Start {formatChartWeight(first.displayWeight, weightUnit)}
        </span>
        <span style={{ color: "var(--tt-track-accent, #d5aa4b)" }}>
          {delta >= 0 ? "+" : ""}
          {formatChartWeight(delta, weightUnit)}
        </span>
        <span>
          Latest {formatChartWeight(latest.displayWeight, weightUnit)}
        </span>
      </div>
    </div>
  );
}
