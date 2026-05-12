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
import type { Metric } from "../types/dashboard";
import { buildChartData, buildChartPoints, type ChartDatum } from "../lib/metric-history-chart";

type MetricHistoryChartProps = {
  metric: Metric;
};

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartDatum }>;
  label?: string;
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
      <p>{label}</p>
      <strong>
        {point.value.toFixed(2)}
        {unit}
      </strong>
      <span>{point.predicted ? "Forecast" : "Actual reading"}</span>
    </div>
  );
}

export default function MetricHistoryChart({ metric }: MetricHistoryChartProps) {
  const chartPoints = useMemo(() => buildChartPoints(metric), [metric]);
  const chartData = useMemo(() => buildChartData(chartPoints), [chartPoints]);

  const chartMin = Math.min(metric.min, ...chartPoints.map((point) => point.value));
  const chartMax = Math.max(metric.max, ...chartPoints.map((point) => point.value));
  const yAxisPadding = Math.max((chartMax - chartMin) * 0.12, 1);

  return (
    <div className="detail-panel__chart-wrap">
      <div className="detail-panel__chart">
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
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: "var(--primary)", strokeOpacity: 0.2, strokeWidth: 1 }}
              content={<ChartTooltip unit={metric.unit} />}
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

      <div className="detail-panel__chart-footnote">
        <span>Shaded band marks the ideal operating range.</span>
        <span>Hover or tap the chart to inspect each reading.</span>
      </div>
    </div>
  );
}
