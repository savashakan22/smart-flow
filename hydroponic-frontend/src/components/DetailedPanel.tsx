import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import type { Metric, TimeRange } from "../types/dashboard";
import CircleMeter from "./CircleMeter";
import MetricHistoryChart from "./MetricHistoryChart";
import { formatLastUpdated } from "../data/metrics";

type DetailedPanelProps = {
  metric: Metric;
  timeRange: TimeRange;
  chartLoading: boolean;
  onTimeRangeChange: (range: TimeRange) => void;
};

const TIME_RANGE_OPTIONS: Array<{ label: string; value: TimeRange }> = [
  { label: "Hourly", value: "hourly" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
];

export default function DetailedPanel({
  metric,
  timeRange,
  chartLoading,
  onTimeRangeChange,
}: DetailedPanelProps) {
  const showForecast = timeRange === "hourly";
  const [, setRefreshTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRefreshTick((value) => value + 1);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);
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
    <section className={`detail-panel alarm-level--${metric.alarmLevel}`}>
      <div className="detail-panel__header">
        <div>
          <p className="detail-panel__eyebrow">Detailed View</p>
          <h2>{metric.title}</h2>
          <p className="detail-panel__description">{metric.description}</p>
        </div>

        <div className="detail-panel__alarm-block">
          <span className="detail-panel__status-chip">{metric.statusText}</span>
        </div>
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
            alarmLevel={metric.alarmLevel}
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
                <h3>{metric.title} {showForecast ? "history and prediction" : "history"}</h3>
              </div>

              <div className="detail-panel__chart-controls">
                <div className="detail-panel__range-switcher" aria-label="History range">
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`detail-panel__range-option ${
                        timeRange === option.value ? "is-active" : ""
                      }`}
                      onClick={() => onTimeRangeChange(option.value)}
                      aria-pressed={timeRange === option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="detail-panel__legend">
                  <span>
                    <i className="detail-panel__legend-line" />
                    Actual
                  </span>
                  {showForecast ? (
                    <span>
                      <i className="detail-panel__legend-line detail-panel__legend-line--dashed" />
                      Linear Regression
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {chartLoading ? (
              <div className="detail-panel__chart-wrap detail-panel__chart-wrap--loading">
                <Skeleton height="100%" borderRadius={20} />
              </div>
            ) : (
              <MetricHistoryChart metric={metric} timeRange={timeRange} />
            )}
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
