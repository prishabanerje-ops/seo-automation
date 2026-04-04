const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/sqlite");

const router = express.Router();

function getAnthropicKey() {
  // Check process.env first, then settings table
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'anthropic_api_key'").get();
    return row?.value || null;
  } catch { return null; }
}

const PROMPT_TEMPLATE = (data) => `You are a senior technical SEO engineer with 10+ years of experience.
Give precise, actionable fix recommendations. Be specific about code, config, or CMS changes required. No generic advice. No filler.

Issue: ${data.name}
Category: ${data.category}
Severity: ${data.severity}
Site URL: ${data.siteUrl || "Unknown"}
Affected URLs (sample):
${(data.urls || []).slice(0, 5).map(u => `  - ${u}`).join("\n") || "  (no URLs provided)"}
Total affected URLs: ${data.totalUrls || "Unknown"}
Detection method: ${data.detectionMethod || "Screaming Frog"}

Provide your response in this exact structure:
1. Root cause (2-3 sentences max)
2. Step-by-step fix (numbered, specific — include code/config where applicable)
3. Verification method (how to confirm the fix worked)
4. Priority: fix this week / fix this sprint / fix this quarter`;

// POST /api/ai/suggest
router.post("/suggest", async (req, res) => {
  const { checkId, jobId, siteId, issueData } = req.body;
  if (!issueData?.name) return res.status(400).json({ error: "issueData.name required" });

  const apiKey = getAnthropicKey();
  if (!apiKey) return res.status(400).json({ error: "Anthropic API key not configured. Add it in Settings." });

  const db = getDb();

  // Check cache
  const cacheKey = `${checkId || issueData.name}:${jobId || "nojob"}`;
  const cached = db.prepare("SELECT * FROM ai_suggestions WHERE check_id = ? AND job_id = ? AND type = 'issue'")
    .get(checkId || 0, jobId || "nojob");
  if (cached) return res.json({ suggestion: cached.response_text, cached: true, id: cached.id });

  // Stream from Anthropic
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullText = "";

  try {
    const Anthropic = require("@anthropic-ai/sdk");
    const client = new Anthropic.default({ apiKey });

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: PROMPT_TEMPLATE(issueData) }],
      system: "You are a senior technical SEO engineer. Give precise, actionable advice."
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta?.type === "text_delta") {
        const text = chunk.delta.text;
        fullText += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Cache the response
    const suggestionId = uuidv4();
    db.prepare("INSERT OR REPLACE INTO ai_suggestions (id, check_id, job_id, site_id, type, response_text) VALUES (?, ?, ?, ?, 'issue', ?)")
      .run(suggestionId, checkId || 0, jobId || "nojob", siteId || "", fullText);

    res.write(`data: ${JSON.stringify({ done: true, id: suggestionId })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// POST /api/ai/suggest/:id/feedback
router.post("/suggest/:id/feedback", (req, res) => {
  const { rating } = req.body; // 1 or -1
  if (![1, -1].includes(rating)) return res.status(400).json({ error: "rating must be 1 or -1" });
  const db = getDb();
  db.prepare("INSERT INTO ai_suggestion_feedback (id, suggestion_id, user_id, rating) VALUES (?, ?, ?, ?)")
    .run(uuidv4(), req.params.id, req.user?.sub || "anon", rating);
  res.json({ ok: true });
});

// GET /api/ai/suggest/:checkId/:jobId  — fetch cached
router.get("/suggest/:checkId/:jobId", (req, res) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM ai_suggestions WHERE check_id = ? AND job_id = ? AND type = 'issue'")
    .get(req.params.checkId, req.params.jobId);
  if (!row) return res.status(404).json({ error: "No cached suggestion" });
  res.json({ suggestion: row.response_text, id: row.id, created_at: row.created_at });
});

module.exports = router;
