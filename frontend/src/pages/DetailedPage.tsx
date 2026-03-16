import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import DetailPanel from "../components/DetailedPanel";
import SettingsFab from "../components/SettingsFab";
import { metrics } from "../data/metrics";
import type { ThemeMode } from "../types/dashboard";

type Props = {
  theme: ThemeMode;
  onToggleTheme: (mode: ThemeMode) => void;
};

export default function DetailPage({ theme, onToggleTheme }: Props) {
  const { metricId } = useParams();
  const navigate = useNavigate();

  const metric = useMemo(
    () => metrics.find((item) => item.id === metricId) ?? metrics[0],
    [metricId]
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-content">
        <main className="detail-page-only">
          <div className="detail-page-topbar">
            <button
              type="button"
              className="back-button"
              onClick={() => navigate("/")}
            >
              ← Overview’a Dön
            </button>
          </div>

          <DetailPanel metric={metric} />
        </main>

        <SettingsFab theme={theme} onToggleTheme={onToggleTheme} />
      </div>
    </div>
  );
}