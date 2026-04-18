import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, type User } from "firebase/auth";
import type { ThemeMode } from "../types/dashboard";
import Navbar from "../components/Navbar";
import { assertFirebaseConfigured, auth } from "../lib/firebase";

type Props = {
  theme: ThemeMode;
  onLogin: (user: User) => Promise<void>;
  isAuthenticated: boolean;
  onToggleTheme: (mode: ThemeMode) => void;
};

export default function LoginPage({
  theme,
  onLogin,
  isAuthenticated,
  onToggleTheme,
}: Props) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("example@mail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      assertFirebaseConfigured();
      const credential = await signInWithEmailAndPassword(auth!, email, password);
      await onLogin(credential.user);
      navigate("/devices");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Login failed");
    }
  }

  return (
    <main className="auth-page">
      <Navbar
        theme={theme}
        onToggleTheme={onToggleTheme}
        isAuthenticated={isAuthenticated}
      />

      <div className="auth-card">
        <p className="auth-card__eyebrow">Welcome</p>
        <h1>Login</h1>
        <p className="auth-card__description">Use your Firebase account to continue.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-password-row">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                className="auth-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit-btn">
            Log in
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t you have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </main>
  );
}
