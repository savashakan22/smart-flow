import { Link, useNavigate } from "react-router-dom";
import { metrics } from "../data/metrics";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand navbar__brand--link">
        <div>
          <h1>SmartFlow Dashboard</h1>
          <p>Hydroponic Monitoring Interface</p>
        </div>
      </Link>

      <nav className="navbar__nav">
        <div className="nav-dropdown">
          <button className="nav-link" type="button">
            Detaylı Bilgiler
            <span className="nav-link-arrow"></span>
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