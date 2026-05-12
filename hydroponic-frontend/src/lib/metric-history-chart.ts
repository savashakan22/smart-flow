import type { Metric, MetricHistoryPoint } from "../types/dashboard";

export type ChartPoint = {
  timestamp: string;
  label: string;
  value: number;
  predicted?: boolean;
};

export type ChartDatum = {
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

export function linearRegressionForecast(history: MetricHistoryPoint[], count = 3): number[] {
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

export function buildChartPoints(metric: Metric): ChartPoint[] {
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

export function buildChartData(chartPoints: ChartPoint[]): ChartDatum[] {
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
