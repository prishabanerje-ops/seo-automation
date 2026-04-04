const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/sqlite");
const sfPaths = require("../config/sf-paths");
const { getExportTabs } = require("./sf-config.service");

// jobId -> child process
const runningJobs = new Map();

function startCrawl(siteIds, io, options = {}) {
  // options: { mode: 'spider'|'list', sfConfig: {}, urlList: ['...'] }
  const { mode = "spider", sfConfig = {}, urlList = [] } = options;

  const db = getDb();
  const insertJob = db.prepare(
    "INSERT INTO crawl_jobs (id, site_id, started_at, status, mode) VALUES (?, ?, datetime('now'), 'running', ?)"
  );

  const jobs = [];

  for (const siteId of siteIds) {
    let site = db.prepare("SELECT * FROM sites WHERE id = ?").get(siteId);
    // Fall back to a dynamic site built from targetUrl (free-form crawl)
    if (!site && options.targetUrl) {
      try {
        const hostname = new URL(options.targetUrl).hostname;
        site = { id: siteId, label: options.crawlName || hostname, url: options.targetUrl };
      } catch { continue; }
    }
    if (!site) continue;

    const jobId = uuidv4();
    const outputDir = path.resolve(__dirname, "../exports", siteId);
    fs.mkdirSync(outputDir, { recursive: true });

    insertJob.run(jobId, siteId, mode);

    const exportTabs = getExportTabs(sfConfig).join(",");

    const args = [
      "--headless",
      "--save-crawl",
      "--overwrite",
      "--export-tabs", exportTabs,
      "--output-folder", outputDir
    ];

    // Mode-specific args
    if (mode === "sitemap") {
      // Sitemap crawl: fetch all URLs from sitemap XML then audit each one
      args.push("--crawl-sitemap", site.url);
    } else if (mode === "list") {
      // List crawl: write URLs to a temp file and pass to SF
      const listPath = path.join(outputDir, `${jobId}-urls.txt`);
      const urls = urlList.length > 0 ? urlList : [site.url];
      fs.writeFileSync(listPath, urls.join("\n"), "utf8");
      args.push("--crawl-list", listPath);
    } else {
      // Spider mode: follow links from start URL
      args.push("--crawl", site.url);
    }

    // Note: SF license is read from ~/.ScreamingFrogSEOSpider/licence.txt automatically.
    // There is no --license CLI flag in Screaming Frog.

    const child = spawn(sfPaths.cliPath, args, {
      env: { ...process.env, JAVA_TOOL_OPTIONS: "-Xmx2g" }
    });

    runningJobs.set(jobId, child);

    emit(io, jobId, "log", { type: "info", message: `[${site.label}] Starting ${mode} crawl...` });
    emit(io, jobId, "log", { type: "info", message: `Output: ${outputDir}` });
    emit(io, jobId, "log", { type: "info", message: `Command: ${[sfPaths.cliPath, ...args].join(" ")}` });
    emit(io, jobId, "progress", { progress: 0 });

    child.stdout.on("data", (data) => {
      const text = data.toString().trim();
      if (!text) return;
      emit(io, jobId, "log", { type: "stdout", message: text });

      const match = text.match(/(\d+)\s+of\s+(\d+)/i) || text.match(/(\d+)\/(\d+)/);
      if (match) {
        const done = parseInt(match[1]);
        const total = parseInt(match[2]);
        if (total > 0) {
          emit(io, jobId, "progress", { progress: Math.min(99, Math.round((done / total) * 100)) });
        }
      }
    });

    child.stderr.on("data", (data) => {
      const text = data.toString().trim();
      if (!text) return;
      const isError = /error|exception|failed/i.test(text);
      emit(io, jobId, "log", { type: isError ? "error" : "stderr", message: text });
    });

    child.on("close", async (code) => {
      runningJobs.delete(jobId);
      emit(io, jobId, "log", { type: "info", message: `SF process exited with code ${code}` });

      // Don't overwrite a "cancelled" status — the job was explicitly stopped
      const currentRow = db.prepare("SELECT status FROM crawl_jobs WHERE id = ?").get(jobId);
      if (currentRow?.status === "cancelled") {
        emit(io, jobId, "complete", { status: "cancelled", code });
        return;
      }

      // Check if SF actually exported any CSV files
      const csvFiles = fs.existsSync(outputDir)
        ? fs.readdirSync(outputDir).filter((f) => f.endsWith(".csv"))
        : [];

      emit(io, jobId, "log", { type: "info", message: `CSV files found: ${csvFiles.length > 0 ? csvFiles.join(", ") : "none"}` });

      const status = code === 0 && csvFiles.length > 0 ? "completed" : "failed";

      db.prepare(
        "UPDATE crawl_jobs SET status = ?, completed_at = datetime('now') WHERE id = ?"
      ).run(status, jobId);

      emit(io, jobId, "progress", { progress: status === "completed" ? 100 : 0 });
      emit(io, jobId, "complete", { status, code });

      if (status === "completed") {
        emit(io, jobId, "log", { type: "info", message: "Parsing results..." });
        try {
          const { parseAndStore } = require("./sf-parser.service");
          await parseAndStore(jobId, siteId, outputDir);
          emit(io, jobId, "log", { type: "success", message: "Results saved to database." });
        } catch (err) {
          emit(io, jobId, "log", { type: "error", message: `Parse error: ${err.message}` });
        }
      } else if (csvFiles.length === 0) {
        emit(io, jobId, "log", { type: "error", message: "No CSV exports found. Check that Screaming Frog has a valid license and the URL is reachable." });
      }
    });

    child.on("error", (err) => {
      runningJobs.delete(jobId);
      db.prepare("UPDATE crawl_jobs SET status = 'failed', completed_at = datetime('now') WHERE id = ?").run(jobId);
      emit(io, jobId, "log", { type: "error", message: `Failed to start SF: ${err.message}` });
      emit(io, jobId, "complete", { status: "failed" });
    });

    jobs.push({ jobId, siteId, label: site.label });
  }

  return jobs;
}

function cancelCrawl(jobId) {
  const child = runningJobs.get(jobId);
  if (!child) return false;
  child.kill("SIGTERM");
  runningJobs.delete(jobId);
  getDb()
    .prepare("UPDATE crawl_jobs SET status = 'cancelled', completed_at = datetime('now') WHERE id = ?")
    .run(jobId);
  return true;
}

function emit(io, jobId, event, data) {
  io.emit(`crawl:${event}:${jobId}`, data);
}

module.exports = { startCrawl, cancelCrawl };
