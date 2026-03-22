import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ThemeMode } from "../types/dashboard";
import Navbar from "../components/Navbar";
import type { Device } from "../data/devices";

type User = {
  fullName: string;
  email: string;
};

type Props = {
  theme: ThemeMode;
  user: User;
  devices: Device[];
  onAddDevice: (device: Omit<Device, "id">) => void;
  onRemoveDevice: (id: string) => void;
  onLogout: () => void;
  onSaveProfile: (profile: User) => void;
  isAuthenticated: boolean;
  onToggleTheme: (mode: ThemeMode) => void;
};

type ProfileTab = "personal" | "security" | "devices";

export default function ProfilePage({
  theme,
  user,
  devices,
  onAddDevice,
  onRemoveDevice,
  onLogout,
  onSaveProfile,
  isAuthenticated,
  onToggleTheme,
}: Props) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);

  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [deviceName, setDeviceName] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");

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

  function resetDeviceForm() {
    setDeviceName("");
    setDeviceSerial("");
    setWifiSsid("");
    setWifiPassword("");
  }

  function handleAddDevice() {
    if (
      !deviceName.trim() ||
      !deviceSerial.trim() ||
      !wifiSsid.trim() ||
      !wifiPassword.trim()
    ) {
      alert("Please fill in all device fields");
      return;
    }

    onAddDevice({
      name: deviceName.trim(),
      serial: deviceSerial.trim(),
      location: "Custom Device",
      status: "Online",
      wifiSsid: wifiSsid.trim(),
      wifiPassword: wifiPassword.trim(),
    });

    resetDeviceForm();
    setIsAddDeviceModalOpen(false);
  }

  function handleCloseModal() {
    resetDeviceForm();
    setIsAddDeviceModalOpen(false);
  }

  function handleLogout() {
    onLogout();
    navigate("/login");
  }

  return (
    <>
      <Navbar
        theme={theme}
        onToggleTheme={onToggleTheme}
        isAuthenticated={isAuthenticated}
      />

      <main className="profile-page profile-page--settings">
        <section className="profile-hero-card">
          <div className="profile-avatar">{initials}</div>
          <div>
            <h2>{fullName}</h2>
            <p>{email}</p>
          </div>
        </section>

        <div className="profile-settings-layout">
          <aside className="profile-settings-sidebar">
            <button
              type="button"
              className={`profile-settings-tab ${activeTab === "personal" ? "is-active" : ""}`}
              onClick={() => setActiveTab("personal")}
            >
              Personal Info
            </button>

            <button
              type="button"
              className={`profile-settings-tab ${activeTab === "security" ? "is-active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              Security
            </button>

            <button
              type="button"
              className={`profile-settings-tab ${activeTab === "devices" ? "is-active" : ""}`}
              onClick={() => setActiveTab("devices")}
            >
              Device Management
            </button>

            <div className="profile-settings-sidebar__footer">
              <button
                type="button"
                className="profile-btn profile-btn--danger profile-btn--sidebar"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          </aside>

          <div className="profile-settings-content">
            {activeTab === "personal" && (
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

                  <button
                    onClick={handleSaveProfile}
                    className="profile-btn profile-btn--primary"
                  >
                    Save profile
                  </button>
                </div>
              </section>
            )}

            {activeTab === "security" && (
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
            )}

            {activeTab === "devices" && (
              <section className="profile-card">
                <div className="profile-devices-header">
                  <div>
                    <p className="profile-card__eyebrow">Device Management</p>
                    <h3>Registered Devices</h3>
                  </div>

                  <button
                    type="button"
                    className="profile-btn profile-btn--primary"
                    onClick={() => setIsAddDeviceModalOpen(true)}
                  >
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
                          {device.wifiSsid ? ` • ${device.wifiSsid}` : ""}
                        </p>
                      </div>

                      <button
                        onClick={() => onRemoveDevice(device.id)}
                        className="profile-btn profile-btn--ghost"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {isAddDeviceModalOpen && (
        <div className="profile-modal-backdrop" onClick={handleCloseModal}>
          <div
            className="profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-modal__header">
              <div>
                <p className="profile-card__eyebrow">New Device</p>
                <h3>Add Device</h3>
              </div>

              <button
                type="button"
                className="profile-modal__close"
                onClick={handleCloseModal}
                aria-label="Close add device modal"
              >
                ×
              </button>
            </div>

            <div className="profile-modal__body">
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
                <span>Device Serial Number</span>
                <input
                  value={deviceSerial}
                  onChange={(e) => setDeviceSerial(e.target.value)}
                  type="text"
                  placeholder="SR-3099"
                />
              </label>

              <label className="profile-field">
                <span>Wi-Fi SSID</span>
                <input
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  type="text"
                  placeholder="MyHomeWiFi"
                />
              </label>

              <label className="profile-field">
                <span>Wi-Fi Password</span>
                <input
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                />
              </label>
            </div>

            <div className="profile-modal__actions">
              <button
                type="button"
                className="profile-btn profile-btn--ghost"
                onClick={handleCloseModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="profile-btn profile-btn--primary"
                onClick={handleAddDevice}
              >
                Save device
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}