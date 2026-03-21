import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ThemeMode } from "../types/dashboard";

type Props = {
  theme: ThemeMode;
  user: {
    fullName: string;
    email: string;
  };
};

type Device = {
  id: string;
  name: string;
  location: string;
  status: "Online" | "Offline";
};

export default function DeviceSelectionPage({ user }: Props) {
  const navigate = useNavigate();

  const [devices] = useState<Device[]>([
    { id: "device-a", name: "Greenhouse A", location: "North Field", status: "Online" },
    { id: "device-b", name: "Greenhouse B", location: "South Field", status: "Online" },
    { id: "device-c", name: "Soil Station C", location: "Open Area", status: "Offline" },
  ]);

  const initials = useMemo(() => {
    return user.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user.fullName]);

  return (
    <main className="device-selection-page">
      <header className="device-selection-header">
        <div>
          <p className="device-selection-header__eyebrow">Device Access</p>
          <h1>Select a device overview</h1>
          <p>
            Choose which device dashboard you want to inspect before entering the
            system overview.
          </p>
        </div>

        <button
          className="device-profile-chip"
          onClick={() => navigate("/profile")}
        >
          <span className="device-profile-chip__avatar">{initials}</span>
          <span>Profile</span>
        </button>
      </header>

      <section className="device-grid">
        {devices.map((device) => (
          <button
            key={device.id}
            className="device-card"
            onClick={() => navigate(`/dashboard/${device.id}`)}
          >
            <div className="device-card__top">
              <span className="device-card__badge">{device.status}</span>
            </div>

            <h3>{device.name}</h3>
            <p>{device.location}</p>

            <span className="device-card__cta">Open dashboard</span>
          </button>
        ))}

        <button className="device-card device-card--add" onClick={() => navigate("/profile")}>
          <h3>Add new device</h3>
          <p>Go to profile settings and register a new device.</p>
          <span className="device-card__cta">Open profile</span>
        </button>
      </section>
    </main>
  );
}