import type { Metric } from "../types/dashboard";
import CircleMeter from "./CircleMeter";

type DetailPanelProps = {
  metric: Metric;
};

function getHealthPercent(metric: Metric) {
  if (metric.value >= metric.idealMin && metric.value <= metric.idealMax) {
    return 96;
  }

  const range = metric.max - metric.min;
  const center = (metric.idealMin + metric.idealMax) / 2;
  const distance = Math.abs(metric.value - center);
  const penalty = (distance / range) * 100 * 1.6;
  return Math.max(35, Math.round(100 - penalty));
}

export default function DetailPanel({ metric }: DetailPanelProps) {
  const healthPercent = getHealthPercent(metric);

  return (
    <section className="detail-panel">
      <div className="detail-panel__header">
        <div>
          <p className="detail-panel__eyebrow">Detaylı Analiz</p>
          <h2>{metric.title}</h2>
          <p className="detail-panel__description">{metric.description}</p>
        </div>

        <div className="detail-panel__status-chip">{metric.statusText}</div>
      </div>

      <div className="detail-panel__body">
        <div className="detail-panel__circle-area">
          <CircleMeter
            value={metric.value}
            min={metric.min}
            max={metric.max}
            label={metric.shortLabel}
            unit={metric.unit}
          />
        </div>

        <div className="detail-panel__info-grid">
          <div className="detail-box">
            <span>İdeal Aralık</span>
            <strong>
              {metric.idealMin} - {metric.idealMax}
              {metric.unit}
            </strong>
          </div>

          <div className="detail-box">
            <span>Güncel Durum</span>
            <strong>{metric.statusText}</strong>
          </div>

          <div className="detail-box">
            <span>Sistem Skoru</span>
            <strong>%{healthPercent}</strong>
          </div>

          <div className="detail-box">
            <span>Son Güncelleme</span>
            <strong>{metric.lastUpdated}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}