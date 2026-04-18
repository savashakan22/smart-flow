import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import MetricCard from "../components/MetricCard";
import { mapReadingsToMetrics, metrics as fallbackMetrics } from "../data/metrics";
import type { ThemeMode, Metric } from "../types/dashboard";
import { fetchHistory, fetchLatestReading } from "../services/api";

type Props = {
  theme: ThemeMode;
  onToggleTheme: (mode: ThemeMode) => void;
  isAuthenticated: boolean;
  token: string | null;
};

export default function OverviewPage({
  theme,
  onToggleTheme,
  isAuthenticated,
  token,
}: Props) {
  const navigate = useNavigate();
  const { deviceId } = useParams();
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
        setError(loadError instanceof Error ? loadError.message : "Failed to load metrics");
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [deviceId, token]);

  function handleMetricClick(metricId: string) {
    if (!deviceId) return;
    navigate(`/devices/${deviceId}/detail/${metricId}`);
  }

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

        <main className="overview-page-only content-shell content-shell--overview">
          <section className="overview-section">
            <div className="section-heading">
              <div>
                <h2>System Overview</h2>
              </div>
              <span className="section-heading__badge">Overview</span>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <div className="metrics-grid metrics-grid--compact">
              {metrics.map((metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  active={false}
                  onClick={handleMetricClick}
                />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
