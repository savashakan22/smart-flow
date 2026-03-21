import { useNavigate } from "react-router-dom";
import type { ThemeMode } from "../types/dashboard";
import Navbar from "../components/Navbar";
import { devices } from "../data/devices";

type Props = {
  theme: ThemeMode;
  user: {
    fullName: string;
    email: string;
  };
  isAuthenticated: boolean;
  onToggleTheme: (mode: ThemeMode) => void;
};

export default function DeviceSelectionPage({
  theme,
  isAuthenticated,
  onToggleTheme,
}: Props) {
  const navigate = useNavigate();

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
        {devices.map((device) => (
          <button
            key={device.id}
            className="device-card"
            onClick={() => navigate(`/devices/${device.id}/dashboard`)}
          >
            <div className="device-card__top">
              <span className="device-card__badge">{device.status}</span>
            </div>

            <h3>{device.name}</h3>
            <p>{device.location}</p>

            <span className="device-card__cta">Open dashboard</span>
          </button>
        ))}

        <button
          className="device-card device-card--add"
          onClick={() => navigate("/profile")}
        >
          <h3>Add new device</h3>
          <p>Go to profile settings and register a new device.</p>
          <span className="device-card__cta">Open profile</span>
        </button>
      </section>
    </main>
  );
}