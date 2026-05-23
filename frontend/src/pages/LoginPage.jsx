import React, { useMemo, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { IdCard, Lock, Loader2, UserRound } from "lucide-react";
import { apiFetch } from "../lib/api.js";

export const LoginPage = () => {
  const navigate = useNavigate();
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const particles = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => ({
        id: index,
        left: `${(index * 29) % 100}%`,
        top: `${(index * 47) % 100}%`,
        delay: `${(index % 9) * 0.36}s`,
        size: `${2 + (index % 4)}px`,
      })),
    []
  );
  const nodes = useMemo(
    () =>
      [
        ["8%", "22%"],
        ["18%", "82%"],
        ["28%", "14%"],
        ["42%", "77%"],
        ["56%", "19%"],
        ["71%", "69%"],
        ["86%", "28%"],
        ["92%", "76%"],
      ].map(([left, top], index) => ({ id: index, left, top })),
    []
  );

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: username.trim(), password }
          : { name: name.trim(), email: username.trim(), password };

      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Authentication failed");
      }

      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (credential) => {
    setGoogleLoading(true);
    setError("");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      if (!credential) {
        throw new Error("Google did not return a credential. Please try again.");
      }

      const res = await apiFetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Google authentication failed");
      }

      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Google sign-in is taking too long. Please try again.");
      } else {
        setError(err.message || "Google authentication failed");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setGoogleLoading(false);
    }
  };

  return (
    <main className="cyber-login-page">
      <div className="cyber-grid" aria-hidden="true" />
      <div className="cyber-vignette" aria-hidden="true" />

      <div className="cyber-circuit cyber-circuit-outer" aria-hidden="true" />
      <div className="cyber-circuit cyber-circuit-middle" aria-hidden="true" />
      <div className="cyber-circuit cyber-circuit-inner" aria-hidden="true" />

      <div className="cyber-trace cyber-trace-top-left" aria-hidden="true" />
      <div className="cyber-trace cyber-trace-top-right" aria-hidden="true" />
      <div className="cyber-trace cyber-trace-bottom-left" aria-hidden="true" />
      <div className="cyber-trace cyber-trace-bottom-right" aria-hidden="true" />

      {particles.map((particle) => (
        <span
          key={particle.id}
          className="cyber-particle"
          style={{
            "--particle-left": particle.left,
            "--particle-top": particle.top,
            "--particle-delay": particle.delay,
            "--particle-size": particle.size,
          }}
          aria-hidden="true"
        />
      ))}

      {nodes.map((node) => (
        <span
          key={node.id}
          className="cyber-node"
          style={{ "--node-left": node.left, "--node-top": node.top }}
          aria-hidden="true"
        />
      ))}

      <motion.section
        className={`cyber-login-panel ${mode === "register" ? "cyber-login-panel-signup" : ""}`}
        initial={{ opacity: 0, y: 34, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.012 }}
      >
        <div className="cyber-panel-border cyber-panel-border-a" aria-hidden="true" />
        <div className="cyber-panel-border cyber-panel-border-b" aria-hidden="true" />
        <div className="cyber-panel-scan" aria-hidden="true" />

        <div className="cyber-panel-header">
          <span className="cyber-panel-kicker">AI SECURE ACCESS</span>
          <h1>{mode === "login" ? "LOGIN" : "SIGN UP"}</h1>
          <p>{mode === "login" ? "Authenticate to continue" : "Initialize operator profile"}</p>
        </div>

        <form onSubmit={submit} className="cyber-login-form">
          {mode === "register" ? (
            <label className="cyber-field">
              <span>Full Name</span>
              <div className="cyber-field-shell">
                <IdCard className="cyber-field-icon" aria-hidden="true" />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                placeholder="your full name"
                  autoComplete="name"
                  required
                />
              </div>
            </label>
          ) : null}

          <label className="cyber-field">
            <span>Username</span>
            <div className="cyber-field-shell">
              <UserRound className="cyber-field-icon" aria-hidden="true" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="you@example.com"
                autoComplete="username"
                required
              />
            </div>
          </label>

          <label className="cyber-field">
            <span>Password</span>
            <div className="cyber-field-shell">
              <Lock className="cyber-field-icon" aria-hidden="true" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="access key"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error ? <div className="cyber-error">{error}</div> : null}

          <motion.button
            type="submit"
            disabled={loading}
            className="cyber-login-button"
            whileHover={{ scale: 1.025 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="cyber-button-glow" aria-hidden="true" />
            {loading ? (
              <>
                <Loader2 className="cyber-button-loader" aria-hidden="true" />
                VERIFYING
              </>
            ) : (
              mode === "login" ? "LOGIN" : "SIGN UP"
            )}
          </motion.button>

          {googleClientId ? (
            <>
              <div className="cyber-divider">
                <span>OR</span>
              </div>

              <div className="cyber-google-shell">
                {googleLoading ? (
                  <div className="cyber-google-loading">
                    <Loader2 className="cyber-button-loader" aria-hidden="true" />
                    CONNECTING GOOGLE
                  </div>
                ) : (
                  <div className="cyber-google-frame">
                    <GoogleLogin
                      width={mode === "register" ? "354" : "366"}
                      text="continue_with"
                      shape="pill"
                      theme="outline"
                      size="large"
                      logo_alignment="center"
                      onSuccess={(response) => signInWithGoogle(response.credential)}
                      onError={() => setError("Google sign-in failed. Please try again.")}
                    />
                  </div>
                )}
              </div>
            </>
          ) : null}
        </form>

        <div className="cyber-panel-footer">
          <span className="cyber-auth-hint">
            {mode === "login" ? "Need access?" : "Already have access?"}
          </span>
          <button
            type="button"
            className="cyber-mode-toggle"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "SIGN UP" : "RETURN TO LOGIN"}
          </button>
          <Link to="/">RETURN HOME</Link>
        </div>
      </motion.section>
    </main>
  );
};
