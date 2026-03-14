import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import type { ThemeMode } from "./types/dashboard";
import OverviewPage from "./pages/OverviewPage";
import DetailPage from "./pages/DetailedPage";

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <OverviewPage
            theme={theme}
            onToggleTheme={() =>
              setTheme((prev) => (prev === "light" ? "dark" : "light"))
            }
          />
        }
      />

      <Route
        path="/detail/:metricId"
        element={
          <DetailPage
            theme={theme}
            onToggleTheme={() =>
              setTheme((prev) => (prev === "light" ? "dark" : "light"))
            }
          />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}