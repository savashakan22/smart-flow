import type { Metric } from "../types/dashboard";
import CircleMeter from "./CircleMeter";
import { formatLastUpdated } from "../data/metrics";

type MetricCardProps = {
  metric: Metric;
  active: boolean;
  onClick: (id: string) => void;
};

function getAlarmLabel(alarmLevel: Metric["alarmLevel"]) {
  if (alarmLevel === "alarm") return "High alarm";
  if (alarmLevel === "warning") return "Warning";
  return "Normal";
}

export default function MetricCard({
  metric,
  active,
  onClick,
}: MetricCardProps) {
  return (
    <button
      className={`metric-card metric-card--compact alarm-level--${metric.alarmLevel} ${
        active ? "active" : ""
      }`}
      onClick={() => onClick(metric.id)}
      type="button"
    >
      <div className="metric-card__top">
        <span className="metric-card__label">{metric.title}</span>
        <span className="metric-card__alarm-level">
          {getAlarmLabel(metric.alarmLevel)}
        </span>
      </div>

      <div className="metric-card__meter">
        <CircleMeter
          value={metric.value}
          min={metric.min}
          max={metric.max}
          label={metric.shortLabel}
          unit={metric.unit}
          alarmLevel={metric.alarmLevel}
          size="sm"
        />
      </div>

      <div className="metric-card__bottom">
        <span>{metric.statusText}</span>
        <span>{formatLastUpdated(metric.lastUpdated)}</span>
      </div>
    </button>
  );
}
