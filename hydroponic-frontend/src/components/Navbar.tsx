import { Link, useNavigate } from "react-router-dom";
import type { ThemeMode } from "../types/dashboard";

type Props = {
  theme: ThemeMode;
  onToggleTheme: (mode: ThemeMode) => void;
  isAuthenticated: boolean;
};

export default function Navbar({
  theme,
  onToggleTheme,
  isAuthenticated,
}: Props) {
  const navigate = useNavigate();

  function handleThemeToggle() {
    onToggleTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <header className="global-navbar">
      <Link to="/" className="global-navbar__brand">
        Smart-Flow Dashboard
      </Link>

      <div className="global-navbar__actions">
        <button
          type="button"
          className="global-navbar__icon-btn"
          onClick={handleThemeToggle}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>

        <button
          type="button"
          className="global-navbar__profile-btn"
          onClick={() => navigate(isAuthenticated ? "/profile" : "/login")}
          aria-label={isAuthenticated ? "Open profile" : "Go to login"}
          title={isAuthenticated ? "Profile" : "Log in"}
        >
          {isAuthenticated ? "👤" : "➜"}
        </button>
      </div>
    </header>
  );
}