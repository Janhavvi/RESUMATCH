import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Rocket, Loader2 } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { apiFetch } from "../lib/api.js";

export const LoginPage = () => {
  const navigate = useNavigate();
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(Boolean(googleClientId));
  const [serverGoogleClientId, setServerGoogleClientId] = useState("");

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const res = await apiFetch("/api/auth/google/config");
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        
        if (data?.enabled && data?.clientId) {
          setServerGoogleClientId(data.clientId);
          setGoogleEnabled(Boolean(googleClientId || data.clientId));
        } else {
          setGoogleEnabled(Boolean(googleClientId));
          console.debug("Google OAuth not configured on server");
        }
      } catch (err) {
        if (!active) return;
        setGoogleEnabled(Boolean(googleClientId));
        console.debug("Failed to load Google OAuth config:", err.message);
      }
    };
    loadConfig();
    return () => {
      active = false;
    };
  }, []);

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    try {
      if (!credentialResponse?.credential) {
        throw new Error("No credential received from Google");
      }

      const res = await apiFetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(data?.error || "Invalid Google credentials. Please check your Google Cloud Console OAuth configuration.");
        }
        if (res.status === 500) {
          throw new Error("Server error: Google OAuth is not properly configured. Please contact support.");
        }
        throw new Error(data?.error || "Google login failed");
      }

      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      console.error("Google auth error:", err);
      setError(err.message || "Google login failed. Please try again or use email/password login.");
    }
  };

  const googleClientIdForButton = googleClientId || serverGoogleClientId;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: email.trim(), password }
          : { name: name.trim(), email: email.trim(), password };

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

  return (
    <div className="min-h-screen bg-[#0a0514] text-slate-100 flex items-center justify-center p-6">
      <div className="absolute top-0 right-0 w-[560px] h-[560px] bg-indigo-600/10 rounded-full blur-[110px] pointer-events-none" />
      <div className="w-full max-w-md p-8 rounded-[32px] glass border border-white/10 relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Rocket className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">RESUMATCH</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {mode === "register" && (
            <Field
              label="Full Name"
              value={name}
              onChange={setName}
              placeholder="Enter your name"
              required
            />
          )}

          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            type="email"
            required
          />

          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Enter password"
            type="password"
            required
          />

          {error ? (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold tracking-wide transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Please wait
              </>
            ) : mode === "login" ? (
              "Login"
            ) : (
              "Create Account"
            )}
          </button>

          {googleEnabled ? (
            <>
              <div className="relative py-1">
                <div className="h-px bg-white/10" />
                <span className="absolute left-1/2 -translate-x-1/2 -top-2 px-2 text-[10px] uppercase tracking-widest text-slate-500 bg-[#0a0514]">
                  or
                </span>
              </div>

              <div className="min-h-12 flex justify-center items-center">
                {googleClientId ? (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                      setError("Google login failed");
                    }}
                  />
                ) : (
                  <GoogleIdentityButton
                    clientId={googleClientIdForButton}
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google login failed")}
                  />
                )}
              </div>
            </>
          ) : null}
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            {mode === "login" ? "Create one" : "Login"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs uppercase tracking-widest text-slate-500 hover:text-slate-300">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text", placeholder, required }) => (
  <label className="block">
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
      {label}
    </span>
    <input
      id={label.toLowerCase().replace(/\s+/g, "-")}
      name={label.toLowerCase().replace(/\s+/g, "-")}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full h-12 rounded-xl bg-black/40 border border-white/10 px-4 text-sm focus:border-indigo-500 outline-none transition-colors"
    />
  </label>
);

const GoogleIdentityButton = ({ clientId, onSuccess, onError }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    let cancelled = false;

    const loadScript = () =>
      new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }

        const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existing) {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", reject, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });

    loadScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: onSuccess,
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          width: 320,
        });
      })
      .catch(onError);

    return () => {
      cancelled = true;
    };
  }, [clientId, onSuccess, onError]);

  return <div ref={buttonRef} className="min-h-10" />;
};
