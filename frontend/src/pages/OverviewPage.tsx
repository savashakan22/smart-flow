import Navbar from "../components/Navbar";
import MetricCard from "../components/MetricCard";
import SettingsFab from "../components/SettingsFab";
import { metrics } from "../data/metrics";
import type { ThemeMode } from "../types/dashboard";
import { useNavigate } from "react-router-dom";

type Props = {
  theme: ThemeMode;
  onToggleTheme: () => void;
};

export default function OverviewPage({ theme, onToggleTheme }: Props) {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <Navbar />

      <main className="overview-page-only">
        <section className="overview-section full-page">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Genel Görünüm</p>
              <h2>Sistemdeki Tüm Değişkenler</h2>
            </div>
            <span className="section-heading__badge">Overview</span>
          </div>

          <div className="metrics-grid">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.id}
                metric={metric}
                active={false}
                onClick={() => navigate(`/detail/${metric.id}`)}
              />
            ))}
          </div>
        </section>
      </main>

      <SettingsFab theme={theme} onToggleTheme={onToggleTheme} />
    </div>
  );
}