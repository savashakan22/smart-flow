import { Link, useNavigate } from "react-router-dom";
import { metrics } from "../data/metrics";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <Link to="/" className="navbar__logoText">
          SF
        </Link>

        <div>
          <h1>SmartFlow Dashboard</h1>
          <p>Hydroponic Monitoring Interface</p>
        </div>
      </div>

      <nav className="navbar__nav">
        <Link to="/" className="nav-link nav-link--router">
          Overview
        </Link>

        <div className="nav-dropdown">
          <button className="nav-link" type="button">
            Detaylı Bilgiler
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
      </nav>
    </header>
  );
}