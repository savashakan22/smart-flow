import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { metrics } from "../data/metrics";

export default function Sidebar() {
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
        <button
          type="button"
          className="hamburger-button"
          aria-label="Menüyü aç"
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
          SmartFlow Dashboard
        </button>
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
                <span className="sidebar__icon"></span>
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
            <h2 className="mobile-drawer__title">Menü</h2>
            <button
              type="button"
              className="mobile-drawer__close"
              aria-label="Menüyü kapat"
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
                {metric.shortLabel}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}