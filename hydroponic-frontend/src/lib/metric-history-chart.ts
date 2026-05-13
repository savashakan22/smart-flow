import type { Metric, MetricHistoryPoint, TimeRange } from "../types/dashboard";

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

function formatTimeLabel(timestamp: string, timeRange: TimeRange) {
  const date = new Date(timestamp);

  if (timeRange === "hourly") {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  if (timeRange === "daily") {
    return date.toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function getFallbackHistory(metric: Metric, timeRange: TimeRange): MetricHistoryPoint[] {
  const fallbackByRange = {
    hourly: {
      count: 8,
      intervalMs: 20 * 60_000,
    },
    daily: {
      count: 7,
      intervalMs: 24 * 60 * 60_000,
    },
    weekly: {
      count: 12,
      intervalMs: 7 * 24 * 60 * 60_000,
    },
  } satisfies Record<TimeRange, { count: number; intervalMs: number }>;

  const { count, intervalMs } = fallbackByRange[timeRange];
  const current = metric.value;
  const now = Date.now();
  const fallbackValues = Array.from({ length: count }, (_, index) =>
    Number((current - (count - 1 - index) * 0.35).toFixed(2))
  );

  return fallbackValues.map((value, index) => ({
    timestamp: new Date(now - (fallbackValues.length - 1 - index) * intervalMs).toISOString(),
    value,
  }));
}

function getMetricHistory(metric: Metric, timeRange: TimeRange): MetricHistoryPoint[] {
  if (metric.history && metric.history.length > 1) {
    return bucketMetricHistory(metric.history, timeRange);
  }

  return getFallbackHistory(metric, timeRange);
}

function getDayBucketKey(timestamp: string) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function bucketMetricHistory(history: MetricHistoryPoint[], timeRange: TimeRange): MetricHistoryPoint[] {
  const sortedHistory = [...history].sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );

  if (timeRange === "hourly") {
    return sortedHistory;
  }

  const buckets = new Map<string, MetricHistoryPoint[]>();

  for (const point of sortedHistory) {
    const key = getDayBucketKey(point.timestamp);
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.push(point);
    } else {
      buckets.set(key, [point]);
    }
  }

  return Array.from(buckets.values()).map((bucket) => {
    const total = bucket.reduce((sum, point) => sum + point.value, 0);
    const average = total / bucket.length;
    const midpoint = bucket[Math.floor(bucket.length / 2)] ?? bucket[bucket.length - 1];

    return {
      timestamp: midpoint.timestamp,
      value: Number(average.toFixed(2)),
    };
  });
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

export function buildChartPoints(metric: Metric, timeRange: TimeRange, includeForecast = true): ChartPoint[] {
  const history = getMetricHistory(metric, timeRange);
  const actualPoints = history.map((point) => ({
    timestamp: point.timestamp,
    label: formatTimeLabel(point.timestamp, timeRange),
    value: point.value,
    predicted: false,
  }));

  if (!includeForecast) {
    return actualPoints;
  }

  const predictions = linearRegressionForecast(history, 3);

  const lastTimestamp = new Date(history[history.length - 1]?.timestamp ?? Date.now());
  const previousTimestamp = new Date(history[history.length - 2]?.timestamp ?? lastTimestamp);
  const intervalMs = Math.max(lastTimestamp.getTime() - previousTimestamp.getTime(), 20 * 60_000);

  const predictionPoints = predictions.map((value, index) => {
    const timestamp = new Date(lastTimestamp.getTime() + (index + 1) * intervalMs).toISOString();

    return {
      timestamp,
      label: formatTimeLabel(timestamp, timeRange),
      value,
      predicted: true,
    };
  });

  return [...actualPoints, ...predictionPoints];
}

export function buildChartData(chartPoints: ChartPoint[], includeForecast = true): ChartDatum[] {
  const firstPredictionIndex = chartPoints.findIndex((point) => point.predicted);
  const forecastAnchorIndex = firstPredictionIndex > 0 ? firstPredictionIndex - 1 : -1;

  return chartPoints.map((point, index) => ({
    timestamp: point.timestamp,
    label: point.label,
    actual: point.predicted ? null : point.value,
    forecast:
      includeForecast && (point.predicted || index === forecastAnchorIndex) ? point.value : null,
    value: point.value,
    predicted: Boolean(point.predicted),
  }));
}
