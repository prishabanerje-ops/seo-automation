/**
 * Generates a Screaming Frog .seospiderconfig XML from a JS config object.
 * Saved per crawl job so each run can have its own settings.
 */

const fs = require("fs");
const path = require("path");

const DEFAULTS = {
  // Spider
  checkImages: true,
  checkCSS: true,
  checkJavaScript: true,
  checkExternals: false,
  crawlAllSubdomains: false,
  followInternalNofollow: false,
  followExternalNofollow: false,
  obeyRobots: true,
  obeyMetaRobots: true,
  obeyCanonicalTags: false,
  crawlLinkedXMLSitemaps: false,
  limitToCrawlFolder: true,
  maxCrawlDepth: -1,       // -1 = unlimited
  maxCrawlUrls: 0,         // 0 = unlimited

  // Speed
  maxThreads: 5,
  crawlDelay: 0,           // ms between requests (0 = none)
  requestTimeout: 30000,   // ms

  // Rendering
  renderType: "None",      // None | JavaScript

  // User Agent
  userAgent: "ScreamingFrogSEOSpider",
  userAgentPreset: "screamingfrog", // screamingfrog | googlebot-desktop | googlebot-mobile | custom

  // Robots.txt
  respectRobots: true,

  // Authentication
  authEnabled: false,
  authUsername: "",
  authPassword: "",

  // Crawl rules (include/exclude URL patterns)
  includePatterns: [],     // [{ pattern, isRegex }]
  excludePatterns: [],     // [{ pattern, isRegex }]

  // Custom extractions (up to 5)
  extractions: [],         // [{ name, type, selector, extractFrom }]
                           // type: XPath | CSS | Regex
                           // extractFrom: InnerText | InnerHTML | Attribute | Href | Src

  // Custom HTTP headers
  customHeaders: [],       // [{ name, value }]

  // Sitemaps
  includeSitemap: false,
  sitemapUrls: [],         // ["https://..."]

  // URL rewriting
  urlRewriteRules: [],     // [{ find, replace, isRegex }]

  // Export tabs
  exportTabs: [
    "Internal:All",
    "Response Codes:All",
    "Page Titles:All",
    "Meta Description:All",
    "H1:All",
    "H2:All",
    "Images:All",
    "Canonicals:All",
    "Structured Data:All"
  ]
};

const UA_STRINGS = {
  "screamingfrog": "ScreamingFrogSEOSpider/20.0",
  "googlebot-desktop": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "googlebot-mobile": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "bingbot": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "custom": null
};

function xml(tag, value, attrs = "") {
  if (value === null || value === undefined) return "";
  const a = attrs ? " " + attrs : "";
  return `  <${tag}${a}>${escXml(String(value))}</${tag}>\n`;
}

function escXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function bool(v) { return v ? "true" : "false"; }

function generateConfig(userConfig = {}) {
  const c = { ...DEFAULTS, ...userConfig };

  const uaString = c.userAgentPreset === "custom"
    ? (c.userAgent || DEFAULTS.userAgent)
    : (UA_STRINGS[c.userAgentPreset] || UA_STRINGS.screamingfrog);

  let xml_str = `<?xml version="1.0" encoding="UTF-8"?>\n<settings version="1">\n`;

  // Spider
  xml_str += `  <spider>\n`;
  xml_str += `    <checkImages>${bool(c.checkImages)}</checkImages>\n`;
  xml_str += `    <checkCSS>${bool(c.checkCSS)}</checkCSS>\n`;
  xml_str += `    <checkJavaScript>${bool(c.checkJavaScript)}</checkJavaScript>\n`;
  xml_str += `    <checkExternal>${bool(c.checkExternals)}</checkExternal>\n`;
  xml_str += `    <crawlAllSubdomains>${bool(c.crawlAllSubdomains)}</crawlAllSubdomains>\n`;
  xml_str += `    <followNofollow>${bool(c.followInternalNofollow)}</followNofollow>\n`;
  xml_str += `    <followExternalNofollow>${bool(c.followExternalNofollow)}</followExternalNofollow>\n`;
  xml_str += `    <obeyRobots>${bool(c.obeyRobots)}</obeyRobots>\n`;
  xml_str += `    <obeyMetaRobots>${bool(c.obeyMetaRobots)}</obeyMetaRobots>\n`;
  xml_str += `    <obeyCanonicalTags>${bool(c.obeyCanonicalTags)}</obeyCanonicalTags>\n`;
  xml_str += `    <crawlLinkedXMLSitemaps>${bool(c.crawlLinkedXMLSitemaps)}</crawlLinkedXMLSitemaps>\n`;
  xml_str += `    <limitToCrawlFolderName>${bool(c.limitToCrawlFolder)}</limitToCrawlFolderName>\n`;
  xml_str += `    <maxCrawlDepth>${c.maxCrawlDepth}</maxCrawlDepth>\n`;
  xml_str += `    <maxCrawlUrls>${c.maxCrawlUrls}</maxCrawlUrls>\n`;
  xml_str += `  </spider>\n`;

  // Performance
  xml_str += `  <performance>\n`;
  xml_str += `    <maxThreads>${Math.min(50, Math.max(1, parseInt(c.maxThreads) || 5))}</maxThreads>\n`;
  xml_str += `    <crawlDelay>${Math.max(0, parseInt(c.crawlDelay) || 0)}</crawlDelay>\n`;
  xml_str += `    <requestTimeout>${Math.max(5000, parseInt(c.requestTimeout) || 30000)}</requestTimeout>\n`;
  xml_str += `  </performance>\n`;

  // Rendering
  xml_str += `  <rendering>\n`;
  xml_str += `    <renderType>${c.renderType}</renderType>\n`;
  xml_str += `  </rendering>\n`;

  // User Agent
  xml_str += `  <userAgent>\n`;
  xml_str += `    <ua>${escXml(uaString)}</ua>\n`;
  xml_str += `  </userAgent>\n`;

  // Authentication
  if (c.authEnabled && c.authUsername) {
    xml_str += `  <authentication>\n`;
    xml_str += `    <type>basic</type>\n`;
    xml_str += `    <username>${escXml(c.authUsername)}</username>\n`;
    xml_str += `    <password>${escXml(c.authPassword)}</password>\n`;
    xml_str += `  </authentication>\n`;
  }

  // Custom HTTP headers
  if (c.customHeaders && c.customHeaders.length > 0) {
    xml_str += `  <httpHeaders>\n`;
    for (const h of c.customHeaders) {
      if (h.name) {
        xml_str += `    <header>\n`;
        xml_str += `      <name>${escXml(h.name)}</name>\n`;
        xml_str += `      <value>${escXml(h.value || "")}</value>\n`;
        xml_str += `    </header>\n`;
      }
    }
    xml_str += `  </httpHeaders>\n`;
  }

  // Crawl rules
  if ((c.includePatterns && c.includePatterns.length) || (c.excludePatterns && c.excludePatterns.length)) {
    xml_str += `  <crawlRules>\n`;
    for (const r of (c.includePatterns || [])) {
      if (r.pattern) {
        xml_str += `    <rule>\n`;
        xml_str += `      <type>include</type>\n`;
        xml_str += `      <pattern>${escXml(r.pattern)}</pattern>\n`;
        xml_str += `      <isRegex>${bool(r.isRegex)}</isRegex>\n`;
        xml_str += `    </rule>\n`;
      }
    }
    for (const r of (c.excludePatterns || [])) {
      if (r.pattern) {
        xml_str += `    <rule>\n`;
        xml_str += `      <type>exclude</type>\n`;
        xml_str += `      <pattern>${escXml(r.pattern)}</pattern>\n`;
        xml_str += `      <isRegex>${bool(r.isRegex)}</isRegex>\n`;
        xml_str += `    </rule>\n`;
      }
    }
    xml_str += `  </crawlRules>\n`;
  }

  // Custom extractions (up to 5)
  if (c.extractions && c.extractions.length > 0) {
    xml_str += `  <customExtractions>\n`;
    for (const ex of c.extractions.slice(0, 5)) {
      if (ex.name && ex.selector) {
        xml_str += `    <extraction>\n`;
        xml_str += `      <name>${escXml(ex.name)}</name>\n`;
        xml_str += `      <type>${escXml(ex.type || "XPath")}</type>\n`;
        xml_str += `      <selector>${escXml(ex.selector)}</selector>\n`;
        xml_str += `      <extractFrom>${escXml(ex.extractFrom || "InnerText")}</extractFrom>\n`;
        xml_str += `    </extraction>\n`;
      }
    }
    xml_str += `  </customExtractions>\n`;
  }

  // URL rewriting
  if (c.urlRewriteRules && c.urlRewriteRules.length > 0) {
    xml_str += `  <urlRewriting>\n`;
    for (const r of c.urlRewriteRules) {
      if (r.find) {
        xml_str += `    <rule>\n`;
        xml_str += `      <find>${escXml(r.find)}</find>\n`;
        xml_str += `      <replace>${escXml(r.replace || "")}</replace>\n`;
        xml_str += `      <isRegex>${bool(r.isRegex)}</isRegex>\n`;
        xml_str += `    </rule>\n`;
      }
    }
    xml_str += `  </urlRewriting>\n`;
  }

  // Sitemaps
  if (c.includeSitemap && c.sitemapUrls && c.sitemapUrls.length > 0) {
    xml_str += `  <sitemaps>\n`;
    for (const url of c.sitemapUrls) {
      if (url) xml_str += `    <sitemapUrl>${escXml(url)}</sitemapUrl>\n`;
    }
    xml_str += `  </sitemaps>\n`;
  }

  xml_str += `</settings>\n`;
  return xml_str;
}

function writeConfigFile(jobId, userConfig, outputDir) {
  const configPath = path.join(outputDir, `${jobId}.seospiderconfig`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(configPath, generateConfig(userConfig), "utf8");
  return configPath;
}

function getExportTabs(userConfig = {}) {
  const tabs = userConfig.exportTabs || DEFAULTS.exportTabs;
  // Add Custom Extraction tab if extractions are defined
  if (userConfig.extractions && userConfig.extractions.length > 0) {
    if (!tabs.includes("Custom Extraction:All")) {
      return [...tabs, "Custom Extraction:All"];
    }
  }
  return tabs;
}

module.exports = { generateConfig, writeConfigFile, getExportTabs, DEFAULTS };
