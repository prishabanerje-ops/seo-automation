const express = require("express");
const https = require("https");
const { getDb } = require("../db/sqlite");

const router = express.Router();

function psiRequest(url, strategy) {
  const apiKey = process.env.PSI_API_KEY;
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}${apiKey ? "&key=" + apiKey : ""}`;

  return new Promise((resolve, reject) => {
    https.get(endpoint, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error("Invalid JSON from PSI")); }
      });
    }).on("error", reject);
  });
}

function extractMetrics(psiData, strategy) {
  const cats = psiData.lighthouseResult?.categories;
  const audits = psiData.lighthouseResult?.audits;
  const crux = psiData.loadingExperience?.metrics;

  return {
    strategy,
    score: Math.round((cats?.performance?.score ?? 0) * 100),
    lcp: audits?.["largest-contentful-paint"]?.displayValue ?? null,
    lcpNumeric: audits?.["largest-contentful-paint"]?.numericValue ?? null, // ms, for threshold checks
    cls: audits?.["cumulative-layout-shift"]?.displayValue ?? null,
    clsNumeric: audits?.["cumulative-layout-shift"]?.numericValue ?? null,
    inp: audits?.["interaction-to-next-paint"]?.displayValue ?? null,
    fcp: audits?.["first-contentful-paint"]?.displayValue ?? null,
    ttfb: audits?.["server-response-time"]?.displayValue ?? null,
    lcpMs: crux?.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,  // CrUX field data
    clsScore: crux?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile ?? null
  };
}

// POST /api/pagespeed/run  — body: { siteId, urls: [...] }
router.post("/run", async (req, res) => {
  const { siteId, urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "urls required" });
  }

  const sample = urls.slice(0, 50);
  const results = [];

  for (const url of sample) {
    try {
      const [mob, desk] = await Promise.all([
        psiRequest(url, "mobile"),
        psiRequest(url, "desktop")
      ]);
      results.push({
        url,
        mobile: extractMetrics(mob, "mobile"),
        desktop: extractMetrics(desk, "desktop"),
        issues: detectIssues(extractMetrics(mob, "mobile"))
      });
    } catch (err) {
      results.push({ url, error: err.message });
    }
  }

  res.json({ data: results });
});

function detectIssues(m) {
  const issues = [];
  // Prefer CrUX field data, fall back to Lighthouse lab numericValue (both in ms)
  const lcpMs = m.lcpMs ?? m.lcpNumeric;
  if (lcpMs != null && lcpMs > 2500) issues.push("LCP > 2.5s");
  // CLS is a unitless score (not ms); prefer CrUX, fall back to lab numericValue
  const cls = m.clsScore ?? m.clsNumeric;
  if (cls != null && cls > 0.1) issues.push("CLS > 0.1");
  if (m.score < 50) issues.push("Mobile score < 50");
  return issues;
}

module.exports = router;
