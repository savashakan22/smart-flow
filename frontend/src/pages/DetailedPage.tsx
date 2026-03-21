import { useMemo } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import DetailPanel from "../components/DetailedPanel";
import { metrics } from "../data/metrics";
import type { ThemeMode } from "../types/dashboard";

type Props = {
  theme: ThemeMode;
  onToggleTheme: (mode: ThemeMode) => void;
  isAuthenticated: boolean;
};

export default function DetailPage({
  theme,
  onToggleTheme,
  isAuthenticated,
}: Props) {
  const { metricId } = useParams();

  const metric = useMemo(
    () => metrics.find((item) => item.id === metricId) ?? metrics[0],
    [metricId]
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-content">
        <Navbar
          theme={theme}
          onToggleTheme={onToggleTheme}
          isAuthenticated={isAuthenticated}
        />

        <main className="detail-page-only content-shell content-shell--detail">
          <DetailPanel metric={metric} />
        </main>
      </div>
    </div>
  );
}