import { useState, useRef, useEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
  
    document.addEventListener("mousedown", handleClickOutside);
  
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="settings-fab" ref={containerRef}>
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