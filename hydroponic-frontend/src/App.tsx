import { useCallback, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { onAuthStateChanged, signOut, updateProfile, type User } from "firebase/auth";
import "./App.css";

import type { ThemeMode } from "./types/dashboard";
import OverviewPage from "./pages/OverviewPage";
import DetailPage from "./pages/DetailedPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import DeviceSelectionPage from "./pages/DeviceSelectionPage";
import { devices as initialDevices, mapDeviceIdToCard, type Device } from "./data/devices";
import { auth } from "./lib/firebase";
import { claimDevice, fetchDevices, unclaimDevice } from "./services/api";

type UserProfile = {
  fullName: string;
  email: string;
};

function ProtectedRoute({
  isAuthenticated,
  authReady,
}: {
  isAuthenticated: boolean;
  authReady: boolean;
}) {
  if (!authReady) return null;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function profileFromUser(user: User): UserProfile {
  return {
    fullName: user.displayName ?? "SmartFlow User",
    email: user.email ?? "",
  };
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(!auth);
  const [user, setUser] = useState<UserProfile>({ fullName: "", email: "" });
  const [token, setToken] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>(initialDevices);

  const loadDevices = useCallback(async (idToken: string) => {
    const response = await fetchDevices(idToken);
    setDevices(response.devices.map(mapDeviceIdToCard));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setIsAuthenticated(false);
        setUser({ fullName: "", email: "" });
        setToken(null);
        setDevices([]);
        setAuthReady(true);
        return;
      }

      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);
      setUser(profileFromUser(firebaseUser));
      setIsAuthenticated(true);

      try {
        await loadDevices(idToken);
      } catch (error) {
        console.error(error);
      } finally {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, [loadDevices]);

  const authActions = useMemo(
    () => ({
      login: async (firebaseUser: User) => {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        setUser(profileFromUser(firebaseUser));
        setIsAuthenticated(true);
        await loadDevices(idToken);
      },
      signup: async (firebaseUser: User, fullName: string) => {
        if (auth?.currentUser && fullName) {
          await updateProfile(auth.currentUser, { displayName: fullName });
        }

        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        setUser({ fullName: fullName || "SmartFlow User", email: firebaseUser.email ?? "" });
        setIsAuthenticated(true);
        await loadDevices(idToken);
      },
      logout: async () => {
        if (auth) {
          await signOut(auth);
        }
        setToken(null);
        setIsAuthenticated(false);
      },
      updateUser: async (profile: UserProfile) => {
        if (auth?.currentUser) {
          await updateProfile(auth.currentUser, { displayName: profile.fullName });
        }
        setUser(profile);
      },
    }),
    [loadDevices]
  );

  async function handleClaimDevice(claimCode: string) {
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await claimDevice(claimCode, token);
    if (!response.success) {
      throw new Error(response.detail ?? "Unable to claim device");
    }

    await loadDevices(token);
  }

  async function handleUnclaimDevice(deviceId: string) {
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await unclaimDevice(deviceId, token);
    if (!response.success) {
      throw new Error(response.detail ?? "Unable to unclaim device");
    }

    await loadDevices(token);
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          !authReady ? (
            null
          ) : isAuthenticated ? (
            <Navigate to="/devices" replace />
          ) : (
            <LandingPage
              theme={theme}
              isAuthenticated={isAuthenticated}
              user={user}
              onToggleTheme={setTheme}
            />
          )
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

      <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} authReady={authReady} />}>
        <Route
          path="/devices"
          element={
            <DeviceSelectionPage
              theme={theme}
              user={user}
              devices={devices}
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
              token={token}
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
              token={token}
            />
          }
        />

        <Route
          path="/profile"
          element={
            <ProfilePage
              theme={theme}
              user={user}
              devices={devices}
              onClaimDevice={handleClaimDevice}
              onUnclaimDevice={handleUnclaimDevice}
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
