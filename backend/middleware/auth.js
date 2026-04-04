const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "seo-automation-dev-secret-change-in-production";

// Routes that bypass JWT check
const PUBLIC_PATHS = [
  { method: "POST", path: "/api/auth/login" },
  { method: "POST", path: "/api/auth/logout" },
  { method: "GET",  path: "/api/auth/me" },
  { method: "POST", path: "/api/auth/register" },
  { method: "POST", path: "/api/auth/invite/accept" },
  { method: "POST", path: "/api/auth/password/reset-request" },
  { method: "POST", path: "/api/auth/password/reset" },
  { method: "GET",  path: "/api/gsc/auth" },
  { method: "GET",  path: "/api/gsc/callback" },
  { method: "GET",  path: "/api/ga4/callback" },
  { method: "GET",  path: "/health" },
];

function isPublic(req) {
  return PUBLIC_PATHS.some(
    (p) => p.method === req.method && req.path === p.path
  );
}

function authMiddleware(req, res, next) {
  if (isPublic(req)) return next();

  const token =
    req.cookies?.auth_token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie("auth_token");
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function optionalAuth(req, res, next) {
  const token =
    req.cookies?.auth_token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}

module.exports = { authMiddleware, optionalAuth, requireRole, JWT_SECRET };
