import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Rocket, Loader2 } from "lucide-react";
import { apiFetch } from "../lib/api.js";

export const LoginPage = () => {
  const navigate = useNavigate();
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const [tilt, setTilt] = useState({ x: "4deg", y: "-5deg" });
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!googleClientId) return;
    apiFetch("/api/auth/google/config").catch(() => {});
  }, [googleClientId]);

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

  const updateTilt = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: `${(-y * 8 + 2).toFixed(2)}deg`,
      y: `${(x * 10 - 3).toFixed(2)}deg`,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0514] text-slate-100 flex items-center justify-center p-6 scene-3d overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-72 depth-grid pointer-events-none" />
      <div className="absolute left-[8%] top-[17%] hidden lg:block prism-3d opacity-70 pointer-events-none" />
      <div className="absolute right-[12%] bottom-[18%] hidden lg:block wire-cube-3d opacity-60 pointer-events-none" />
      <div className="absolute left-[14%] bottom-[22%] hidden xl:block layer-stack-3d opacity-55 pointer-events-none">
        <span />
        <span />
        <span />
      </div>
      <div className="absolute top-0 right-0 w-[560px] h-[560px] bg-indigo-600/10 rounded-full blur-[110px] pointer-events-none" />
      <div
        className="w-full max-w-md p-8 rounded-[32px] glass border border-white/10 relative z-10 card-3d float-3d holo-sheen"
        onMouseMove={updateTilt}
        onMouseLeave={() => setTilt({ x: "4deg", y: "-5deg" })}
        style={{ "--tilt-x": tilt.x, "--tilt-y": tilt.y }}
      >
        <div className="flex items-center gap-3 mb-8 lift-3d">
          <div className="size-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center logo-3d">
            <Rocket className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">RESUMATCH</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5 lift-3d">
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
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold tracking-wide transition-all flex items-center justify-center gap-2 button-3d"
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

          {googleClientId ? (
            <>
              <div className="relative py-1">
                <div className="h-px bg-white/10" />
                <span className="absolute left-1/2 -translate-x-1/2 -top-2 px-2 text-[10px] uppercase tracking-widest text-slate-500 bg-[#0a0514]">
                  or
                </span>
              </div>

              <div className="min-h-12 flex justify-center items-center">
                {googleLoading ? (
                  <div className="w-full h-11 rounded-xl bg-white/90 text-slate-900 font-bold flex items-center justify-center gap-2 field-3d">
                    <Loader2 className="size-4 animate-spin" /> Connecting
                  </div>
                ) : (
                  <GoogleLogin
                    width="478"
                    text="continue_with"
                    shape="rectangular"
                    onSuccess={(response) => signInWithGoogle(response.credential)}
                    onError={() => setError("Google sign-in failed. Please try again.")}
                  />
                )}
              </div>
            </>
          ) : null}
        </form>

        <div className="mt-6 text-center text-sm text-slate-400 lift-3d">
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

        <div className="mt-4 text-center lift-3d">
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
      className="w-full h-12 rounded-xl bg-black/40 border border-white/10 px-4 text-sm focus:border-indigo-500 outline-none transition-colors field-3d"
    />
  </label>
);
