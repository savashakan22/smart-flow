import { Link, useNavigate } from "react-router-dom";
import { metrics } from "../data/metrics";
import { useEffect, useState } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (metricId: string) => {
    navigate(`/detail/${metricId}`);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="navbar">
        <Link to="/" className="navbar__brand navbar__brand--link">
          <div>
            <h1>SmartFlow Dashboard</h1>
            <p>Hydroponic Monitoring Interface</p>
          </div>
        </Link>

        <nav className="navbar__nav">
          <div className="nav-dropdown nav-dropdown--desktop">
            <button className="nav-link" type="button">
              Detaylı Bilgiler
              <span className="nav-link-arrow" />
            </button>

            <div className="nav-dropdown__menu">
              {metrics.map((metric) => (
                <button
                  key={metric.id}
                  type="button"
                  className="nav-dropdown__item"
                  onClick={() => navigate(`/detail/${metric.id}`)}
                >
                  {metric.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={`hamburger-button ${mobileMenuOpen ? "open" : ""}`}
            aria-label="Menüyü aç"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
        </nav>
      </header>

      <div className={`mobile-drawer ${mobileMenuOpen ? "open" : ""}`}>
        <div
          className="mobile-drawer__backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />

        <aside className="mobile-drawer__panel">
          <div className="mobile-drawer__header">
            <h2 className="mobile-drawer__title">Detaylı Bilgiler</h2>
            <button
              type="button"
              className="mobile-drawer__close"
              aria-label="Menüyü kapat"
              onClick={() => setMobileMenuOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="mobile-drawer__content">
            {metrics.map((metric) => (
              <button
                key={metric.id}
                type="button"
                className="mobile-drawer__item"
                onClick={() => handleNavigate(metric.id)}
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