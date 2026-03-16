import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { metrics } from "../data/metrics";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeMetricId = useMemo(() => {
    const match = location.pathname.match(/^\/detail\/(.+)$/);
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

  return (
    <>
      <div className="mobile-topbar">
        <button
          type="button"
          className={`hamburger-button ${mobileOpen ? "open" : ""}`}
          aria-label="Menüyü aç"
          onClick={() => setMobileOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>

        <Link to="/" className="mobile-topbar__brand">
          <div>
            <h1>SmartFlow Dashboard</h1>
            <p>Hydroponic Monitoring Interface</p>
          </div>
        </Link>
      </div>

      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar__top">
          <Link to="/" className="sidebar__brand">
            <div>
              <h1>SmartFlow Dashboard</h1>
              <p>Hydroponic Monitoring Interface</p>
            </div>
          </Link>

          <button
            type="button"
            className="sidebar__toggle"
            aria-label={collapsed ? "Sidebar aç" : "Sidebar kapat"}
            onClick={() => setCollapsed((prev) => !prev)}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <div className="sidebar__section">
          <p className="sidebar__section-title">Detaylı Bilgiler</p>

          <div className="sidebar__menu">
            {metrics.map((metric) => (
              <button
                key={metric.id}
                type="button"
                className={`sidebar__item ${
                  activeMetricId === metric.id ? "active" : ""
                }`}
                onClick={() => handleNavigate(`/detail/${metric.id}`)}
              >
                <span>{metric.shortLabel}</span>
                <small>
                  {metric.value}
                  {metric.unit}
                </small>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className={`mobile-drawer ${mobileOpen ? "open" : ""}`}>
        <div
          className="mobile-drawer__backdrop"
          onClick={() => setMobileOpen(false)}
        />

        <aside className="mobile-drawer__panel">
          <div className="mobile-drawer__header">
            <h2 className="mobile-drawer__title">Detaylı Bilgiler</h2>
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
                onClick={() => handleNavigate(`/detail/${metric.id}`)}
              >
                <span>{metric.shortLabel}</span>
                <small>
                  {metric.value}
                  {metric.unit}
                </small>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}