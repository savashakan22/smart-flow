import type { Metric } from "../types/dashboard";

type MetricCardProps = {
  metric: Metric;
  active: boolean;
  onClick: (id: string) => void;
};

function getTrendLabel(trend: Metric["trend"]) {
  if (trend === "up") return "Yükseliyor";
  if (trend === "down") return "Düşüyor";
  return "Sabit";
}

export default function MetricCard({
  metric,
  active,
  onClick,
}: MetricCardProps) {
  return (
    <button
      className={`metric-card ${active ? "active" : ""}`}
      onClick={() => onClick(metric.id)}
      type="button"
    >
      <div className="metric-card__top">
        <span className="metric-card__label">{metric.shortLabel}</span>
        <span className={`metric-card__trend trend--${metric.trend}`}>
          {getTrendLabel(metric.trend)}
        </span>
      </div>

      <div className="metric-card__value">
        {metric.value}
        <span className="metric-card__unit">{metric.unit}</span>
      </div>

      <div className="metric-card__bottom">
        <span>{metric.statusText}</span>
        <span>{metric.lastUpdated}</span>
      </div>
    </button>
  );
}