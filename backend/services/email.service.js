const nodemailer = require("nodemailer");

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function buildReportHtml(site, crawlJob, issueCounts) {
  const critical = issueCounts.critical || 0;
  const warning = issueCounts.warning || 0;
  const info = issueCounts.info || 0;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #1f2937; background: #f9fafb; }
  .container { max-width: 600px; margin: 24px auto; background: white; border-radius: 8px; overflow: hidden; }
  .header { background: ${site.color || "#3b82f6"}; color: white; padding: 24px; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
  .body { padding: 24px; }
  .stats { display: flex; gap: 16px; margin-bottom: 24px; }
  .stat { flex: 1; text-align: center; padding: 16px; border-radius: 6px; }
  .stat.critical { background: #fef2f2; border: 1px solid #fecaca; }
  .stat.warning { background: #fffbeb; border: 1px solid #fde68a; }
  .stat.info { background: #eff6ff; border: 1px solid #bfdbfe; }
  .stat .num { font-size: 28px; font-weight: bold; }
  .stat .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .footer { padding: 16px 24px; background: #f3f4f6; font-size: 12px; color: #9ca3af; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>SEO Audit Complete: ${site.label}</h1>
    <p>Completed: ${new Date(crawlJob.completed_at).toLocaleString()} &middot; ${crawlJob.total_urls ?? 0} URLs crawled</p>
  </div>
  <div class="body">
    <div class="stats">
      <div class="stat critical"><div class="num" style="color:#ef4444">${critical}</div><div class="label">Critical Issues</div></div>
      <div class="stat warning"><div class="num" style="color:#f59e0b">${warning}</div><div class="label">Warnings</div></div>
      <div class="stat info"><div class="num" style="color:#3b82f6">${info}</div><div class="label">Info</div></div>
    </div>
    <p style="font-size:13px;color:#6b7280">View full results in your <a href="http://localhost:5173">SEO Automation Dashboard</a>.</p>
  </div>
  <div class="footer">SEO Automation Dashboard &middot; ${new Date().getFullYear()}</div>
</div>
</body></html>`;
}

async function sendReport(site, crawlJob, issueCounts) {
  if (!process.env.SMTP_HOST || !process.env.EMAIL_TO) throw new Error("Email not configured");
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: process.env.EMAIL_TO,
    subject: `SEO Audit Complete: ${site.label} — ${issueCounts.critical || 0} critical issues`,
    html: buildReportHtml(site, crawlJob, issueCounts)
  });
}

async function testEmail() {
  if (!process.env.SMTP_HOST) throw new Error("SMTP_HOST not configured");
  const transporter = getTransporter();
  await transporter.verify();
  return true;
}

module.exports = { sendReport, testEmail };

async function sendInviteEmail(toEmail, token, inviterName, frontendUrl) {
  if (!process.env.SMTP_HOST) return;
  const transporter = getTransporter();
  const acceptUrl = `${frontendUrl}/invite/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: `${inviterName} invited you to SEO Audit Platform`,
    html: `<p>${inviterName} has invited you to join the SEO Audit Platform.</p>
           <p><a href="${acceptUrl}">Accept invite and create your account</a></p>
           <p>This link expires in 48 hours.</p>`
  });
}

exports.sendInviteEmail = sendInviteEmail;
