import { useMemo } from "react";
import type { Metric } from "../types/dashboard";
import CircleMeter from "./CircleMeter";

type DetailedPanelProps = {
  metric: Metric;
};

type ChartPoint = {
  label: string;
  value: number;
  predicted?: boolean;
};

function getMetricHistory(metric: Metric): number[] {
  const current = metric.value;

  switch (metric.id) {
    case "ph":
      return [5.9, 6.0, 6.1, 6.15, 6.2];
    case "ec":
      return [1.5, 1.6, 1.7, 1.75, 1.8];
    case "water-temp":
      return [21.2, 21.6, 21.9, 22.1, 22.4];
    case "air-temp":
      return [26.2, 25.7, 25.4, 25.0, 24.8];
    case "humidity":
      return [58, 59, 60, 60.5, 61];
    case "water-level":
      return [82, 79, 77, 75, 73];
    default:
      return [current - 2, current - 1.2, current - 0.6, current - 0.2, current];
  }
}

function linearRegressionForecast(history: number[], count = 3): number[] {
  const n = history.length;
  const xs = history.map((_, index) => index);
  const sumX = xs.reduce((acc, value) => acc + value, 0);
  const sumY = history.reduce((acc, value) => acc + value, 0);
  const sumXY = history.reduce((acc, value, index) => acc + value * index, 0);
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

  const now = new Date();
  const roundedNow = new Date(now);
  const minutes = now.getMinutes();
  const roundedMinutes = minutes - (minutes % 20);

  roundedNow.setMinutes(roundedMinutes, 0, 0);

  const formatTimeLabel = (date: Date) =>
    date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const actualPoints = history.map((value, index) => {
    const pointTime = new Date(roundedNow);
    pointTime.setMinutes(
      roundedNow.getMinutes() - (history.length - 1 - index) * 20
    );

    return {
      label: formatTimeLabel(pointTime),
      value,
      predicted: false,
    };
  });

  const predictionPoints = predictions.map((value, index) => {
    const pointTime = new Date(roundedNow);
    pointTime.setMinutes(roundedNow.getMinutes() + (index + 1) * 20);

    return {
      label: formatTimeLabel(pointTime),
      value,
      predicted: true,
    };
  });

  return [...actualPoints, ...predictionPoints];
}

function getPolylinePoints(
  points: ChartPoint[],
  chartWidth: number,
  chartHeight: number,
  minValue: number,
  maxValue: number
) {
  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * chartWidth;
      const ratio = (point.value - minValue) / Math.max(maxValue - minValue, 1);
      const y = chartHeight - ratio * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

export default function DetailedPanel({ metric }: DetailedPanelProps) {
  const chartWidth = 640;
  const chartHeight = 260;

  const chartPoints = useMemo(() => buildChartPoints(metric), [metric]);
  const actualPoints = chartPoints.filter((point) => !point.predicted);
  const forecastPoints = chartPoints.filter((point) => point.predicted);

  const chartMin = Math.min(metric.min, ...chartPoints.map((point) => point.value));
  const chartMax = Math.max(metric.max, ...chartPoints.map((point) => point.value));

  const actualSegmentWidth =
    chartWidth *
    ((actualPoints.length - 1) / Math.max(chartPoints.length - 1, 1));

  const forecastSegmentWidth = chartWidth - actualSegmentWidth;

  const actualLine = getPolylinePoints(
    actualPoints,
    actualSegmentWidth,
    chartHeight,
    chartMin,
    chartMax
  );

  const forecastLine = getPolylinePoints(
    [actualPoints[actualPoints.length - 1], ...forecastPoints],
    forecastSegmentWidth,
    chartHeight,
    chartMin,
    chartMax
  );

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
      value: metric.lastUpdated,
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
            <span>Updated: {metric.lastUpdated}</span>
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
              <svg
                className="detail-panel__chart"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
              >
                {[0.25, 0.5, 0.75].map((ratio) => (
                  <line
                    key={ratio}
                    x1="0"
                    y1={chartHeight * ratio}
                    x2={chartWidth}
                    y2={chartHeight * ratio}
                    className="detail-panel__grid-line"
                  />
                ))}

                <polyline
                  fill="none"
                  points={actualLine}
                  className="detail-panel__line detail-panel__line--actual"
                />

                <g transform={`translate(${actualSegmentWidth}, 0)`}>
                  <polyline
                    fill="none"
                    points={forecastLine}
                    className="detail-panel__line detail-panel__line--forecast"
                  />
                </g>

                {chartPoints.map((point, index) => {
                  const x =
                    (index / Math.max(chartPoints.length - 1, 1)) * chartWidth;
                  const ratio =
                    (point.value - chartMin) / Math.max(chartMax - chartMin, 1);
                  const y = chartHeight - ratio * chartHeight;

                  return (
                    <circle
                      key={point.label}
                      cx={x}
                      cy={y}
                      r={point.predicted ? 4 : 5}
                      className={
                        point.predicted
                          ? "detail-panel__dot detail-panel__dot--forecast"
                          : "detail-panel__dot detail-panel__dot--actual"
                      }
                    />
                  );
                })}
              </svg>

              <div
                className="detail-panel__x-axis"
                style={{
                  gridTemplateColumns: `repeat(${chartPoints.length}, minmax(0, 1fr))`,
                }}
              >
                {chartPoints.map((point) => (
                  <span key={point.label}>{point.label}</span>
                ))}
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