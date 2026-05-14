import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AlarmLevel, ThemeMode } from "../types/dashboard";
import Navbar from "../components/Navbar";
import type { Device } from "../data/devices";
import { formatLastUpdated, mapReadingsToMetrics } from "../data/metrics";
import { fetchLatestReading } from "../services/api";

type Props = {
  theme: ThemeMode;
  user: {
    fullName: string;
    email: string;
  };
  devices: Device[];
  token: string | null;
  isAuthenticated: boolean;
  onToggleTheme: (mode: ThemeMode) => void;
};

export default function DeviceSelectionPage({
  theme,
  devices,
  token,
  isAuthenticated,
  onToggleTheme,
}: Props) {
  const navigate = useNavigate();
  const [deviceReadings, setDeviceReadings] = useState<
    Record<string, { alarmLevel: AlarmLevel; lastUpdated: string }>
  >({});

  useEffect(() => {
    if (!token || devices.length === 0) {
      setDeviceReadings({});
      return;
    }

    let isMounted = true;
    const authToken = token;

    async function loadDeviceAlarmLevels() {
      const entries = await Promise.all(
        devices.map(async (device) => {
          try {
            const latest = await fetchLatestReading(device.id, authToken);
            const metrics = mapReadingsToMetrics(latest, []);
            const hasAlarm = metrics.some((metric) => metric.alarmLevel === "alarm");
            const hasWarning = metrics.some((metric) => metric.alarmLevel === "warning");
            const alarmLevel = hasAlarm ? "alarm" : hasWarning ? "warning" : "normal";

            return [
              device.id,
              { alarmLevel, lastUpdated: formatLastUpdated(latest.timestamp) },
            ] as const;
          } catch {
            return [
              device.id,
              { alarmLevel: "normal", lastUpdated: "No recent update" },
            ] as const;
          }
        })
      );

      if (isMounted) {
        setDeviceReadings(Object.fromEntries(entries));
      }
    }

    loadDeviceAlarmLevels();

    return () => {
      isMounted = false;
    };
  }, [devices, token]);

  return (
    <main className="device-selection-page">
      <Navbar
        theme={theme}
        onToggleTheme={onToggleTheme}
        isAuthenticated={isAuthenticated}
      />

      <header className="device-selection-header">
        <div>
          <p className="device-selection-header__eyebrow">Device Access</p>
          <h1>Select a device overview</h1>
          <p>
            Choose which device dashboard you want to inspect before entering the
            system overview.
          </p>
        </div>
      </header>

      <section className="device-grid">
        {devices.length === 0 && (
          <article className="device-card device-card--add">
            <div className="device-card__heading">
              <h3>No devices yet</h3>
            </div>
            <p>Claim a device from the profile page to start monitoring data.</p>
          </article>
        )}

        {devices.map((device) => (
          <button
            key={device.id}
            className={`device-card alarm-level--${
              deviceReadings[device.id]?.alarmLevel ?? "normal"
            }`}
            onClick={() => navigate(`/devices/${device.id}/dashboard`)}
          >
            <div className="device-card__heading">
              <h3>{device.name}</h3>
              <span className="device-card__updated">
                {deviceReadings[device.id]?.lastUpdated ?? "No recent update"}
              </span>
            </div>

            <p>{device.location}</p>

            <span className="device-card__cta">Open dashboard</span>
          </button>
        ))}

        <button
          className="device-card device-card--add"
          onClick={() => navigate("/profile")}
        >
          <div className="device-card__heading">
            <h3>Add new device</h3>
          </div>
          <p>Go to profile settings and register a new device.</p>
          <span className="device-card__cta">Open profile</span>
        </button>
      </section>
    </main>
  );
}
