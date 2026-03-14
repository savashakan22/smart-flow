import { useState } from "react";
import type { ThemeMode } from "../types/dashboard";

type SettingsFabProps = {
  theme: ThemeMode;
  onToggleTheme: () => void;
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
        aria-label="Ayarları aç"
      >
        ⚙
      </button>

      {open && (
        <div className="settings-panel">
          <div className="settings-panel__header">
            <h3>Ayarlar</h3>
          </div>

          <div className="settings-row">
            <span>Tema</span>

            <button
              type="button"
              className={`theme-switch ${theme === "dark" ? "dark" : "light"}`}
              onClick={onToggleTheme}
            >
              <span className="theme-switch__thumb" />
              <span className="theme-switch__label">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}