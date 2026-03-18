import type { Metric } from "../types/dashboard";
import CircleMeter from "./CircleMeter";

type DetailedPanelProps = {
  metric: Metric;
};

export default function DetailedPanel({ metric }: DetailedPanelProps) {
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

      <div className="detail-panel__body">
        <div className="detail-panel__circle-area">
          <div className="detail-panel__circle-wrap">
            <h3 className="detail-panel__circle-title">{metric.shortLabel}</h3>

            <CircleMeter
              value={metric.value}
              min={metric.min}
              max={metric.max}
              label={metric.shortLabel}
              unit={metric.unit}
              size="lg"
            />
          </div>
        </div>

        <div className="detail-panel__info-grid">
          <article className="detail-box">
            <span>Current Value</span>
            <strong>
              {metric.value}
              {metric.unit}
            </strong>
          </article>

          <article className="detail-box">
            <span>Ideal Range</span>
            <strong>
              {metric.idealMin} - {metric.idealMax}
              {metric.unit}
            </strong>
          </article>

          <article className="detail-box">
            <span>Status</span>
            <strong>{metric.title}</strong>
          </article>

          <article className="detail-box">
            <span>Last Update</span>
            <strong>{metric.lastUpdated}</strong>
          </article>
        </div>
      </div>
    </section>
  );
}