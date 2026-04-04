import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/index.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function SetupPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Redirect away if setup already done
  useEffect(() => {
    api.get("/auth/setup-status")
      .then(r => {
        if (!r.data.needsSetup) navigate("/login", { replace: true });
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api.post("/auth/register", { email, password, name });
      setUser(r.data.user);
      navigate("/founder", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  if (checking) return null;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#F8F9FB"
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "40px 48px", width: "100%", maxWidth: 440,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #E5E7EB"
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: "#4836FE",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, color: "#fff", marginBottom: 16
          }}>◎</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Create admin account</h1>
          <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
            This is a one-time setup. You are creating the first admin.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Full name", value: name, set: setName, type: "text", ph: "Your name" },
            { label: "Email", value: email, set: setEmail, type: "email", ph: "admin@yourcompany.com" },
            { label: "Password", value: password, set: setPassword, type: "password", ph: "Min 8 characters" },
          ].map(({ label, value, set, type, ph }) => (
            <div key={label}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                {label}
              </label>
              <input
                type={type} value={value} onChange={e => set(e.target.value)}
                placeholder={ph} required
                style={{
                  width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: 8,
                  border: "1px solid #D1D5DB", background: "#fff", color: "#111827",
                  outline: "none", boxSizing: "border-box"
                }}
              />
            </div>
          ))}

          {error && (
            <div style={{ padding: "10px 14px", background: "#FEF2F2", color: "#DC2626", borderRadius: 8, fontSize: 13, border: "1px solid #FECACA" }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", padding: "11px", fontSize: 14, fontWeight: 600,
              borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#A5B4FC" : "#4836FE", color: "#fff",
              marginTop: 4
            }}
          >
            {loading ? "Creating account..." : "Create admin account"}
          </button>
        </form>
      </div>
    </div>
  );
}
