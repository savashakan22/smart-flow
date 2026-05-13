export type TrendDirection = "up" | "down" | "stable";
export type TimeRange = "hourly" | "daily" | "weekly";
export type AlarmLevel = "normal" | "warning" | "alarm";

export type MetricHistoryPoint = {
  timestamp: string;
  value: number;
};

export type Metric = {
  id: string;
  title: string;
  shortLabel: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  idealMin: number;
  idealMax: number;
  statusText: string;
  alarmLevel: AlarmLevel;
  description: string;
  trend: TrendDirection;
  lastUpdated: string;
  history?: MetricHistoryPoint[];
};

export type ThemeMode = "light" | "dark";
