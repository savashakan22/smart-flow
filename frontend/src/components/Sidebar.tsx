import { Link, useLocation, useNavigate } from "react-router-dom";
import { metrics } from "../data/metrics";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar__brand">
        <div>
          <h1>SmartFlow Dashboard</h1>
          <p>Hydroponic Monitoring Interface</p>
        </div>
      </Link>

      <div className="sidebar__section">
        <p className="sidebar__section-title">Navigasyon</p>

        <button
          type="button"
          className={`sidebar__item ${location.pathname === "/" ? "active" : ""}`}
          onClick={() => navigate("/")}
        >
          Genel Görünüm
        </button>
      </div>

      <div className="sidebar__section">
        <p className="sidebar__section-title">Detaylı Bilgiler</p>

        <div className="sidebar__menu">
          {metrics.map((metric) => {
            const isActive = location.pathname === `/detail/${metric.id}`;

            return (
              <button
                key={metric.id}
                type="button"
                className={`sidebar__item ${isActive ? "active" : ""}`}
                onClick={() => navigate(`/detail/${metric.id}`)}
              >
                <span>{metric.shortLabel}</span>
                <small>{metric.value}{metric.unit}</small>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}