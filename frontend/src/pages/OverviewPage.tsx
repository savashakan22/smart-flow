import MetricCard from "../components/MetricCard";
import SettingsFab from "../components/SettingsFab";
import Sidebar from "../components/Sidebar";
import { metrics } from "../data/metrics";
import type { ThemeMode } from "../types/dashboard";
import { useNavigate } from "react-router-dom";

type Props = {
  theme: ThemeMode;
  onToggleTheme: (mode: ThemeMode) => void;
};

export default function OverviewPage({ theme, onToggleTheme }: Props) {
  const navigate = useNavigate();

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-content">
        <main className="overview-page-only">
          <section className="overview-section full-page">
            <div className="section-heading">
              <div>
                <p className="section-heading__eyebrow">Genel Görünüm</p>
                <h2>Sistem Genel Bakış</h2>
              </div>
              <span className="section-heading__badge">Overview</span>
            </div>

            <div className="metrics-grid metrics-grid--compact">
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
    </div>
  );
}