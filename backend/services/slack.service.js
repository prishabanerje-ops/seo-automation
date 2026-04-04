const https = require("https");
const { URL } = require("url");

function sendSlack(message) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("SLACK_WEBHOOK_URL not configured");

  const body = JSON.stringify(typeof message === "string" ? { text: message } : message);
  const parsed = new URL(webhookUrl);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function buildCrawlSummaryMessage(site, crawlJob, issueCounts) {
  const total = (issueCounts.critical || 0) + (issueCounts.warning || 0) + (issueCounts.info || 0);
  return {
    text: `SEO Audit Complete: *${site.label}*`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `SEO Audit Complete: ${site.label}` }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*URLs Crawled:*\n${crawlJob.total_urls ?? "—"}` },
          { type: "mrkdwn", text: `*Total Issues:*\n${total}` },
          { type: "mrkdwn", text: `*Critical:*\n${issueCounts.critical || 0}` },
          { type: "mrkdwn", text: `*Warnings:*\n${issueCounts.warning || 0}` }
        ]
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `Completed: ${new Date(crawlJob.completed_at).toLocaleString()} · Dashboard: http://localhost:5173` }
        ]
      }
    ]
  };
}

module.exports = { sendSlack, buildCrawlSummaryMessage };
