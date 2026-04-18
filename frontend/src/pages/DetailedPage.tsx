import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import DetailPanel from "../components/DetailedPanel";
import { mapReadingsToMetrics, metrics as fallbackMetrics } from "../data/metrics";
import type { ThemeMode, Metric } from "../types/dashboard";
import { fetchHistory, fetchLatestReading } from "../services/api";

type Props = {
  theme: ThemeMode;
  onToggleTheme: (mode: ThemeMode) => void;
  isAuthenticated: boolean;
  token: string | null;
};

export default function DetailPage({
  theme,
  onToggleTheme,
  isAuthenticated,
  token,
}: Props) {
  const navigate = useNavigate();
  const { deviceId, metricId } = useParams();
  const [metrics, setMetrics] = useState<Metric[]>(fallbackMetrics);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!deviceId || !token) {
      return;
    }

    const selectedDeviceId = deviceId;
    const authToken = token;
    let isMounted = true;

    async function load() {
      try {
        const [latest, history] = await Promise.all([
          fetchLatestReading(selectedDeviceId, authToken),
          fetchHistory(selectedDeviceId, authToken),
        ]);

        if (!isMounted) return;
        setMetrics(mapReadingsToMetrics(latest, history.data));
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load metric details");
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [deviceId, token]);

  const metric = useMemo(
    () => metrics.find((item) => item.id === metricId) ?? metrics[0],
    [metricId, metrics]
  );

  return (
    <div className="dashboard-layout">
      <Sidebar
        theme={theme}
        onToggleTheme={onToggleTheme}
        isAuthenticated={isAuthenticated}
      />

      <div className="dashboard-content">
        <Navbar
          theme={theme}
          onToggleTheme={onToggleTheme}
          isAuthenticated={isAuthenticated}
        />

        <main className="detail-page-only content-shell content-shell--detail">
          <div className="detail-page-topbar">
            <button
              type="button"
              className="back-overview-btn"
              onClick={() => navigate(`/devices/${deviceId}/dashboard`)}
            >
              Back to overview
            </button>
          </div>

          {error && <p className="auth-error">{error}</p>}
          <DetailPanel metric={metric} />
        </main>
      </div>
    </div>
  );
}
