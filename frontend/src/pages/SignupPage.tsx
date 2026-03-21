import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ThemeMode } from "../types/dashboard";
import Navbar from "../components/Navbar";

type Props = {
  theme: ThemeMode;
  onSignup: (profile: { fullName: string; email: string }) => void;
  isAuthenticated: boolean;
  onToggleTheme: (mode: ThemeMode) => void;
};

export default function SignupPage({
  theme,
  onSignup,
  isAuthenticated,
  onToggleTheme,
}: Props) {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password !== passwordAgain) {
      alert("Passwords do not match.");
      return;
    }

    onSignup({
      fullName: fullName.trim() || "New User",
      email,
    });

    navigate("/devices");
  }

  return (
    <main className="auth-page">
      <Navbar
        theme={theme}
        onToggleTheme={onToggleTheme}
        isAuthenticated={isAuthenticated}
      />

      <div className="auth-card">
        <p className="auth-card__eyebrow">New Account</p>
        <h1>Sign Up</h1>
        <p className="auth-card__description">Sign Up</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Name Surname</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Name Surname"
              required
            />
          </label>

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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create password"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={passwordAgain}
              onChange={(e) => setPasswordAgain(e.target.value)}
              placeholder="Please retry"
              required
            />
          </label>

          <button type="submit" className="auth-submit-btn">
            Create Account
          </button>
        </form>

        <p className="auth-footer">
          You have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </main>
  );
}