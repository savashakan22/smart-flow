import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import DetailPanel from "../components/DetailedPanel";
import SettingsFab from "../components/SettingsFab";
import { metrics } from "../data/metrics";
import type { ThemeMode } from "../types/dashboard";

type Props = {
  theme: ThemeMode;
  onToggleTheme: () => void;
};

export default function DetailPage({ theme, onToggleTheme }: Props) {
  const { metricId } = useParams();
  const navigate = useNavigate();

  const metric = useMemo(
    () => metrics.find((item) => item.id === metricId) ?? metrics[0],
    [metricId]
  );

  return (
    <div className="app-shell">
      <Navbar />

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
  );
}