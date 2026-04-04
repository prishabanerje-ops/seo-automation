import { useEffect, useState } from "react";
import api from "../api/index.js";
import { useAuth } from "../context/AuthContext.jsx";

const ROLES = ["founder", "seo", "readonly"];
const ROLE_LABELS = { founder: "Founder", seo: "SEO Manager", readonly: "Read-Only" };
const ROLE_COLORS = { founder: "#4836FE", seo: "#10B981", readonly: "#6B7280" };

function RoleBadge({ role }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
      background: ROLE_COLORS[role] + "15", color: ROLE_COLORS[role],
      border: `1px solid ${ROLE_COLORS[role]}30`
    }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export default function ManageUsers() {
  const { user: me } = useAuth();
  const [data, setData] = useState({ users: [], pending: [] });
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("readonly");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/auth/users");
      setData(r.data);
    } catch {}
    setLoading(false);
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    try {
      const r = await api.post("/auth/invite", { email: inviteEmail, role: inviteRole });
      setInviteResult(r.data);
      setInviteEmail("");
      showToast("Invite sent");
      load();
    } catch (err) {
      setInviteResult({ error: err.response?.data?.error || "Failed to send invite" });
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(userId, role) {
    try {
      await api.put(`/auth/users/${userId}/role`, { role });
      showToast("Role updated");
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update role");
    }
  }

  async function removeUser(userId, userName) {
    if (!confirm(`Remove ${userName}? They will lose access immediately.`)) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      showToast("User removed");
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to remove user");
    }
  }

  const inputStyle = {
    padding: "7px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8,
    background: "var(--bg-page)", color: "var(--text-primary)", outline: "none", fontFamily: "inherit"
  };

  return (
    <div style={{ maxWidth: 860, display: "flex", flexDirection: "column", gap: 24 }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "var(--text-primary)", color: "#fff", fontSize: 13, padding: "10px 18px", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 50 }}>
          {toast}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-desc">Invite team members and manage their access.</p>
        </div>
        <button onClick={() => setShowInvite(v => !v)} className={showInvite ? "btn btn-surface" : "btn btn-primary"}>
          {showInvite ? "Cancel" : "+ Invite User"}
        </button>
      </div>

      {showInvite && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Invite a team member</h2>
          <form onSubmit={handleInvite} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Email</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" required style={{ ...inputStyle, width: 240 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={inputStyle}>
                <option value="readonly">Read-Only</option>
                <option value="seo">SEO Manager</option>
                <option value="founder">Founder</option>
              </select>
            </div>
            <button type="submit" disabled={inviting} className="btn btn-primary" style={{ opacity: inviting ? 0.6 : 1 }}>
              {inviting ? "Sending..." : "Send Invite"}
            </button>
          </form>
          {inviteResult && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: inviteResult.error ? "#FEF2F2" : "#F0FDF4", color: inviteResult.error ? "#DC2626" : "#15803D", border: `1px solid ${inviteResult.error ? "#FECACA" : "#BBF7D0"}` }}>
              {inviteResult.error || `Invite link: ${inviteResult.inviteUrl}`}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>Loading...</div>
      ) : (
        <>
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active Users ({data.users.length})
            </div>
            {data.users.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#4836FE", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                  {(u.name || u.email)[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.email}</div>
                </div>
                <RoleBadge role={u.role} />
                {u.id !== me?.sub && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <select value={u.role} onChange={e => changeRole(u.id, e.target.value)} style={{ ...inputStyle, fontSize: 12, padding: "4px 8px" }}>
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                    <button onClick={() => removeUser(u.id, u.name)} className="btn btn-danger" style={{ fontSize: 12 }}>Remove</button>
                  </div>
                )}
                {u.id === me?.sub && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>You</span>}
              </div>
            ))}
          </div>

          {data.pending.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Pending Invites ({data.pending.length})
              </div>
              {data.pending.map(inv => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{inv.email}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Expires {new Date(inv.expires_at).toLocaleDateString()}</div>
                  </div>
                  <RoleBadge role={inv.role} />
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>Pending</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
