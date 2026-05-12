import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Metric, TimeRange } from "../types/dashboard";
import { buildChartData, buildChartPoints, type ChartDatum } from "../lib/metric-history-chart";

type MetricHistoryChartProps = {
  metric: Metric;
  timeRange: TimeRange;
};

function getChartMinWidthRem(timeRange: TimeRange, pointCount: number) {
  const settings = {
    hourly: { base: 42, perPoint: 3.4 },
    daily: { base: 52, perPoint: 4.6 },
    weekly: { base: 60, perPoint: 5.4 },
  } satisfies Record<TimeRange, { base: number; perPoint: number }>;

  const { base, perPoint } = settings[timeRange];
  return Math.max(base, pointCount * perPoint);
}

function formatAxisTick(value: number) {
  const rounded = Number(value.toFixed(2));

  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }

  return rounded.toString();
}

function ChartTooltip({
  active,
  payload,
  timeRange,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartDatum }>;
  timeRange: TimeRange;
  unit: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload as ChartDatum | undefined;

  if (!point) {
    return null;
  }

  return (
    <div className="detail-panel__tooltip">
      <p>{new Date(point.timestamp).toLocaleString([], getTooltipDateFormat(timeRange))}</p>
      <strong>
        {point.value.toFixed(2)}
        {unit}
      </strong>
      <span>{point.predicted ? "Forecast" : "Actual reading"}</span>
    </div>
  );
}

function getTooltipDateFormat(timeRange: TimeRange): Intl.DateTimeFormatOptions {
  if (timeRange === "hourly") {
    return {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    };
  }

  if (timeRange === "daily") {
    return {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    };
  }

  return {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
}

export default function MetricHistoryChart({ metric, timeRange }: MetricHistoryChartProps) {
  const chartPoints = useMemo(() => buildChartPoints(metric, timeRange), [metric, timeRange]);
  const chartData = useMemo(() => buildChartData(chartPoints), [chartPoints]);
  const chartMinWidthRem = useMemo(
    () => getChartMinWidthRem(timeRange, chartData.length),
    [chartData.length, timeRange]
  );

  const chartMin = Math.min(metric.min, ...chartPoints.map((point) => point.value));
  const chartMax = Math.max(metric.max, ...chartPoints.map((point) => point.value));
  const yAxisPadding = Math.max((chartMax - chartMin) * 0.12, 1);

  return (
    <div className="detail-panel__chart-wrap">
      <div className="detail-panel__chart-scroll">
        <div
          className="detail-panel__chart"
          style={{ width: `max(100%, ${chartMinWidthRem}rem)` }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid
                stroke="color-mix(in srgb, var(--text-muted) 18%, transparent)"
                strokeDasharray="4 8"
                vertical={false}
              />
              <ReferenceArea
                y1={metric.idealMin}
                y2={metric.idealMax}
                fill="var(--primary)"
                fillOpacity={0.08}
                ifOverflow="extendDomain"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={20}
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              />
              <YAxis
                domain={[chartMin - yAxisPadding, chartMax + yAxisPadding]}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                width={52}
                tickFormatter={formatAxisTick}
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ stroke: "var(--primary)", strokeOpacity: 0.2, strokeWidth: 1 }}
                content={<ChartTooltip timeRange={timeRange} unit={metric.unit} />}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="var(--primary)"
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "var(--primary)" }}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Linear Regression"
                stroke="var(--primary)"
                strokeWidth={3}
                strokeDasharray="8 7"
                dot={{ r: 3.5, fill: "var(--surface)", stroke: "var(--primary)", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "var(--surface)", stroke: "var(--primary)", strokeWidth: 2 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="detail-panel__chart-footnote">
        <span>Shaded band marks the ideal operating range.</span>
        <span>Hover or tap the chart to inspect each reading.</span>
      </div>
    </div>
  );
}
