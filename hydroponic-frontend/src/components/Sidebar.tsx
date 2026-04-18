import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { metrics } from "../data/metrics";
import type { ThemeMode } from "../types/dashboard";

type Props = {
  theme: ThemeMode;
  onToggleTheme: (mode: ThemeMode) => void;
  isAuthenticated: boolean;
};

export default function Sidebar({
  theme,
  onToggleTheme,
  isAuthenticated,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeMetricId = useMemo(() => {
    const match = location.pathname.match(/^\/devices\/[^/]+\/detail\/([^/]+)$/);
    return match?.[1] ?? null;
  }, [location.pathname]);

  const activeDeviceId = useMemo(() => {
    const match = location.pathname.match(/^\/devices\/([^/]+)\//);
    return match?.[1] ?? null;
  }, [location.pathname]);

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  function handleThemeToggle() {
    onToggleTheme(theme === "dark" ? "light" : "dark");
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  return (
    <>
      <div className="mobile-topbar">
        <div className="mobile-topbar__left">
          <button
            type="button"
            className="hamburger-button"
            aria-label="Open Menu"
            onClick={() => setMobileOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>

          <button
            type="button"
            className="mobile-topbar__title"
            onClick={() => handleNavigate("/")}
          >
            Smart-Flow Dashboard
          </button>
        </div>

        <div className="mobile-topbar__actions">
          <button
            type="button"
            className="mobile-topbar__icon-btn"
            onClick={handleThemeToggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? "☾" : "☀"}
          </button>

          <button
            type="button"
            className="mobile-topbar__icon-btn"
            onClick={() => handleNavigate(isAuthenticated ? "/profile" : "/login")}
            aria-label={isAuthenticated ? "Open profile" : "Go to login"}
            title={isAuthenticated ? "Profile" : "Log in"}
          >
            {isAuthenticated ? "👤" : "➜"}
          </button>
        </div>
      </div>

      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar__top">
          {!collapsed && (
            <div className="sidebar__brand">
              <h2>Menu</h2>
            </div>
          )}

          <button
            type="button"
            className="sidebar__toggle"
            aria-label={collapsed ? "Sidebar aç" : "Sidebar kapat"}
            onClick={() => setCollapsed((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {!collapsed && (
          <nav className="sidebar__nav">
            {metrics.map((metric) => (
              <button
                key={metric.id}
                type="button"
                className={`sidebar__item ${
                  activeMetricId === metric.id ? "active" : ""
                }`}
                onClick={() =>
                  handleNavigate(
                    activeDeviceId
                      ? `/devices/${activeDeviceId}/detail/${metric.id}`
                      : `/devices`
                  )
                }
              >
                <span className="sidebar__icon" />
                <span>{metric.title}</span>
              </button>
            ))}
          </nav>
        )}
      </aside>

      <div className={`mobile-drawer ${mobileOpen ? "open" : ""}`}>
        <div
          className="mobile-drawer__backdrop"
          onClick={() => setMobileOpen(false)}
        />

        <aside className="mobile-drawer__panel">
          <div className="mobile-drawer__header">
            <h2 className="mobile-drawer__title">Menu</h2>
            <button
              type="button"
              className="mobile-drawer__close"
              aria-label="Close Menu"
              onClick={() => setMobileOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="mobile-drawer__content">
            {metrics.map((metric) => (
              <button
                key={metric.id}
                type="button"
                className={`mobile-drawer__item ${
                  activeMetricId === metric.id ? "active" : ""
                }`}
                onClick={() =>
                  handleNavigate(
                    activeDeviceId
                      ? `/devices/${activeDeviceId}/detail/${metric.id}`
                      : `/devices`
                  )
                }
              >
                {metric.title}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}