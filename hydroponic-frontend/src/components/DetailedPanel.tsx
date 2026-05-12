import { useEffect, useMemo, useState } from "react";
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
import type { Metric, MetricHistoryPoint } from "../types/dashboard";
import CircleMeter from "./CircleMeter";
import { formatLastUpdated } from "../data/metrics";

type DetailedPanelProps = {
  metric: Metric;
};

type ChartPoint = {
  timestamp: string;
  label: string;
  value: number;
  predicted?: boolean;
};

type ChartDatum = {
  timestamp: string;
  label: string;
  actual: number | null;
  forecast: number | null;
  value: number;
  predicted: boolean;
};

function formatTimeLabel(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getMetricHistory(metric: Metric): MetricHistoryPoint[] {
  if (metric.history && metric.history.length > 1) {
    return metric.history.slice(-8);
  }

  const current = metric.value;
  const now = Date.now();
  const fallbackValues = [current - 2, current - 1.2, current - 0.6, current - 0.2, current];

  return fallbackValues.map((value, index) => ({
    timestamp: new Date(now - (fallbackValues.length - 1 - index) * 20 * 60_000).toISOString(),
    value,
  }));
}

function linearRegressionForecast(history: MetricHistoryPoint[], count = 3): number[] {
  const n = history.length;
  const xs = history.map((_, index) => index);
  const values = history.map((point) => point.value);
  const sumX = xs.reduce((acc, value) => acc + value, 0);
  const sumY = values.reduce((acc, value) => acc + value, 0);
  const sumXY = values.reduce((acc, value, index) => acc + value * index, 0);
  const sumXX = xs.reduce((acc, value) => acc + value * value, 0);

  const denominator = n * sumXX - sumX * sumX || 1;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return Array.from({ length: count }, (_, offset) => {
    const x = n + offset;
    return Number((slope * x + intercept).toFixed(2));
  });
}

function buildChartPoints(metric: Metric): ChartPoint[] {
  const history = getMetricHistory(metric);
  const predictions = linearRegressionForecast(history, 3);
  const actualPoints = history.map((point) => ({
    timestamp: point.timestamp,
    label: formatTimeLabel(point.timestamp),
    value: point.value,
    predicted: false,
  }));

  const lastTimestamp = new Date(history[history.length - 1]?.timestamp ?? Date.now());
  const previousTimestamp = new Date(history[history.length - 2]?.timestamp ?? lastTimestamp);
  const intervalMs = Math.max(lastTimestamp.getTime() - previousTimestamp.getTime(), 20 * 60_000);

  const predictionPoints = predictions.map((value, index) => {
    const timestamp = new Date(lastTimestamp.getTime() + (index + 1) * intervalMs).toISOString();

    return {
      timestamp,
      label: formatTimeLabel(timestamp),
      value,
      predicted: true,
    };
  });

  return [...actualPoints, ...predictionPoints];
}

function buildChartData(chartPoints: ChartPoint[]): ChartDatum[] {
  const firstPredictionIndex = chartPoints.findIndex((point) => point.predicted);
  const forecastAnchorIndex = firstPredictionIndex > 0 ? firstPredictionIndex - 1 : -1;

  return chartPoints.map((point, index) => ({
    timestamp: point.timestamp,
    label: point.label,
    actual: point.predicted ? null : point.value,
    forecast: point.predicted || index === forecastAnchorIndex ? point.value : null,
    value: point.value,
    predicted: Boolean(point.predicted),
  }));
}

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

export default function DetailedPanel({ metric }: DetailedPanelProps) {
  const [, setRefreshTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRefreshTick((value) => value + 1);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const chartPoints = useMemo(() => buildChartPoints(metric), [metric]);
  const chartData = useMemo(() => buildChartData(chartPoints), [chartPoints]);

  const chartMin = Math.min(metric.min, ...chartPoints.map((point) => point.value));
  const chartMax = Math.max(metric.max, ...chartPoints.map((point) => point.value));
  const yAxisPadding = Math.max((chartMax - chartMin) * 0.12, 1);

  const liveLastUpdated = formatLastUpdated(metric.lastUpdated);

  const stats = [
    {
      label: "Current Value",
      value: `${metric.value}${metric.unit}`,
    },
    {
      label: "Ideal Range",
      value: `${metric.idealMin} - ${metric.idealMax}${metric.unit}`,
    },
    {
      label: "Status",
      value: metric.statusText,
    },
    {
      label: "Last Update",
      value: liveLastUpdated,
    },
  ];

  return (
    <section className="detail-panel">
      <div className="detail-panel__header">
        <div>
          <p className="detail-panel__eyebrow">Detailed View</p>
          <h2>{metric.title}</h2>
          <p className="detail-panel__description">{metric.description}</p>
        </div>

        <span className="detail-panel__status-chip">{metric.statusText}</span>
      </div>

      <div className="detail-panel__layout">
        <aside className="detail-panel__meter-card">
          <div className="detail-panel__meter-head">
            <p className="detail-panel__section-label">Live Meter</p>
            <h3>{metric.shortLabel}</h3>
          </div>

          <CircleMeter
            value={metric.value}
            min={metric.min}
            max={metric.max}
            label={metric.shortLabel}
            unit={metric.unit}
            size="lg"
          />

          <div className="detail-panel__meter-meta">
            <span>
              Ideal: {metric.idealMin} - {metric.idealMax}
              {metric.unit}
            </span>
            <span>Updated: {liveLastUpdated}</span>
          </div>
        </aside>

        <div className="detail-panel__content">
          <div className="detail-panel__chart-card">
            <div className="detail-panel__chart-head">
              <div>
                <p className="detail-panel__section-label">Metric Trend</p>
                <h3>{metric.title} history and prediction</h3>
              </div>

              <div className="detail-panel__legend">
                <span>
                  <i className="detail-panel__legend-line" />
                  Actual
                </span>
                <span>
                  <i className="detail-panel__legend-line detail-panel__legend-line--dashed" />
                  Linear Regression
                </span>
              </div>
            </div>

            <div className="detail-panel__chart-wrap">
              <div className="detail-panel__chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 8, bottom: 0, left: 0 }}
                  >
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
          </div>

          <div className="detail-panel__stats-grid">
            {stats.map((item) => (
              <article key={item.label} className="detail-panel__stat-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
