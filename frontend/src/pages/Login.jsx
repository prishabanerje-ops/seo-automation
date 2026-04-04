import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/index.js";
import { useAuth } from "../context/AuthContext.jsx";

const ROLE_DEFAULTS = { founder: "/founder", seo: "/audit", readonly: "/founder" };

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If no users exist yet, send to setup
  useEffect(() => {
    api.get("/auth/setup-status")
      .then(r => { if (r.data.needsSetup) navigate("/setup", { replace: true }); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api.post("/auth/login", { email, password });
      setUser(r.data.user);
      const from = location.state?.from?.pathname;
      const dest = from && from !== "/login" ? from : ROLE_DEFAULTS[r.data.user.role] || "/";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#F8F9FB"
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "40px 48px", width: "100%", maxWidth: 420,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #E5E7EB"
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: "#4836FE",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, color: "#fff", marginBottom: 16
          }}>
            ◎
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Sign in</h1>
          <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>SEO Audit Platform</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoFocus
              style={{
                width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: 8,
                border: "1px solid #D1D5DB", background: "#fff", color: "#111827",
                outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{
                width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: 8,
                border: "1px solid #D1D5DB", background: "#fff", color: "#111827",
                outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", background: "#FEF2F2", color: "#DC2626",
              borderRadius: 8, fontSize: 13, border: "1px solid #FECACA"
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", padding: "11px", fontSize: 14, fontWeight: 600,
              borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#A5B4FC" : "#4836FE", color: "#fff",
              marginTop: 4, transition: "background 0.15s"
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
