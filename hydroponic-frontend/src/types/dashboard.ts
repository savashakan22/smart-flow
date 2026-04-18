export type TrendDirection = "up" | "down" | "stable";

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
  description: string;
  trend: TrendDirection;
  lastUpdated: string;
  history?: number[];
};

export type ThemeMode = "light" | "dark";
