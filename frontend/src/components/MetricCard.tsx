import type { Metric } from "../types/dashboard";
import CircleMeter from "./CircleMeter";

type MetricCardProps = {
  metric: Metric;
  active: boolean;
  onClick: (id: string) => void;
};

function getTrendLabel(trend: Metric["trend"]) {
  if (trend === "up") return "Rising";
  if (trend === "down") return "Falling";
  return "Stable";
}

export default function MetricCard({
  metric,
  active,
  onClick,
}: MetricCardProps) {
  return (
    <button
      className={`metric-card metric-card--compact ${active ? "active" : ""}`}
      onClick={() => onClick(metric.id)}
      type="button"
    >
      <div className="metric-card__top">
        <span className="metric-card__label">{metric.title}</span>
        <span className={`metric-card__trend trend--${metric.trend}`}>
          {getTrendLabel(metric.trend)}
        </span>
      </div>

      <div className="metric-card__meter">
        <CircleMeter
          value={metric.value}
          min={metric.min}
          max={metric.max}
          label={metric.shortLabel}
          unit={metric.unit}
          size="sm"
        />
      </div>

      <div className="metric-card__bottom">
        <span>{metric.statusText}</span>
        <span>{metric.lastUpdated}</span>
      </div>
    </button>
  );
}