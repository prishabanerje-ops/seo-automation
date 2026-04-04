import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/index.js";

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/invite/accept", { token, name, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to accept invite");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: 8,
    border: "1px solid #D1D5DB", background: "#fff", color: "#111827",
    outline: "none", boxSizing: "border-box"
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FB" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 48px", width: "100%", maxWidth: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #E5E7EB" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#4836FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", marginBottom: 16 }}>◎</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Accept invite</h1>
          <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>Create your SEO Audit Platform account</p>
        </div>

        {done ? (
          <div style={{ padding: "16px", background: "#F0FDF4", color: "#15803D", borderRadius: 8, fontSize: 14, textAlign: "center" }}>
            Account created! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Full name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required style={inputStyle} />
            </div>
            {error && <div style={{ padding: "10px 14px", background: "#FEF2F2", color: "#DC2626", borderRadius: 8, fontSize: 13, border: "1px solid #FECACA" }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "11px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "#A5B4FC" : "#4836FE", color: "#fff" }}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
