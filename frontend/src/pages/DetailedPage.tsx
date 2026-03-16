import { useMemo } from "react";
import { useParams } from "react-router-dom";
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

  const metric = useMemo(
    () => metrics.find((item) => item.id === metricId) ?? metrics[0],
    [metricId]
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-content">
        <main className="detail-page-only content-shell content-shell--detail">

          <DetailPanel metric={metric} />
        </main>

        <SettingsFab theme={theme} onToggleTheme={onToggleTheme} />
      </div>
    </div>
  );
}