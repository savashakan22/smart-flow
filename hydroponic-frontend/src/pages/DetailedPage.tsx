import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import DetailPanel from "../components/DetailedPanel";
import DetailPanelSkeleton from "../components/DetailedPanelSkeleton";
import { mapReadingsToMetrics, metrics as fallbackMetrics } from "../data/metrics";
import type { ThemeMode, Metric, TimeRange } from "../types/dashboard";
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
  const [timeRange] = useState<TimeRange>("hourly");
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
        setError(loadError instanceof Error ? loadError.message : "Failed to load metric details");
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

  const metric = useMemo(
    () => metrics.find((item) => item.id === metricId) ?? metrics[0],
    [metricId, metrics]
  );

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

          <main
            className="detail-page-only content-shell content-shell--detail"
            data-time-range={timeRange}
          >
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

            {loading ? <DetailPanelSkeleton /> : <DetailPanel metric={metric} />}
          </main>
        </div>
      </div>
    </SkeletonTheme>
  );
}
