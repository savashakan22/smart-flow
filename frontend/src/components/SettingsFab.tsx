import { useState } from "react";
import type { ThemeMode } from "../types/dashboard";

type SettingsFabProps = {
  theme: ThemeMode;
  onToggleTheme: (mode: ThemeMode) => void;
};

export default function SettingsFab({
  theme,
  onToggleTheme,
}: SettingsFabProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="settings-fab">
      <button
        type="button"
        className="settings-fab__button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Ayarlar"
      >
        ⚙
      </button>
    
      <div className={`settings-panel ${open ? "open" : "closed"}`}>
        <div className="settings-panel__header">
          <h3>Ayarlar</h3>
        </div>
    
        <div className="settings-row">
          <span>Tema</span>
    
          <div className={`theme-switcher ${theme}`}>
            <div className="theme-switcher__pill" />
    
            <button
              className={`theme-switcher__option ${theme === "light" ? "active" : ""}`}
              onClick={() => onToggleTheme("light")}
            >
              Light
            </button>
    
            <button
              className={`theme-switcher__option ${theme === "dark" ? "active" : ""}`}
              onClick={() => onToggleTheme("dark")}
            >
              Dark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}