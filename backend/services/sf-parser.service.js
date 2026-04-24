const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { getDb } = require("../db/sqlite");

// Map SF export filenames to section IDs
const SECTION_FILES = [
  { file: "internal_all.csv", section: "internal-links", parser: parseInternalLinks },
  { file: "response_codes_all.csv", section: "response-codes", parser: parseResponseCodes },
  { file: "page_titles_all.csv", section: "meta-tags", parser: parsePageTitles },
  { file: "meta_description_all.csv", section: "meta-tags", parser: parseMetaDescriptions },
  { file: "h1_all.csv", section: "headings", parser: parseH1 },
  { file: "h2_all.csv", section: "headings", parser: parseH2 },
  { file: "images_all.csv", section: "images", parser: parseImages },
  { file: "canonicals_all.csv", section: "canonicals", parser: parseCanonicalsExport },
  { file: "structured_data_all.csv", section: "structured-data", parser: parseStructuredData }
];

async function parseAndStore(jobId, siteId, outputDir) {
  const db = getDb();
  const insert = db.prepare(
    "INSERT INTO audit_results (crawl_job_id, site_id, section, url, data, severity, issue_type) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  let totalCount = 0;

  for (const { file, section, parser } of SECTION_FILES) {
    const filePath = path.join(outputDir, file);
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, "utf8");
    let rows;
    try {
      rows = parse(raw, { columns: true, skip_empty_lines: true, bom: true });
    } catch {
      continue;
    }

    const results = parser(rows);
    for (const r of results) {
      insert.run(jobId, siteId, section, r.url, JSON.stringify(r.data), r.severity, r.issue_type);
      totalCount++;
    }
  }

  // Update total_urls on the job
  const urlCount = getDb()
    .prepare("SELECT COUNT(DISTINCT url) as c FROM audit_results WHERE crawl_job_id = ?")
    .get(jobId);
  db.prepare("UPDATE crawl_jobs SET total_urls = ? WHERE id = ?").run(urlCount?.c ?? 0, jobId);

  return totalCount;
}

// ── Column name helpers ──────────────────────────────────────────────────────
function col(row, ...names) {
  for (const n of names) {
    if (row[n] !== undefined) return row[n] ?? "";
  }
  return "";
}
function num(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

// ── Parsers ──────────────────────────────────────────────────────────────────

function parseInternalLinks(rows) {
  const results = [];
  for (const row of rows) {
    const url = col(row, "Address");
    if (!url) continue;
    const status = num(col(row, "Status Code"));
    const inlinks = num(col(row, "Inlinks"));
    const outlinks = num(col(row, "Outlinks"));
    const issues = [];

    if (inlinks === 0) issues.push({ type: "orphan-page", severity: "critical", label: "Orphan page (0 inlinks)" });
    if (inlinks > 100) issues.push({ type: "over-linked", severity: "warning", label: "Over-linked (>100 inlinks)" });
    if (status >= 400) issues.push({ type: "broken-link", severity: "critical", label: `Broken internal link (${status})` });

    if (issues.length === 0) {
      results.push({ url, severity: "ok", issue_type: null, data: { status, inlinks, outlinks } });
    } else {
      for (const issue of issues) {
        results.push({ url, severity: issue.severity, issue_type: issue.type, data: { status, inlinks, outlinks, label: issue.label } });
      }
    }
  }
  return results;
}

function parseResponseCodes(rows) {
  const results = [];
  // Track redirects per URL to detect chains
  const redirectMap = {};
  for (const row of rows) {
    const url = col(row, "Address");
    const dest = col(row, "Redirect URL");
    const status = num(col(row, "Status Code"));
    if (dest) redirectMap[url] = { dest, status };
  }

  for (const row of rows) {
    const url = col(row, "Address");
    if (!url) continue;
    const status = num(col(row, "Status Code"));
    const dest = col(row, "Redirect URL");
    const contentType = col(row, "Content Type");
    const issues = [];

    if (status === 404) issues.push({ type: "404", severity: "critical", label: "404 Not Found" });
    else if (status >= 500) issues.push({ type: "5xx", severity: "critical", label: `${status} Server Error` });
    else if (status === 302) issues.push({ type: "302-redirect", severity: "warning", label: "302 Temporary Redirect" });
    else if (status >= 300 && status < 400) {
      // Check for redirect chain
      let hops = 0;
      let current = dest;
      while (current && redirectMap[current] && hops < 10) {
        hops++;
        current = redirectMap[current].dest;
      }
      if (hops >= 2) issues.push({ type: "redirect-chain", severity: "warning", label: `Redirect chain (${hops + 1} hops)` });
    }

    if (issues.length === 0) {
      results.push({ url, severity: "ok", issue_type: null, data: { status, dest, contentType } });
    } else {
      for (const issue of issues) {
        results.push({ url, severity: issue.severity, issue_type: issue.type, data: { status, dest, contentType, label: issue.label } });
      }
    }
  }
  return results;
}

function parsePageTitles(rows) {
  const results = [];
  const seen = {};
  for (const row of rows) {
    const title = col(row, "Title 1");
    if (title) seen[title] = (seen[title] || 0) + 1;
  }

  for (const row of rows) {
    const url = col(row, "Address");
    if (!url) continue;
    const title = col(row, "Title 1");
    const length = num(col(row, "Title 1 Length", "Title 1 length"));
    const issues = [];

    if (!title) issues.push({ type: "missing-title", severity: "critical", label: "Missing title" });
    else if (length < 30) issues.push({ type: "title-too-short", severity: "warning", label: `Title too short (${length} chars)` });
    else if (length > 60) issues.push({ type: "title-too-long", severity: "warning", label: `Title too long (${length} chars)` });
    if (title && seen[title] > 1) issues.push({ type: "duplicate-title", severity: "warning", label: "Duplicate title" });

    if (issues.length === 0) {
      results.push({ url, severity: "ok", issue_type: null, data: { title, length } });
    } else {
      for (const issue of issues) {
        results.push({ url, severity: issue.severity, issue_type: issue.type, data: { title, length, label: issue.label } });
      }
    }
  }
  return results;
}

function parseMetaDescriptions(rows) {
  const results = [];
  const seen = {};
  for (const row of rows) {
    const desc = col(row, "Meta Description 1");
    if (desc) seen[desc] = (seen[desc] || 0) + 1;
  }

  for (const row of rows) {
    const url = col(row, "Address");
    if (!url) continue;
    const desc = col(row, "Meta Description 1");
    const length = num(col(row, "Meta Description 1 Length", "Meta Description 1 length"));
    const issues = [];

    if (!desc) issues.push({ type: "missing-meta-desc", severity: "warning", label: "Missing meta description" });
    else if (length < 70) issues.push({ type: "meta-desc-too-short", severity: "warning", label: `Meta description too short (${length} chars)` });
    else if (length > 160) issues.push({ type: "meta-desc-too-long", severity: "warning", label: `Meta description too long (${length} chars)` });
    if (desc && seen[desc] > 1) issues.push({ type: "duplicate-meta-desc", severity: "warning", label: "Duplicate meta description" });

    if (issues.length === 0) {
      results.push({ url, severity: "ok", issue_type: null, data: { desc, length } });
    } else {
      for (const issue of issues) {
        results.push({ url, severity: issue.severity, issue_type: issue.type, data: { desc, length, label: issue.label } });
      }
    }
  }
  return results;
}

function parseH1(rows) {
  const results = [];
  // Track multiple H1s per URL
  const urlH1Count = {};
  for (const row of rows) {
    const url = col(row, "Address");
    urlH1Count[url] = (urlH1Count[url] || 0) + 1;
  }
  const processed = new Set();

  for (const row of rows) {
    const url = col(row, "Address");
    if (!url) continue;
    const h1 = col(row, "H1-1");
    const length = num(col(row, "H1-1 Length", "H1-1 length"));
    const title = col(row, "Title 1");
    const issues = [];

    if (!h1) issues.push({ type: "missing-h1", severity: "critical", label: "Missing H1" });
    else {
      if (length > 70) issues.push({ type: "h1-too-long", severity: "warning", label: `H1 too long (${length} chars)` });
      if (h1 === title) issues.push({ type: "h1-matches-title", severity: "info", label: "H1 matches page title exactly" });
    }
    if (!processed.has(url) && urlH1Count[url] > 1) {
      issues.push({ type: "multiple-h1", severity: "warning", label: `Multiple H1 tags (${urlH1Count[url]})` });
    }
    processed.add(url);

    if (issues.length === 0) {
      results.push({ url, severity: "ok", issue_type: null, data: { h1, length } });
    } else {
      for (const issue of issues) {
        results.push({ url, severity: issue.severity, issue_type: issue.type, data: { h1, length, label: issue.label } });
      }
    }
  }
  return results;
}

function parseH2(rows) {
  const results = [];
  for (const row of rows) {
    const url = col(row, "Address");
    if (!url) continue;
    const h2 = col(row, "H2-1");
    const length = num(col(row, "H2-1 Length", "H2-1 length"));
    const issues = [];

    if (!h2) issues.push({ type: "missing-h2", severity: "info", label: "Missing H2" });

    if (issues.length === 0) {
      results.push({ url, severity: "ok", issue_type: null, data: { h2, length } });
    } else {
      for (const issue of issues) {
        results.push({ url, severity: issue.severity, issue_type: issue.type, data: { h2, length, label: issue.label } });
      }
    }
  }
  return results;
}

function parseImages(rows) {
  // images_all.csv columns: Address, Content Type, Size (bytes), IMG Inlinks, Indexability, Indexability Status, Dimensions
  const results = [];
  const SIZE_WARN = 200 * 1024; // 200 KB

  for (const row of rows) {
    const url = col(row, "Address");
    if (!url) continue;
    const sizeBytes = num(col(row, "Size (bytes)"));
    const inlinks = num(col(row, "IMG Inlinks"));
    const indexability = col(row, "Indexability");
    const issues = [];

    if (sizeBytes > SIZE_WARN) issues.push({ type: "large-image", severity: "warning", label: `Large image (${Math.round(sizeBytes / 1024)} KB)` });
    if (inlinks === 0) issues.push({ type: "unused-image", severity: "info", label: "Image has no inlinks (possibly unused)" });
    if (indexability === "Non-Indexable") issues.push({ type: "non-indexable-image", severity: "info", label: `Non-indexable: ${col(row, "Indexability Status")}` });

    if (issues.length === 0) {
      results.push({ url, severity: "ok", issue_type: null, data: { sizeBytes, inlinks } });
    } else {
      for (const issue of issues) {
        results.push({ url, severity: issue.severity, issue_type: issue.type, data: { sizeBytes, inlinks, label: issue.label } });
      }
    }
  }
  return results;
}

function parseCanonicalsExport(rows) {
  const results = [];
  for (const row of rows) {
    const url = col(row, "Address");
    if (!url) continue;
    const canonical = col(row, "Canonical Link Element 1");
    const match = col(row, "Canonical Link Element 1 Match", "Canonical Match");
    const issues = [];

    if (!canonical) {
      issues.push({ type: "missing-canonical", severity: "warning", label: "Missing canonical tag" });
    } else {
      try {
        const canonicalHost = new URL(canonical).hostname;
        const pageHost = new URL(url).hostname;
        if (canonicalHost !== pageHost) {
          issues.push({ type: "canonical-cross-domain", severity: "critical", label: "Canonical points to different domain" });
        }
      } catch {}
    }

    if (issues.length === 0) {
      results.push({ url, severity: "ok", issue_type: null, data: { canonical, match } });
    } else {
      for (const issue of issues) {
        results.push({ url, severity: issue.severity, issue_type: issue.type, data: { canonical, match, label: issue.label } });
      }
    }
  }
  return results;
}

function parseStructuredData(rows) {
  const results = [];
  for (const row of rows) {
    const url = col(row, "Address");
    if (!url) continue;
    const types = col(row, "Type-1", "Schema Types", "Structured Data Types");
    const errors = col(row, "Errors", "Structured Data Errors");
    const warnings = col(row, "Warnings", "Structured Data Warnings");
    const issues = [];

    if (!types) {
      issues.push({ type: "no-schema", severity: "info", label: "No structured data found" });
    } else if (errors && num(errors) > 0) {
      issues.push({ type: "schema-errors", severity: "warning", label: `Schema validation errors (${errors})` });
    }

    if (issues.length === 0) {
      results.push({ url, severity: "ok", issue_type: null, data: { types, errors, warnings } });
    } else {
      for (const issue of issues) {
        results.push({ url, severity: issue.severity, issue_type: issue.type, data: { types, errors, warnings, label: issue.label } });
      }
    }
  }
  return results;
}

module.exports = { parseAndStore };
