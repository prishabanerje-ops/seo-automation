const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const crypto  = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/sqlite");
const { JWT_SECRET, requireRole } = require("../middleware/auth");

const router = express.Router();
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "Strict",
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

function makePayload(user) {
  return { sub: user.id, email: user.email, name: user.name, role: user.role };
}

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  // Update last active
  db.prepare("UPDATE users SET last_active_at = datetime('now') WHERE id = ?").run(user.id);

  const payload = makePayload(user);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("auth_token", token, COOKIE_OPTS);
  res.json({ user: payload });
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  res.clearCookie("auth_token");
  res.json({ ok: true });
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
// Public — auth middleware skips this. We verify manually so the frontend
// can detect logged-in state without a 401.
router.get("/me", (req, res) => {
  const token =
    req.cookies?.auth_token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);
  if (!token) return res.json({ user: null });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

// ─── POST /api/auth/register (first-run only) ──────────────────────────────
router.post("/register", async (req, res) => {
  const db = getDb();
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (userCount > 0)
    return res.status(403).json({ error: "Setup already complete. Use invite flow." });

  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: "Email, password and name required" });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters" });

  const hash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)"
  ).run(id, email.toLowerCase().trim(), hash, name.trim(), "founder");

  const payload = { sub: id, email: email.toLowerCase().trim(), name: name.trim(), role: "founder" };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("auth_token", token, COOKIE_OPTS);
  res.status(201).json({ user: payload });
});

// ─── GET /api/auth/setup-status ───────────────────────────────────────────
// Frontend calls this to know whether to show /setup or /login
router.get("/setup-status", (req, res) => {
  const db = getDb();
  const c = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  res.json({ needsSetup: c === 0 });
});

// ─── POST /api/auth/invite (Founder only) ──────────────────────────────────
router.post("/invite", requireRole("founder"), async (req, res) => {
  const { email, role = "readonly" } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  if (!["founder", "seo", "readonly"].includes(role))
    return res.status(400).json({ error: "Invalid role" });

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: "User already exists" });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const id = uuidv4();

  db.prepare(
    "INSERT OR REPLACE INTO invites (id, email, role, token, invited_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, email.toLowerCase(), role, token, req.user.sub, expiresAt);

  // Send invite email if SMTP configured
  try {
    const { sendInviteEmail } = require("../services/email.service");
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    await sendInviteEmail(email, token, req.user.name, frontendUrl);
  } catch (err) {
    console.warn("Invite email failed:", err.message);
  }

  const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/invite/${token}`;
  res.json({ ok: true, inviteUrl, expiresAt });
});

// ─── POST /api/auth/invite/accept (public) ─────────────────────────────────
router.post("/invite/accept", async (req, res) => {
  const { token, name, password } = req.body;
  if (!token || !name || !password)
    return res.status(400).json({ error: "Token, name and password required" });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters" });

  const db = getDb();
  const invite = db.prepare("SELECT * FROM invites WHERE token = ?").get(token);
  if (!invite) return res.status(404).json({ error: "Invalid or expired invite link" });
  if (invite.accepted) return res.status(410).json({ error: "Invite already used" });
  if (new Date(invite.expires_at) < new Date())
    return res.status(410).json({ error: "Invite link has expired (48h)" });

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(invite.email);
  if (existing) return res.status(409).json({ error: "Account already exists for this email" });

  const hash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)"
  ).run(id, invite.email, hash, name.trim(), invite.role);

  db.prepare("UPDATE invites SET accepted = 1 WHERE id = ?").run(invite.id);

  res.json({ ok: true, message: "Account created. You can now log in." });
});

// ─── GET /api/auth/users (Founder only) ────────────────────────────────────
router.get("/users", requireRole("founder"), (req, res) => {
  const db = getDb();
  const users = db.prepare(
    "SELECT id, email, name, role, status, last_active_at, created_at FROM users ORDER BY created_at"
  ).all();
  const pending = db.prepare(
    "SELECT id, email, role, expires_at, accepted, created_at FROM invites WHERE accepted = 0 ORDER BY created_at DESC"
  ).all();
  res.json({ users, pending });
});

// ─── PUT /api/auth/users/:id/role (Founder only) ───────────────────────────
router.put("/users/:id/role", requireRole("founder"), (req, res) => {
  const { role } = req.body;
  if (!["founder", "seo", "readonly"].includes(role))
    return res.status(400).json({ error: "Invalid role" });
  if (req.params.id === req.user.sub)
    return res.status(400).json({ error: "Cannot change your own role" });

  const db = getDb();
  const result = db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "User not found" });
  res.json({ ok: true });
});

// ─── DELETE /api/auth/users/:id (Founder only) ─────────────────────────────
router.delete("/users/:id", requireRole("founder"), (req, res) => {
  if (req.params.id === req.user.sub)
    return res.status(400).json({ error: "Cannot delete your own account" });

  const db = getDb();
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "User not found" });
  res.json({ ok: true });
});

module.exports = router;
