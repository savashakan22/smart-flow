import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ThemeMode } from "../types/dashboard";
import Navbar from "../components/Navbar";

type Props = {
  theme: ThemeMode;
  onLogin: (profile: { fullName: string; email: string }) => void;
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
  const [email, setEmail] = useState("ahmet@mail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    onLogin({
      fullName: "Ahmet Akgun",
      email,
    });

    navigate("/dashboard");
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
        <p className="auth-card__description">Login</p>

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

          <button type="submit" className="auth-submit-btn">
            Log in
          </button>
        </form>

        <p className="auth-footer">
          Don't you have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </main>
  );
}