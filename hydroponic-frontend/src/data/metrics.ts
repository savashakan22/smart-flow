import type { HistoryRow, LatestReadingResponse } from "../services/api";
import type { Metric, TrendDirection } from "../types/dashboard";

const METRIC_DEFINITIONS = [
  {
    id: "ec",
    title: "EC",
    shortLabel: "EC",
    unit: "mS/cm",
    min: 0,
    max: 3.5,
    idealMin: 1.6,
    idealMax: 2.2,
    description: "Electrical conductivity",
    sensorKey: "ec" as const,
  },
  {
    id: "water-temp",
    title: "Water Temperature",
    shortLabel: "Temperature",
    unit: "°C",
    min: 0,
    max: 40,
    idealMin: 20,
    idealMax: 24,
    description: "Water temperature",
    sensorKey: "water_temp" as const,
  },
  {
    id: "air-temp",
    title: "Air Temperature",
    shortLabel: "Temperature",
    unit: "°C",
    min: 0,
    max: 50,
    idealMin: 22,
    idealMax: 28,
    description: "Air temperature",
    sensorKey: "air_temp" as const,
  },
  {
    id: "humidity",
    title: "Humidity",
    shortLabel: "Humidity",
    unit: "%",
    min: 0,
    max: 100,
    idealMin: 55,
    idealMax: 70,
    description: "Humidity",
    sensorKey: "humidity" as const,
  },
  {
    id: "water-level",
    title: "Water level",
    shortLabel: "Water level",
    unit: "%",
    min: 0,
    max: 100,
    idealMin: 50,
    idealMax: 100,
    description: "Water level",
    sensorKey: "water_level" as const,
  },
  {
    id: "light",
    title: "Light",
    shortLabel: "Light",
    unit: "lx",
    min: 0,
    max: 10000,
    idealMin: 3000,
    idealMax: 8000,
    description: "Light intensity",
    sensorKey: "light" as const,
  },
];

export function formatLastUpdated(timestamp: string | undefined): string {
  if (!timestamp) return "No recent update";

  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));

  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 minute ago";
  if (diffMin < 60) return `${diffMin} minutes ago`;

  const hours = Math.round(diffMin / 60);
  return `${hours} hour${hours > 1 ? "s" : ""} ago`;
}

function getTrend(history: number[]): TrendDirection {
  if (history.length < 2) return "stable";

  const prev = history[history.length - 2];
  const next = history[history.length - 1];

  if (next > prev) return "up";
  if (next < prev) return "down";
  return "stable";
}

export const metrics: Metric[] = METRIC_DEFINITIONS.map((metric) => ({
  ...metric,
  value: 0,
  statusText: "No Data",
  trend: "stable",
  lastUpdated: "No recent update",
  history: [],
}));

export function mapReadingsToMetrics(
  latest: LatestReadingResponse,
  historyRows: HistoryRow[]
): Metric[] {
  return METRIC_DEFINITIONS.map((definition) => {
    const history = historyRows
      .map((row) => row[definition.sensorKey])
      .filter((value): value is number => typeof value === "number");

    const value = latest[definition.sensorKey];

    const numericValue = typeof value === "number" ? value : history[history.length - 1] ?? 0;

    const statusText =
      numericValue >= definition.idealMin && numericValue <= definition.idealMax
        ? "Ideal"
        : "Out of range";

    return {
      ...definition,
      value: Number(numericValue.toFixed(2)),
      statusText,
      trend: getTrend(history),
      lastUpdated: latest.timestamp,
      history,
    };
  });
}
