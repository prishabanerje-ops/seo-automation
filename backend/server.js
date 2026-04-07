require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const { migrate: migrate001 } = require("./db/migrations/001_initial");
const { migrate: migrate002 } = require("./db/migrations/002_v3_additions");
const { migrate: migrate003 } = require("./db/migrations/003_gsc_extended");
const { migrate: migrate004 } = require("./db/migrations/004_site_sf_config");
const { migrate: migrate005 } = require("./db/migrations/005_task_severity");
const { getDb } = require("./db/sqlite");
const { authMiddleware } = require("./middleware/auth");

const crawlRoutes    = require("./routes/crawl");
const reportsRoutes  = require("./routes/reports");
const gscRoutes      = require("./routes/gsc");
const exportRoutes   = require("./routes/export");
const notifyRoutes   = require("./routes/notify");
const scheduleRoutes = require("./routes/schedule");
const pagespeedRoutes = require("./routes/pagespeed");
const settingsRoutes = require("./routes/settings");
const authRoutes     = require("./routes/auth");
const aiRoutes       = require("./routes/ai");
const ga4Routes      = require("./routes/ga4");
const linearRoutes   = require("./routes/linear");
const sitesRoutes    = require("./routes/sites");
const tasksRoutes    = require("./routes/tasks");

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: FRONTEND_URL, methods: ["GET", "POST"], credentials: true }
});

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.locals.io = io;

// Health check (public)
app.get("/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// Auth middleware applied globally.
// PUBLIC_PATHS whitelist in middleware/auth.js exempts login, register, callbacks.
app.use(authMiddleware);

// Routes
app.use("/api/auth",      authRoutes);
app.use("/api/sites",     sitesRoutes);
app.use("/api/tasks",     tasksRoutes);
app.use("/api/ai",        aiRoutes);
app.use("/api/ga4",       ga4Routes);
app.use("/api/linear",    linearRoutes);
app.use("/api/crawl",     crawlRoutes);
app.use("/api/reports",   reportsRoutes);
app.use("/api/gsc",       gscRoutes);
app.use("/api/export",    exportRoutes);
app.use("/api/notify",    notifyRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/pagespeed", pagespeedRoutes);
app.use("/api/settings",  settingsRoutes);

io.on("connection", (socket) => {
  socket.on("disconnect", () => {});
});

function init() {
  migrate001();
  migrate002();
  migrate003();
  migrate004();
  migrate005();

  const db = getDb();

  // Load saved settings into process.env
  const settingsRows = db.prepare("SELECT key, value FROM settings").all();
  for (const { key, value } of settingsRows) {
    if (key === "gsc_tokens") continue;
    if (value) process.env[key.toUpperCase()] = value;
  }

  // Mark stale running jobs as failed
  db.prepare(
    "UPDATE crawl_jobs SET status = 'failed', completed_at = datetime('now') WHERE status = 'running'"
  ).run();

  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (userCount === 0) {
    console.log("No users yet — visit /setup to create your admin account.");
  }

  const { loadAllSchedules } = require("./services/scheduler.service");
  loadAllSchedules(io);

  console.log("SEO Automation backend ready.");
}

init();

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

module.exports = { io };
