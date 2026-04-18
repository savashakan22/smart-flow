import Skeleton from "react-loading-skeleton";

export default function DetailPanelSkeleton() {
  return (
    <section className="detail-panel">
      <div className="detail-panel__header">
        <div>
          <Skeleton width={120} height={18} />
          <Skeleton width={80} height={40} style={{ marginTop: 6 }} />
          <Skeleton width={200} height={20} style={{ marginTop: 8 }} />
        </div>

        <Skeleton width={120} height={40} borderRadius={999} />
      </div>

      <div className="detail-panel__layout">
        <aside className="detail-panel__meter-card">
          <div className="detail-panel__meter-head">
            <Skeleton width={90} height={16} />
            <Skeleton width={40} height={22} style={{ marginTop: 6 }} />
          </div>

          <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <Skeleton circle width={200} height={200} />
          </div>

          <div className="detail-panel__meter-meta">
            <Skeleton width={110} height={14} style={{ display: "inline-block" }} />
            <Skeleton width={130} height={16} />
          </div>
        </aside>

        <div className="detail-panel__content">
          <div className="detail-panel__chart-card">
            <div className="detail-panel__chart-head">
              <div>
                <Skeleton width={100} height={16} />
                <Skeleton width={220} height={24} style={{ marginTop: 6 }} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <Skeleton width={70} height={16} />
                <Skeleton width={120} height={16} />
              </div>
            </div>

            <div className="detail-panel__chart-wrap">
              <Skeleton height={260} borderRadius={20} />
            </div>
          </div>

          <div className="detail-panel__stats-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <article key={i} className="detail-panel__stat-card">
                <Skeleton width={120} height={16} />
                <Skeleton width={140} height={24} style={{ marginTop: 8 }} />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}