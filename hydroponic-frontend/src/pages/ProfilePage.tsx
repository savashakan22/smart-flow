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
  onClaimDevice: (claimCode: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onSaveProfile: (profile: User) => Promise<void>;
  isAuthenticated: boolean;
  onToggleTheme: (mode: ThemeMode) => void;
};

type ProfileTab = "personal" | "security" | "devices";

export default function ProfilePage({
  theme,
  user,
  devices,
  onClaimDevice,
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

  const [claimCode, setClaimCode] = useState("");
  const [deviceError, setDeviceError] = useState("");

  const initials = useMemo(() => {
    return user.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user.fullName]);

  async function handleSaveProfile() {
    await onSaveProfile({ fullName, email });
    alert("Profile updated");
  }

  function handlePasswordChange() {
    if (!currentPassword || !newPassword) {
      alert("Please fill in your current and new passwords");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    alert("Password changes are managed in Firebase console.");
  }

  async function handleClaimDeviceSubmit() {
    if (!claimCode.trim()) {
      setDeviceError("Please enter a claim code");
      return;
    }

    try {
      setDeviceError("");
      await onClaimDevice(claimCode.trim());
      setClaimCode("");
      setIsAddDeviceModalOpen(false);
    } catch (claimError) {
      setDeviceError(claimError instanceof Error ? claimError.message : "Unable to claim device");
    }
  }

  function handleCloseModal() {
    setClaimCode("");
    setDeviceError("");
    setIsAddDeviceModalOpen(false);
  }

  async function handleLogout() {
    await onLogout();
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
                    Claim device
                  </button>
                </div>

                <div className="device-list">
                  {devices.map((device) => (
                    <div key={device.id} className="device-item">
                      <div>
                        <h4>{device.name}</h4>
                        <p>{device.serial} • {device.status}</p>
                      </div>
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
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Claim device</h3>
            <p>Enter the claim code generated by your device.</p>
            <input
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              placeholder="CLAIM-XXXX"
              className="profile-modal__input"
            />
            {deviceError && <p className="auth-error">{deviceError}</p>}
            <div className="profile-modal__actions">
              <button className="profile-btn profile-btn--ghost" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="profile-btn profile-btn--primary" onClick={handleClaimDeviceSubmit}>
                Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
