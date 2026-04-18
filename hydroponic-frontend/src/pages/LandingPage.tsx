import { Link } from "react-router-dom";
import type { ThemeMode } from "../types/dashboard";
import Navbar from "../components/Navbar";

type Props = {
  theme: ThemeMode;
  isAuthenticated: boolean;
  user: {
    fullName: string;
    email: string;
  };
  onToggleTheme: (mode: ThemeMode) => void;
};

export default function LandingPage({
  theme,
  isAuthenticated,
  onToggleTheme,
}: Props) {
  return (
    <main className="landing-page">
      <Navbar
        theme={theme}
        onToggleTheme={onToggleTheme}
        isAuthenticated={isAuthenticated}
      />

      <section className="landing-hero">
        <div className="landing-hero__content">
          <span className="landing-badge">Smart-Flow Dashboard</span>
          <h1>Monitor agricultural data, manage your equipment</h1>
          <p>
            Monitor sensor metrics from a single panel,
            review them in detail screens, manage your account
            and consolidate device adding processes into a single user flow
          </p>

          <div className="landing-actions">
            {isAuthenticated ? (
              <>
                <Link to="/devices" className="landing-btn landing-btn--primary">
                  Go to Devices
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="landing-btn landing-btn--primary">
                  Log in
                </Link>
                <Link to="/signup" className="landing-btn landing-btn--secondary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="landing-preview">
          <div className="landing-card">
            <p className="landing-card__eyebrow">Overview</p>
            <h3>System Overview</h3>
            <div className="landing-stats">
              <div>
                <span>Temperature</span>
                <strong>24.8°C</strong>
              </div>
              <div>
                <span>Humidity</span>
                <strong>%61</strong>
              </div>
              <div>
                <span>pH</span>
                <strong>6.7</strong>
              </div>
              <div>
                <span>Device</span>
                <strong>4 active</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-feature">
          <h3>Live Dashboard</h3>
          <p>Track key metrics in a card view</p>
        </div>
        <div className="landing-feature">
          <h3>Detail Pages</h3>
          <p>Examine each metric in more detail and visually</p>
        </div>
        <div className="landing-feature">
          <h3>Profile and Device Management</h3>
          <p>Change password, add devices, manage connected devices</p>
        </div>
      </section>
    </main>
  );
}