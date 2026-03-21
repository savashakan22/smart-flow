import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ThemeMode } from "../types/dashboard";
import Navbar from "../components/Navbar";

type User = {
  fullName: string;
  email: string;
};

type Device = {
  id: number;
  name: string;
  serial: string;
  status: "Active" | "Passive";
};

type Props = {
  theme: ThemeMode;
  user: User;
  onLogout: () => void;
  onSaveProfile: (profile: User) => void;
  isAuthenticated: boolean;
  onToggleTheme: (mode: ThemeMode) => void;
};

export default function ProfilePage({
  theme,
  user,
  onLogout,
  onSaveProfile,
  isAuthenticated,
  onToggleTheme,
}: Props) {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [deviceName, setDeviceName] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");

  const [devices, setDevices] = useState<Device[]>([
    { id: 1, name: "Device A", serial: "SM-1001", status: "Active" },
    { id: 2, name: "Device B", serial: "TM-2088", status: "Passive" },
  ]);

  const initials = useMemo(() => {
    return user.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user.fullName]);

  function handleSaveProfile() {
    onSaveProfile({ fullName, email });
    alert("Profile updated");
  }

  function handlePasswordChange() {
    if (!currentPassword || !newPassword) {
      alert("Please fill in your current and new passwords");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    alert("Password changed");
  }

  function handleAddDevice() {
    if (!deviceName.trim() || !deviceSerial.trim()) {
      alert("Device name and serial number are required");
      return;
    }

    setDevices((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: deviceName.trim(),
        serial: deviceSerial.trim(),
        status: "Active",
      },
    ]);

    setDeviceName("");
    setDeviceSerial("");
  }

  function handleRemoveDevice(id: number) {
    setDevices((prev) => prev.filter((device) => device.id !== id));
  }

  function handleLogout() {
    onLogout();
    navigate("/login");
  }

  return (
    <main className="profile-page">
      <Navbar
        theme={theme}
        onToggleTheme={onToggleTheme}
        isAuthenticated={isAuthenticated}
      />

      <section className="profile-hero-card">
        <div className="profile-avatar">{initials}</div>
        <div>
          <h2>{fullName}</h2>
          <p>{email}</p>
        </div>
      </section>

      <div className="profile-grid">
        <section className="profile-card">
          <p className="profile-card__eyebrow">Personal Information</p>
          <h3>Profile Information</h3>

          <div className="profile-form">
            <label className="profile-field">
              <span>Name Surname</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                type="text"
              />
            </label>

            <label className="profile-field">
              <span>E-mail</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            </label>

            <button onClick={handleSaveProfile} className="profile-btn profile-btn--primary">
              Save profile
            </button>
          </div>
        </section>

        <section className="profile-card">
          <p className="profile-card__eyebrow">Security</p>
          <h3>Password Settings</h3>

          <div className="profile-form">
            <label className="profile-field">
              <span>Current Password</span>
              <input
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                type="password"
              />
            </label>

            <label className="profile-field">
              <span>New Password</span>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
              />
            </label>

            <button
              onClick={handlePasswordChange}
              className="profile-btn profile-btn--primary"
            >
              Update password
            </button>
          </div>
        </section>

        <section className="profile-card profile-card--full">
          <p className="profile-card__eyebrow">Device Management</p>
          <h3>Registered Devices</h3>

          <div className="profile-device-add">
            <label className="profile-field">
              <span>Device Name</span>
              <input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                type="text"
                placeholder="Greenhouse Sensor"
              />
            </label>

            <label className="profile-field">
              <span>Serial Number</span>
              <input
                value={deviceSerial}
                onChange={(e) => setDeviceSerial(e.target.value)}
                type="text"
                placeholder="SR-3099"
              />
            </label>

            <button onClick={handleAddDevice} className="profile-btn profile-btn--primary">
              Add device
            </button>
          </div>

          <div className="device-list">
            {devices.map((device) => (
              <div key={device.id} className="device-item">
                <div>
                  <h4>{device.name}</h4>
                  <p>
                    {device.serial} • {device.status}
                  </p>
                </div>

                <button
                  onClick={() => handleRemoveDevice(device.id)}
                  className="profile-btn profile-btn--ghost"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="profile-topbar__actions" style={{ marginTop: 16 }}>
            <button onClick={handleLogout} className="profile-btn profile-btn--danger">
              Log out
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}