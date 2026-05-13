import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import MetricCard from "../components/MetricCard";
import MetricCardSkeleton from "../components/MetricCardSkeleton";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deviceId || !token) {
      setLoading(false);
      return;
    }

    const selectedDeviceId = deviceId;
    const authToken = token;
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [latest, history] = await Promise.all([
          fetchLatestReading(selectedDeviceId, authToken),
          fetchHistory(selectedDeviceId, authToken),
        ]);

        if (!isMounted) return;
        setMetrics(mapReadingsToMetrics(latest, history.data));
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load metrics");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
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

  const skeletonBaseColor = theme === "dark" ? "#2a2f3a" : "#e9edf3";
  const skeletonHighlightColor = theme === "dark" ? "#3a4150" : "#f5f7fa";

  return (
    <SkeletonTheme
      baseColor={skeletonBaseColor}
      highlightColor={skeletonHighlightColor}
    >
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
            <div className="detail-page-topbar">
              <button
                type="button"
                className="back-overview-btn"
                onClick={() => navigate("/devices")}
              >
                Back to devices
              </button>
            </div>

            <section className="overview-section">
              <div className="section-heading">
                <div>
                  <h2>System Overview</h2>
                </div>
                <span className="section-heading__badge">Overview</span>
              </div>

              {error && <p className="auth-error">{error}</p>}

              <div className="metrics-grid metrics-grid--compact">
                {loading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <MetricCardSkeleton key={index} />
                    ))
                  : metrics.map((metric) => (
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
    </SkeletonTheme>
  );
}
