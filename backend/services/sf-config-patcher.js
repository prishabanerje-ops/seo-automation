/**
 * SF Config Patcher
 * Patches the binary .seospiderconfig template to apply per-crawl settings.
 *
 * The SF config format is Java serialized (ObjectOutputStream). We can't generate
 * it from scratch, so we start from a known-good binary template and patch
 * specific field values in-place.
 *
 * Key fields in SpiderCrawlConfig:
 *   mSearchTotalLimit  (int,  4 bytes BE) - max URLs to crawl (default 5,000,000)
 *   mSearchDepthLimit  (int,  4 bytes BE) - max crawl depth  (default 0 = unlimited)
 *   mMaxThreads        (int,  4 bytes BE) - thread count      (default 5)
 *   mLimitSearchTotal  (bool, 1 byte)     - enable URL limit  (default true)
 *   mLimitSearchDepth  (bool, 1 byte)     - enable depth limit (default false)
 */

const fs   = require("fs");
const path = require("path");

const TEMPLATE_PATH = path.resolve(__dirname, "../crawl-configs/sf-base-template.seospiderconfig");

// Known default values in the template (used as search anchors)
const DEFAULTS = {
  mSearchTotalLimit: 5_000_000,  // 0x004C4B40
  mSearchDepthLimit: 0,           // 0x00000000
  mMaxThreads:       5,           // 0x00000005
};

function readInt32BE(buf, offset) {
  return buf.readInt32BE(offset);
}

function writeInt32BE(buf, offset, value) {
  buf.writeInt32BE(value, offset);
}

/**
 * Find offset of a 4-byte big-endian int value in the buffer.
 * Returns -1 if not found.
 */
function findInt32(buf, value) {
  const needle = Buffer.alloc(4);
  needle.writeInt32BE(value, 0);
  return buf.indexOf(needle);
}

/**
 * Create a patched config file for a crawl job.
 *
 * @param {string}  jobId     - used for output filename
 * @param {object}  sfConfig  - frontend config (maxCrawlUrls, maxCrawlDepth, maxThreads…)
 * @param {string}  outputDir - directory to write patched config
 * @returns {string} path to the patched config file
 */
function patchConfig(jobId, sfConfig = {}, outputDir) {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`SF base template not found at ${TEMPLATE_PATH}`);
  }

  const buf = Buffer.from(fs.readFileSync(TEMPLATE_PATH));

  // ── Max URLs ───────────────────────────────────────────────────────────────
  const maxUrls = parseInt(sfConfig.maxCrawlUrls) || 0;
  const urlLimit = maxUrls > 0 ? maxUrls : DEFAULTS.mSearchTotalLimit;

  const urlLimitOffset = findInt32(buf, DEFAULTS.mSearchTotalLimit);
  if (urlLimitOffset === -1) {
    console.warn("[sf-config-patcher] Could not find mSearchTotalLimit in template; skipping URL cap");
  } else {
    writeInt32BE(buf, urlLimitOffset, urlLimit);
  }

  // ── Max Depth ──────────────────────────────────────────────────────────────
  // depth 0 stays as template default; only patch if user set a positive value
  const maxDepth = parseInt(sfConfig.maxCrawlDepth);
  if (!isNaN(maxDepth) && maxDepth > 0) {
    // mSearchDepthLimit default is 0 — not unique enough to search for, skip for now
    // This requires a more complex patch; depth limiting is less critical.
  }

  // ── Max Threads ────────────────────────────────────────────────────────────
  const maxThreads = parseInt(sfConfig.maxThreads) || 0;
  if (maxThreads > 0 && maxThreads !== DEFAULTS.mMaxThreads) {
    const threadOffset = findInt32(buf, DEFAULTS.mMaxThreads);
    if (threadOffset !== -1) {
      writeInt32BE(buf, threadOffset, Math.min(50, Math.max(1, maxThreads)));
    }
  }

  const configPath = path.join(outputDir, `${jobId}.seospiderconfig`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(configPath, buf);
  return configPath;
}

module.exports = { patchConfig };
