import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import "./App.css";

import type { ThemeMode } from "./types/dashboard";
import OverviewPage from "./pages/OverviewPage";
import DetailPage from "./pages/DetailedPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import DeviceSelectionPage from "./pages/DeviceSelectionPage";

type UserProfile = {
  fullName: string;
  email: string;
};

function ProtectedRoute({ isAuthenticated }: { isAuthenticated: boolean }) {
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("auth_session") === "true";
  });

  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("auth_user");
    return saved
      ? JSON.parse(saved)
      : { fullName: "Ahmet Akgün", email: "ahmet@example.com" };
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const authActions = useMemo(
    () => ({
      login: (profile: UserProfile) => {
        localStorage.setItem("auth_session", "true");
        localStorage.setItem("auth_user", JSON.stringify(profile));
        setUser(profile);
        setIsAuthenticated(true);
      },
      signup: (profile: UserProfile) => {
        localStorage.setItem("auth_session", "true");
        localStorage.setItem("auth_user", JSON.stringify(profile));
        setUser(profile);
        setIsAuthenticated(true);
      },
      logout: () => {
        localStorage.removeItem("auth_session");
        setIsAuthenticated(false);
      },
      updateUser: (profile: UserProfile) => {
        localStorage.setItem("auth_user", JSON.stringify(profile));
        setUser(profile);
      },
    }),
    []
  );

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            theme={theme}
            isAuthenticated={isAuthenticated}
            user={user}
            onToggleTheme={setTheme}
          />
        }
      />

      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/devices" replace />
          ) : (
            <LoginPage
              theme={theme}
              onLogin={authActions.login}
              isAuthenticated={isAuthenticated}
              onToggleTheme={setTheme}
            />
          )
        }
      />

      <Route
        path="/signup"
        element={
          isAuthenticated ? (
            <Navigate to="/devices" replace />
          ) : (
            <SignupPage
              theme={theme}
              onSignup={authActions.signup}
              isAuthenticated={isAuthenticated}
              onToggleTheme={setTheme}
            />
          )
        }
      />

      <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
        <Route
          path="/devices"
          element={
            <DeviceSelectionPage
              theme={theme}
              user={user}
              isAuthenticated={isAuthenticated}
              onToggleTheme={setTheme}
            />
          }
        />

        <Route
          path="/devices/:deviceId/dashboard"
          element={
            <OverviewPage
              theme={theme}
              onToggleTheme={setTheme}
              isAuthenticated={isAuthenticated}
            />
          }
        />
        
        <Route
          path="/devices/:deviceId/detail/:metricId"
          element={
            <DetailPage
              theme={theme}
              onToggleTheme={setTheme}
              isAuthenticated={isAuthenticated}
            />
          }
        />

        <Route
          path="/profile"
          element={
            <ProfilePage
              theme={theme}
              user={user}
              onLogout={authActions.logout}
              onSaveProfile={authActions.updateUser}
              isAuthenticated={isAuthenticated}
              onToggleTheme={setTheme}
            />
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}