import { useState, useEffect } from "react";
import api from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";

// ─── Checks per category ──────────────────────────────────────────────────────
const CHECKS_DATA = {
  "Response Codes & HTTP Status": [
    { name: "HTTP 200 OK", auto: true,  desc: "Verifies all crawled pages return a 200 status code indicating successful delivery." },
    { name: "5xx Server Errors", auto: true,  desc: "Detects any 500-series responses indicating server failures that block Googlebot and users alike." },
    { name: "4xx Client Errors", auto: true,  desc: "Flags pages returning 400-series errors (other than 404s) such as 403 Forbidden or 410 Gone." },
    { name: "Soft 404 Detection", auto: true,  desc: "Identifies pages that return HTTP 200 but display 'not found' content — misleads crawlers into indexing empty pages." },
    { name: "Content-Type Headers", auto: true,  desc: "Checks that all pages return the correct MIME type (text/html) so browsers and crawlers parse them correctly." },
    { name: "Response Time (TTFB)", auto: true,  desc: "Measures Time to First Byte. Pages over 500ms may receive lower crawl priority from Google." },
    { name: "HTTP/2 or HTTP/3 Support", auto: false, desc: "Confirms the server supports modern protocols for faster multiplexed connections and better crawl efficiency." },
  ],
  "Redirects": [
    { name: "Redirect Chains", auto: true,  desc: "Finds chains of 2+ hops (A→B→C) that waste crawl budget and dilute link equity with every extra hop." },
    { name: "Redirect Loops", auto: true,  desc: "Detects circular redirects (A→B→A) that block both users and crawlers from ever reaching the final page." },
    { name: "301 vs 302 Usage", auto: true,  desc: "Checks that permanent moves use 301 (passes PageRank) and temporary ones use 302 (does not consolidate signals)." },
    { name: "HTTP → HTTPS Redirect", auto: true,  desc: "Ensures every HTTP URL redirects to the HTTPS equivalent via a single 301 — not a chain or a 302." },
    { name: "WWW Canonicalization", auto: true,  desc: "Confirms one canonical form (www or non-www) is chosen and the other redirects to it consistently." },
    { name: "Trailing Slash Consistency", auto: true,  desc: "Verifies the same trailing-slash rule is applied across the whole site to prevent duplicate URL pairs." },
    { name: "Redirect to Homepage", auto: true,  desc: "Identifies deleted or orphaned pages that were lazily redirected to the homepage instead of a relevant destination." },
    { name: "JavaScript Redirects", auto: false, desc: "Finds client-side JS redirects (window.location) that Googlebot may not follow reliably or quickly." },
    { name: "Meta Refresh Redirects", auto: true,  desc: "Detects meta refresh tags used as redirects — these are slow, user-unfriendly, and pass less equity than server-side redirects." },
    { name: "Cross-Domain Redirects", auto: true,  desc: "Flags redirects pointing to a different domain — may indicate expired properties or link-equity leakage." },
    { name: "Parameter Redirect Conflicts", auto: false, desc: "Checks that URL parameters don't create conflicting redirect paths (e.g., ?utm_source on a redirecting URL)." },
    { name: "Rel=Canonical vs Redirect", auto: false, desc: "Ensures canonical tags aren't used where a 301 redirect is more appropriate, and vice versa." },
    { name: "Old URL Redirects Present", auto: false, desc: "Validates that legacy URLs from site migrations or redesigns have proper 301 redirects in place." },
    { name: "Mobile Redirect Conflicts", auto: false, desc: "Checks that m-dot or adaptive mobile redirects don't conflict with hreflang annotations." },
  ],
  "404 & Status Errors": [
    { name: "404 Page Exists", auto: true,  desc: "Confirms a custom 404 page is served with correct HTTP status so users aren't stranded on a broken experience." },
    { name: "Internal Links to 404s", auto: true,  desc: "Finds links within the site pointing to pages that return 404 — these waste crawl budget and hurt UX." },
    { name: "404s in XML Sitemap", auto: true,  desc: "Checks if any URLs listed in your sitemaps now return 404 — removes wasted crawl requests." },
    { name: "410 Gone Usage", auto: true,  desc: "Validates use of 410 Gone (instead of 404) for permanently deleted pages to signal faster URL deindexing." },
    { name: "Broken Image Links", auto: true,  desc: "Detects <img> src attributes pointing to non-existent URLs, degrading user experience and Core Web Vitals." },
    { name: "Broken CSS/JS Resources", auto: true,  desc: "Finds CSS or JS file references that return 404 — can break page rendering and affect crawl signals." },
    { name: "404 in Backlink Targets", auto: false, desc: "Identifies inbound backlinks pointing at pages that now return 404, losing valuable link equity." },
    { name: "Orphaned 404 Pages", auto: false, desc: "Surfaces 404 pages that receive organic traffic but have no redirect in place — recoverable link equity." },
    { name: "Paginated 404s", auto: false, desc: "Checks if paginated series (page=2, page=3) return 404 after the content is removed or consolidated." },
    { name: "Soft 404 in GSC", auto: false, desc: "Cross-references Google Search Console soft-404 reports with actual page content to prioritise fixes." },
    { name: "404 Error Trend", auto: false, desc: "Tracks increase in 404 rate over crawl history — a spike may indicate a recent redirect or CMS migration issue." },
  ],
  "HTTPS & Security": [
    { name: "HTTPS Enabled", auto: true,  desc: "Confirms all pages are served over HTTPS — a confirmed Google ranking factor since 2014." },
    { name: "Valid SSL Certificate", auto: true,  desc: "Checks that the SSL certificate is valid, not expired, and issued for the correct domain(s)." },
    { name: "Mixed Content (HTTP resources)", auto: true,  desc: "Identifies HTTPS pages that load HTTP sub-resources (images, scripts, CSS) triggering browser security warnings." },
    { name: "HSTS Header Present", auto: true,  desc: "Checks for the Strict-Transport-Security header that forces browsers to always use HTTPS for your domain." },
    { name: "Insecure Form Actions", auto: true,  desc: "Flags forms whose action attribute posts to an HTTP URL — puts user data at risk and triggers browser warnings." },
    { name: "Security Headers", auto: false, desc: "Audits presence of headers like X-Content-Type-Options, X-Frame-Options, and Content-Security-Policy." },
    { name: "Certificate Expiry Warning", auto: false, desc: "Alerts when the SSL certificate is within 30 days of expiry to prevent unexpected ranking and trust drops." },
    { name: "HTTPS Internal Links", auto: true,  desc: "Ensures all internal links use https:// — HTTP internal links cause redirect hops and can trigger mixed content." },
    { name: "Certificate Chain Valid", auto: false, desc: "Verifies the full certificate chain is correctly installed so mobile and older clients can verify it without error." },
  ],
  "Canonical Tags": [
    { name: "Canonical Tag Present", auto: true,  desc: "Checks every crawled page has a rel=canonical tag in the <head> pointing to the preferred URL." },
    { name: "Self-Referencing Canonicals", auto: true,  desc: "Verifies that non-duplicate pages have a canonical pointing to themselves — the most common and recommended pattern." },
    { name: "Canonical Matches Index Status", auto: true,  desc: "Cross-checks canonical URLs against noindex directives — a noindexed canonical creates a conflicting signal." },
    { name: "Cross-Domain Canonicals", auto: true,  desc: "Identifies canonicals pointing to a different domain — legitimate for syndication but risky if misconfigured." },
    { name: "Canonical in HTTP Header", auto: false, desc: "Checks for Link: rel=canonical in HTTP response headers — useful for non-HTML resources like PDFs." },
    { name: "Paginated Pages Canonicals", auto: true,  desc: "Ensures paginated pages (page=2, page=3) are not canonicalised to page 1, which hides valuable content from Google." },
    { name: "Canonical Points to Redirect", auto: true,  desc: "Detects canonical URLs that themselves redirect — forces Google to follow a chain and may be ignored." },
    { name: "Canonical Points to 404", auto: true,  desc: "Finds pages whose canonical target returns a 404, effectively telling Google to index a broken URL." },
    { name: "Multiple Canonicals", auto: true,  desc: "Flags pages with more than one canonical tag — Google picks one arbitrarily which may not be the one you intended." },
    { name: "Canonical Case Mismatch", auto: true,  desc: "Catches canonical URLs with different casing from the page URL — servers may treat them as different pages." },
    { name: "Parameter Canonicalization", auto: false, desc: "Verifies URL parameters are handled via canonical tags or GSC parameter settings to prevent duplicate indexing." },
    { name: "AMP Canonical Relationship", auto: false, desc: "Checks AMP pages link back to their canonical HTML counterpart and vice versa using correct rel attributes." },
    { name: "Trailing Slash in Canonical", auto: true,  desc: "Ensures canonical tags match the preferred trailing-slash convention set across the rest of the site." },
    { name: "Canonical Chain Depth", auto: true,  desc: "Identifies multi-hop canonical chains (A canonicalises to B which canonicalises to C) — Google may not follow beyond 2 hops." },
    { name: "Hreflang vs Canonical Conflict", auto: false, desc: "Checks hreflang annotations don't conflict with canonicals (e.g., hreflang pointing at a canonicalised-away URL)." },
    { name: "Product/Category Canonical Drift", auto: false, desc: "Detects faceted navigation pages (filtered URLs) that should canonical to the base category URL but don't." },
    { name: "Canonical in Body (Invalid)", auto: true,  desc: "Flags canonical tags placed in the <body> instead of the <head> — Google ignores out-of-spec canonicals." },
    { name: "Syndicated Content Canonical", auto: false, desc: "For content republished on other domains, checks that canonicals point back to your original URL." },
    { name: "JavaScript-Rendered Canonicals", auto: false, desc: "Tests whether canonical tags injected via JavaScript are visible to Googlebot after rendering." },
    { name: "Canonical Authority Check", auto: false, desc: "Verifies the canonical URL is the highest-authority version (HTTPS, preferred domain, no parameters)." },
    { name: "Noindex + Canonical Conflict", auto: true,  desc: "Catches pages that are both noindexed and have a self-referencing canonical — contradictory signals confuse crawlers." },
    { name: "Crawl Efficiency via Canonicals", auto: false, desc: "Estimates crawl budget saved by correct canonicalization of duplicate parameter URLs." },
    { name: "Canonical Coverage Rate", auto: true,  desc: "Reports the percentage of crawled pages missing a canonical tag — high rates indicate a CMS configuration issue." },
    { name: "Invalid Canonical URL Format", auto: true,  desc: "Validates canonical tag values are absolute URLs — relative canonicals can be misinterpreted by different crawlers." },
    { name: "Dynamic Canonical Correctness", auto: false, desc: "For pages generated from templates, checks that canonical logic produces correct output for all URL variants." },
    { name: "Canonical Tag Length", auto: true,  desc: "Flags canonical URLs that are excessively long (500+ chars) which may indicate parameter pollution or a CMS bug." },
  ],
  "Robots.txt": [
    { name: "Robots.txt Accessible", auto: true,  desc: "Confirms the robots.txt file is reachable at the root domain and returns a 200 status code." },
    { name: "Robots.txt Valid Syntax", auto: true,  desc: "Parses the file for syntax errors — malformed directives are silently ignored by crawlers, creating false security." },
    { name: "Googlebot Directives", auto: true,  desc: "Specifically checks Googlebot (and Googlebot-Image, Googlebot-News) crawl rules to identify blocked resources." },
    { name: "Blocking Critical Pages", auto: true,  desc: "Alerts if robots.txt disallows important paths like /product/, /category/, or /blog/ that should be indexed." },
    { name: "Blocking CSS/JS Resources", auto: true,  desc: "Identifies if CSS or JavaScript files are blocked — this prevents Google from rendering pages correctly." },
    { name: "Sitemap Declared in Robots.txt", auto: true,  desc: "Checks for a Sitemap: directive pointing to your XML sitemap — helps all crawlers discover your content." },
    { name: "Disallow: / Rule", auto: true,  desc: "Critical check: flags if a Disallow: / rule blocks all crawlers, which would deindex the entire site." },
    { name: "Crawl-Delay Directive", auto: false, desc: "Detects Crawl-delay directives that slow Googlebot — Google ignores it but it may be slowing other search engines." },
    { name: "Wildcard Pattern Accuracy", auto: false, desc: "Validates wildcard (* and $) patterns to ensure they block only intended URLs, not broader content sets." },
    { name: "User-Agent Specificity", auto: false, desc: "Reviews if rules are unnecessarily applied globally when they should be scoped to specific crawlers." },
    { name: "Robots.txt File Size", auto: true,  desc: "Warns if the file exceeds 500KB — Google will stop parsing at this limit, leaving later rules unenforced." },
    { name: "Noindex in Robots.txt", auto: false, desc: "Flags use of Noindex directives in robots.txt — Google dropped support for this in 2019; use meta robots instead." },
    { name: "Staging Environment Blocked", auto: false, desc: "Checks that staging/test subdomains are properly blocked from indexing via robots.txt." },
    { name: "Blocked URLs in Sitemap", auto: true,  desc: "Cross-checks sitemap URLs against robots.txt — URLs blocked by robots.txt should not appear in sitemaps." },
    { name: "Allow Directives Used Correctly", auto: false, desc: "Validates Allow directives are used to carve out exceptions within a broad Disallow rule, not redundantly." },
    { name: "Parameter Blocking", auto: false, desc: "Checks whether session IDs, tracking parameters, or internal search parameters are blocked to save crawl budget." },
    { name: "Multiple Robots.txt Files", auto: false, desc: "Detects subdomain or subfolder robots.txt files that may conflict with or override root-level rules." },
    { name: "Robots.txt vs GSC Coverage", auto: false, desc: "Compares blocked URLs in robots.txt with Google Search Console coverage report to identify unintended exclusions." },
    { name: "Media File Access", auto: true,  desc: "Ensures image and video files are not blocked — Googlebot needs access for image search and rich results." },
    { name: "API Endpoint Exposure", auto: false, desc: "Checks if internal API endpoints or admin paths are accidentally exposed (or need blocking) via robots.txt." },
  ],
  "Meta Robots & Indexation": [
    { name: "Noindex Detection", auto: true,  desc: "Finds all pages with a noindex directive — verifies intentional exclusions and flags accidental ones on key pages." },
    { name: "Nofollow on Internal Pages", auto: true,  desc: "Identifies pages using nofollow globally — this blocks PageRank distribution across your internal link graph." },
    { name: "Index, Follow Confirmation", auto: true,  desc: "Confirms high-value pages explicitly or implicitly have index, follow directives for full crawl and link equity." },
    { name: "X-Robots-Tag Header", auto: true,  desc: "Checks the HTTP X-Robots-Tag header for noindex/nofollow directives — applies to any file type, not just HTML." },
    { name: "Conflicting Directives", auto: true,  desc: "Catches pages where the meta robots tag says noindex but a canonical points to it, creating contradictory signals." },
    { name: "Noindex in Sitemap", auto: true,  desc: "Flags noindexed pages listed in XML sitemaps — they should be removed as Google considers this a contradictory signal." },
    { name: "Robots.txt vs Meta Noindex", auto: true,  desc: "Identifies pages blocked by robots.txt that also have noindex — the meta tag can't be read if the page is blocked." },
    { name: "Noarchive Usage", auto: false, desc: "Detects noarchive directives that prevent Google from caching your page — rarely needed and may reduce visibility." },
    { name: "Noimageindex Usage", auto: false, desc: "Finds pages blocking image indexation — may impact Google Image search traffic and rich result eligibility." },
    { name: "Googlebot-Specific Directives", auto: false, desc: "Checks for Googlebot-specific meta tags that differ from global robots directives." },
    { name: "Noindex Trend", auto: false, desc: "Tracks changes in noindex page count across crawls — a sudden spike may indicate a CMS or deployment error." },
    { name: "Parameter Page Indexation", auto: false, desc: "Reviews whether faceted or filtered URLs are correctly excluded from indexation via meta robots or canonical." },
    { name: "Pagination Indexation", auto: false, desc: "Verifies that deep pagination pages beyond page 3-4 are appropriately noindexed to prevent index bloat." },
    { name: "Tag/Category Archive Indexation", auto: false, desc: "Checks if tag archive pages, date archives, or author pages are correctly noindexed on blog-style sites." },
    { name: "Thin Content Page Indexation", auto: false, desc: "Cross-references pages with very low word counts against their indexation status — thin indexed pages dilute site quality." },
    { name: "Print/Modal Page Indexation", auto: false, desc: "Identifies print-friendly versions or modal-triggered URLs that are being inadvertently indexed." },
    { name: "Noindex on Error Pages", auto: true,  desc: "Verifies that 404, 403, and 410 pages have a noindex directive to prevent error pages from appearing in search results." },
  ],
  "URL Structure": [
    { name: "URL Length", auto: true,  desc: "Flags URLs exceeding 115 characters — long URLs are harder to share, parse, and may be truncated in SERPs." },
    { name: "Keyword in URL", auto: false, desc: "Checks that page URLs include the primary target keyword — a minor but consistent ranking signal." },
    { name: "URL Readability", auto: true,  desc: "Detects URLs with cryptic IDs, excessive parameters, or special characters that reduce click-through rate and crawlability." },
    { name: "Uppercase in URLs", auto: true,  desc: "Finds uppercase letters in URLs — these can create duplicate content when servers treat them case-insensitively." },
    { name: "Underscores vs Hyphens", auto: true,  desc: "Flags underscores used as word separators — Google treats hyphens as spaces but underscores join words together." },
    { name: "URL Depth", auto: true,  desc: "Measures click depth from homepage. Pages beyond 4 clicks deep receive less crawl priority and internal link equity." },
    { name: "Dynamic URL Parameters", auto: true,  desc: "Identifies URLs with query strings that create duplicate content (e.g., ?sort=price duplicating category pages)." },
    { name: "Stop Words in URLs", auto: false, desc: "Checks for unnecessary stop words (the, a, an, of) in URLs that add length without SEO value." },
    { name: "URL Parameter Consistency", auto: false, desc: "Reviews whether the same content is accessible via multiple parameter combinations, creating duplicate URLs." },
    { name: "Folder Depth Consistency", auto: false, desc: "Checks URL hierarchy reflects site taxonomy accurately — deep folder structures signal content importance to crawlers." },
    { name: "Non-ASCII Characters", auto: true,  desc: "Detects non-ASCII characters in URLs that must be percent-encoded — can cause issues with some crawlers and platforms." },
    { name: "Trailing Slash Consistency", auto: true,  desc: "Verifies consistent trailing slash use across all URLs — inconsistency can create URL variants treated as duplicates." },
    { name: "Numeric-Only URL Segments", auto: false, desc: "Flags URL segments that are purely numeric (e.g., /product/12345/) — missing keywords reduces relevance signals." },
    { name: "Protocol in URLs", auto: true,  desc: "Checks all URLs consistently use https:// without protocol-relative (//) or mixed HTTP/HTTPS references." },
    { name: "URL Canonicalization Consistency", auto: true,  desc: "Verifies canonical URL format matches the URL structure used throughout the site (www, HTTPS, trailing slash)." },
    { name: "Duplicate URL Variants", auto: true,  desc: "Counts how many unique content pages are accessible via multiple URL patterns (with/without index.html, etc.)." },
    { name: "Session ID in URLs", auto: true,  desc: "Detects session identifiers in URLs that generate thousands of unique URL variants for the same content." },
    { name: "Tracking Parameter Canonicalization", auto: false, desc: "Checks UTM and fbclid parameters are stripped by canonical tags to prevent duplicate page indexation." },
    { name: "URL Encoding", auto: true,  desc: "Validates URL-encoded characters are correctly encoded and consistent — malformed encoding can break crawlers." },
    { name: "Breadcrumb URL Alignment", auto: false, desc: "Verifies breadcrumb navigation matches the URL path structure for consistent hierarchy signals." },
    { name: "Subfolder vs Subdomain", auto: false, desc: "Reviews whether content is on subfolders vs subdomains — subfolders generally consolidate authority more effectively." },
    { name: "URL Change Detection", auto: false, desc: "Compares URLs across crawls to surface pages that have changed URL without a 301 redirect in place." },
    { name: "Faceted Navigation URL Proliferation", auto: false, desc: "Measures the volume of faceted/filtered URLs — excessive proliferation dilutes crawl budget and creates near-duplicates." },
  ],
  "Title Tags": [
    { name: "Title Tag Present", auto: true,  desc: "Confirms every page has a <title> tag — missing titles force Google to auto-generate one, usually producing worse results." },
    { name: "Title Length", auto: true,  desc: "Flags titles under 30 or over 60 characters — too short misses keywords, too long gets truncated in search results." },
    { name: "Duplicate Titles", auto: true,  desc: "Identifies pages sharing identical title tags — signals duplicate content and competes pages against each other." },
    { name: "Keyword in Title", auto: false, desc: "Checks the primary target keyword appears in the title tag — one of the strongest on-page ranking signals." },
    { name: "Brand Name in Title", auto: false, desc: "Verifies brand name is included in key page titles for brand awareness and click-through reinforcement." },
    { name: "Title Matches H1", auto: false, desc: "Checks alignment between title tag and H1 — significant divergence can confuse Google about the page's topic." },
    { name: "Boilerplate Titles", auto: true,  desc: "Detects titles that use a generic template with little page-specific content — reduces relevance and CTR." },
    { name: "Truncated Titles", auto: true,  desc: "Identifies titles that exceed pixel width limits (~580px) and will be truncated in desktop search results." },
    { name: "Dynamic Title Generation", auto: false, desc: "For template-driven sites, checks that CMS title generation logic produces unique, descriptive titles for each page type." },
    { name: "Special Characters in Title", auto: false, desc: "Reviews use of pipes, dashes, and colons — when used consistently they improve readability and brand separation." },
    { name: "Titles with Numbers/Years", auto: false, desc: "Flags outdated years (e.g., 'Best Tools 2022') in titles — stale dates reduce click-through rate significantly." },
    { name: "Title Case Consistency", auto: false, desc: "Checks whether title case or sentence case is applied consistently across pages of the same type." },
    { name: "Action Words / Power Words", auto: false, desc: "Reviews titles for CTR-boosting words (Best, Free, How to, Guide) — descriptive titles drive higher organic click rates." },
    { name: "Multiple Title Tags", auto: true,  desc: "Detects pages with more than one <title> tag — only the first is used by most browsers; duplicates indicate a CMS bug." },
    { name: "Empty Title Tags", auto: true,  desc: "Flags pages where the title tag exists but contains no text — equally bad as missing and harder to spot." },
    { name: "Title in JavaScript", auto: false, desc: "Checks if title tags are injected via JavaScript only — Googlebot may not execute JS in time to read the correct title." },
    { name: "Pagination in Titles", auto: false, desc: "Verifies paginated pages include page numbers in their titles (e.g., 'Category Name - Page 2') to avoid duplicate titles." },
    { name: "Title Rewrite Detection", auto: false, desc: "Compares your title tags against Google Search Console appearance data to identify where Google is rewriting your titles." },
    { name: "Localised Title Tags", auto: false, desc: "For multi-language sites, checks that hreflang alternate pages have correctly translated and localised title tags." },
    { name: "Homepage Title Uniqueness", auto: true,  desc: "Verifies the homepage title is unique and does not inadvertently use the same template as inner pages." },
    { name: "Title Alignment with Search Intent", auto: false, desc: "Audits whether title phrasing matches commercial, informational, or navigational intent of target queries." },
    { name: "Title Tag Length in Pixels", auto: false, desc: "Measures title length in rendered pixels (not characters) — more accurate predictor of SERP truncation." },
  ],
  "Meta Descriptions": [
    { name: "Meta Description Present", auto: true,  desc: "Checks every page has a meta description — without one Google auto-generates snippets, often with poor context." },
    { name: "Meta Description Length", auto: true,  desc: "Flags descriptions under 70 or over 160 characters — too short wastes space, too long gets cut off in SERPs." },
    { name: "Duplicate Meta Descriptions", auto: true,  desc: "Identifies pages sharing identical meta descriptions — a missed opportunity to differentiate SERP snippets." },
    { name: "Keyword in Meta Description", auto: false, desc: "Checks presence of the target keyword — Google bolds matching terms in the snippet, improving visual prominence." },
    { name: "Call to Action in Description", auto: false, desc: "Reviews descriptions for action-driving language (Learn more, Shop now, Get started) to improve click-through rate." },
    { name: "Multiple Meta Descriptions", auto: true,  desc: "Flags pages with more than one meta description tag — only the first is read; duplicates indicate template errors." },
    { name: "Empty Meta Descriptions", auto: true,  desc: "Detects pages where the meta description tag exists but contains no text content." },
    { name: "Boilerplate Descriptions", auto: true,  desc: "Identifies descriptions generated from a fixed template with no page-specific variation — reduces CTR." },
    { name: "Description Contains HTML", auto: true,  desc: "Flags meta descriptions that accidentally include HTML tags — these render as raw markup in search snippets." },
    { name: "Localised Meta Descriptions", auto: false, desc: "For multi-language sites, checks that hreflang alternate pages have correctly translated meta descriptions." },
    { name: "Matching Search Intent", auto: false, desc: "Reviews whether meta descriptions reflect the informational, transactional, or navigational intent of the target query." },
    { name: "Description vs SERP Snippet Alignment", auto: false, desc: "Compares your written descriptions against what Google actually shows — large divergence means Google is rewriting yours." },
  ],
  "Headings": [
    { name: "H1 Present", auto: true,  desc: "Checks every page has at least one H1 tag — the primary topical signal for on-page relevance." },
    { name: "Multiple H1 Tags", auto: true,  desc: "Flags pages with more than one H1 — can dilute topical focus although not a direct penalty in modern Google." },
    { name: "H1 Contains Primary Keyword", auto: false, desc: "Verifies the target keyword appears in the H1 tag — strong relevance signal for the page's primary topic." },
    { name: "H1 Matches Title Tag", auto: false, desc: "Checks alignment between H1 and title tag — large divergence may indicate mismatched on-page optimisation." },
    { name: "Heading Hierarchy", auto: true,  desc: "Validates correct nesting (H1 → H2 → H3) with no skipped levels — improves accessibility and content structure." },
    { name: "Empty Heading Tags", auto: true,  desc: "Detects H1-H6 tags with no visible text — can be caused by icon-only buttons or poorly structured templates." },
    { name: "Headings in Correct Order", auto: true,  desc: "Ensures headings appear in semantic document order and aren't used purely for visual styling." },
    { name: "Keyword Distribution in H2/H3", auto: false, desc: "Checks that secondary keywords and semantic variations appear in subheadings to reinforce topical coverage." },
    { name: "H1 Length", auto: false, desc: "Flags H1 tags shorter than 10 characters or longer than 70 — H1s should be descriptive but concise." },
    { name: "Duplicate H1 Across Pages", auto: true,  desc: "Identifies pages sharing identical H1 text — signals duplicate or low-differentiation content to Google." },
    { name: "Heading Count per Page", auto: false, desc: "Reviews the total number of heading tags — excessively tagged pages (50+ headings) may indicate keyword stuffing." },
    { name: "Headings Used for Navigation", auto: false, desc: "Flags structural heading tags used inside navigation menus — dilutes heading relevance signals on the main content." },
    { name: "Headings in Images", auto: false, desc: "Checks if heading text is embedded in images rather than real HTML text — invisible to crawlers and screen readers." },
    { name: "JavaScript-Rendered Headings", auto: false, desc: "Tests if H1 tags are only present after JavaScript execution — risk that Google indexes pre-render version without them." },
    { name: "Missing H2 on Long Pages", auto: false, desc: "Flags pages over 1000 words with no H2 subheadings — lack of structure reduces readability and content parsing signals." },
    { name: "Localised Headings", auto: false, desc: "For multi-language pages, verifies H1 tags are correctly translated and not left in the source language." },
    { name: "H1 Above the Fold", auto: false, desc: "Checks whether the H1 appears within the first visible viewport — page layout signals matter for content relevance." },
    { name: "Heading Tag Consistency", auto: false, desc: "Checks similar page types (all product pages, all blog posts) use a consistent heading structure template." },
  ],
  "Content Quality & Duplicates": [
    { name: "Duplicate Page Detection", auto: true,  desc: "Identifies pages with identical or near-identical body content using similarity hashing — signals low-quality content to Google." },
    { name: "Thin Content Pages", auto: true,  desc: "Flags pages under 300 words — thin pages dilute overall site quality and may receive manual quality actions." },
    { name: "Keyword Density", auto: false, desc: "Reviews target keyword frequency — checks for both under-optimisation (too low) and over-optimisation (keyword stuffing risk)." },
    { name: "Reading Level / Readability", auto: false, desc: "Measures Flesch-Kincaid or similar score — content should match the reading level of the target audience." },
    { name: "Near-Duplicate Content Clusters", auto: true,  desc: "Groups pages with >80% content similarity to identify consolidation opportunities or canonicalization needs." },
    { name: "Boilerplate Content Ratio", auto: true,  desc: "Measures what % of page content is shared across all pages (header, footer, nav) vs unique — low unique ratio signals thin content." },
    { name: "Content-to-Code Ratio", auto: true,  desc: "Checks HTML pages have sufficient visible text relative to HTML markup — very low ratios may indicate poor quality pages." },
    { name: "Scraped / Syndicated Content", auto: false, desc: "Uses fingerprinting to detect if content on your site also appears verbatim on other domains — may trigger duplicate content filtering." },
    { name: "Page Word Count Distribution", auto: true,  desc: "Analyses word count distribution across the site — identifies if a disproportionate number of pages are low-content." },
    { name: "Placeholder / Lorem Ipsum Content", auto: true,  desc: "Scans for placeholder text left on published pages — a quality signal that can harm rankings if indexed." },
    { name: "Author & Date Signals", auto: false, desc: "Checks for structured author markup and visible publish/update dates — E-E-A-T signals for YMYL and news content." },
    { name: "Internal Duplicate Title + Content", auto: true,  desc: "Finds pages with both the same title tag AND similar body content — strong duplicate content signal." },
    { name: "Paginated Content Duplication", auto: false, desc: "Checks if paginated series share too much overlapping content and whether pagination is handled correctly." },
    { name: "Content Freshness", auto: false, desc: "Identifies pages that haven't been updated in 12+ months — in time-sensitive niches, stale content loses rankings." },
    { name: "AI / Low-Quality Content Patterns", auto: false, desc: "Detects generic, formulaic content patterns that match known low-quality or auto-generated text patterns." },
    { name: "E-E-A-T Signals", auto: false, desc: "Reviews presence of experience, expertise, authority, and trust signals: author bios, citations, external links, credentials." },
    { name: "Product Description Uniqueness", auto: false, desc: "For ecommerce, checks if product descriptions are original or copied from manufacturer feeds — a common duplicate content issue." },
    { name: "Outbound Link Quality", auto: false, desc: "Reviews external links for relevance and authority — linking to low-quality or toxic sites can affect your own trust score." },
    { name: "Internal Link Anchor Text Diversity", auto: false, desc: "Checks whether internal links to a page use varied, descriptive anchor text — over-optimised anchors may trigger filters." },
    { name: "FAQ / Structured Answer Content", auto: false, desc: "Checks if FAQ or Q&A content is structured in a way that's eligible for rich snippets in search results." },
    { name: "Category Page Content Depth", auto: false, desc: "Reviews category/listing pages for descriptive introductory content — thin category pages rank poorly." },
    { name: "User-Generated Content Moderation", auto: false, desc: "Checks if review, comment, or UGC sections have appropriate nofollow and moderation to prevent spam signals." },
    { name: "Content Overlap Between Site Sections", auto: false, desc: "Identifies when different site sections (blog vs product pages) compete with near-identical content targeting the same queries." },
    { name: "Entities & Topic Coverage", auto: false, desc: "Checks whether key entities (people, places, products) relevant to the topic are mentioned and contextualised in the content." },
    { name: "Content Hierarchy Depth", auto: false, desc: "Analyses whether content uses a clear introduction → detail → conclusion structure that matches how Google evaluates comprehensive coverage." },
    { name: "Missing Content on Indexed Pages", auto: true,  desc: "Flags indexed pages with very little crawlable text — may indicate content is rendered via JavaScript and not being indexed." },
    { name: "Geo-Targeted Content Accuracy", auto: false, desc: "For location pages, checks that content is genuinely localised rather than templated text with only the city name swapped." },
    { name: "Medical / YMYL Compliance", auto: false, desc: "For health, finance, or legal content, reviews E-E-A-T compliance requirements specific to Your Money Your Life pages." },
    { name: "Content-to-Backlink Value Alignment", auto: false, desc: "Cross-references pages with significant backlinks against their content quality — thin pages with links are consolidation candidates." },
    { name: "Content Gap vs Competitor", auto: false, desc: "Identifies topics covered by competing pages that rank for your target queries but are missing from your content." },
    { name: "Duplicate Content Across Subdomains", auto: false, desc: "Checks if content is duplicated between www and non-www, m-dot, or staging subdomains that are not properly blocked." },
    { name: "Content Siloing", auto: false, desc: "Reviews whether topically related content is grouped together with strong internal links — siloed content ranks better for cluster topics." },
    { name: "Language Consistency", auto: true,  desc: "Detects pages where the declared language (html lang attribute or hreflang) doesn't match the actual visible content language." },
    { name: "Low Engagement Page Detection", auto: false, desc: "Cross-references GA4/GSC data to identify high-impression, low-click pages — content quality issue candidates." },
    { name: "Mobile Content Parity", auto: false, desc: "With mobile-first indexing, checks that mobile versions don't hide content via tabs/accordions that desktop versions show." },
    { name: "Content Strategy Alignment", auto: false, desc: "Reviews whether published content aligns with keyword research and funnel stage intent — strategic content audit layer." },
    { name: "Content Freshness Signals", auto: false, desc: "Checks for visible last-modified dates, recently added sections, and schema dateModified to signal content freshness." },
  ],
  "Keyword Strategy": [
    { name: "Target Keyword Mapping", auto: false, desc: "Verifies each key page has a designated primary keyword mapped — prevents keyword cannibalisation across similar pages." },
    { name: "Keyword Cannibalisation", auto: false, desc: "Identifies multiple pages targeting the same primary keyword — splits ranking signals and confuses Google about which to rank." },
    { name: "Keyword in Key On-Page Elements", auto: false, desc: "Checks primary keyword presence in title, H1, URL, and first 100 words — the core on-page optimisation checklist." },
    { name: "Search Volume Coverage", auto: false, desc: "Reviews whether high-volume target keywords have dedicated, optimised pages — gaps represent missed traffic opportunities." },
    { name: "Long-Tail Keyword Coverage", auto: false, desc: "Audits content for long-tail variations of primary keywords — these typically have higher conversion intent." },
    { name: "LSI / Semantic Keyword Usage", auto: false, desc: "Checks for use of semantically related terms and entity synonyms — Google's NLP looks for topical comprehensiveness, not keyword repetition." },
    { name: "Featured Snippet Targeting", auto: false, desc: "Identifies queries where you rank in positions 2-10 that have a featured snippet — content restructuring can capture position zero." },
    { name: "Keyword Intent Alignment", auto: false, desc: "Reviews whether the content format (list, guide, product page, review) matches the dominant search intent for the target keyword." },
    { name: "Competitor Keyword Gap", auto: false, desc: "Compares your keyword rankings against top competitors to surface high-value terms you're missing entirely." },
    { name: "Keyword Trend Analysis", auto: false, desc: "Checks if target keywords have stable, growing, or declining search volume trends — avoids investing in declining queries." },
    { name: "SERP Feature Opportunities", auto: false, desc: "Identifies keywords where your content qualifies for rich results (FAQ, How-to, Review) but lacks the required markup." },
    { name: "Question-Based Content Coverage", auto: false, desc: "Reviews whether People Also Ask questions for your target keywords are addressed in your content." },
    { name: "Keyword Density Balance", auto: false, desc: "Checks the primary keyword isn't over-used (>3% density) or under-used (<0.5%) relative to content length." },
    { name: "Brand vs Non-Brand Split", auto: false, desc: "Analyses the ratio of brand keyword traffic vs non-brand — heavy brand dependency indicates weak organic reach." },
    { name: "Page 1 Ranking Opportunities", auto: false, desc: "Surfaces keywords where you rank positions 4-20 that are closest to page-1 visibility with targeted improvements." },
  ],
  "Sitemaps": [
    { name: "XML Sitemap Exists", auto: true,  desc: "Confirms an XML sitemap is accessible at /sitemap.xml or declared in robots.txt — essential for crawl discovery." },
    { name: "Sitemap Returns 200", auto: true,  desc: "Checks the sitemap URL returns a 200 HTTP status — a 404 or 500 means Google can't access your sitemap." },
    { name: "Sitemap Valid XML", auto: true,  desc: "Parses the sitemap for valid XML syntax — malformed sitemaps are silently rejected by Google Search Console." },
    { name: "Sitemap URL Count", auto: true,  desc: "Verifies the sitemap doesn't exceed 50,000 URLs or 50MB — the Google-specified limits per sitemap file." },
    { name: "Sitemap Index File", auto: true,  desc: "For large sites, checks if a sitemap index file correctly references multiple sub-sitemaps." },
    { name: "All Important URLs in Sitemap", auto: false, desc: "Cross-checks whether key pages (product, category, blog) are listed in the sitemap and indexable." },
    { name: "Sitemap URL vs Canonical Match", auto: true,  desc: "Ensures all sitemap URLs match their canonical tag — submitting non-canonical URLs sends conflicting signals." },
    { name: "Sitemap URL vs Robots.txt", auto: true,  desc: "Flags any sitemap URLs that are blocked by robots.txt — pointless to submit URLs you've told Google not to crawl." },
    { name: "Noindexed URLs in Sitemap", auto: true,  desc: "Detects noindexed pages listed in the sitemap — contradictory and should be removed from the sitemap." },
    { name: "Lastmod Accuracy", auto: false, desc: "Checks that <lastmod> dates in the sitemap are accurate and updated when content changes — not static or fabricated." },
    { name: "Changefreq / Priority Usage", auto: false, desc: "Reviews use of optional changefreq and priority tags — mostly ignored by Google but can be misleading if wrong." },
    { name: "Image Sitemap", auto: false, desc: "Checks for a dedicated image sitemap to improve Google Image search discovery and indexation." },
    { name: "Video Sitemap", auto: false, desc: "For video-heavy sites, checks for a video sitemap with required metadata for video rich results." },
    { name: "News Sitemap", auto: false, desc: "For news publishers, verifies a Google News sitemap is present with correct publication date and title fields." },
    { name: "Sitemap Submitted to GSC", auto: false, desc: "Checks if the sitemap is submitted and showing healthy in Google Search Console with no reported errors." },
    { name: "Sitemap URL Redirects", auto: true,  desc: "Detects sitemap URLs that redirect to different URLs — redirected URLs in sitemaps waste crawl budget." },
    { name: "Sitemap URL 404s", auto: true,  desc: "Flags URLs listed in sitemaps that return 404 — these should be removed to keep the sitemap clean and credible." },
    { name: "Hreflang Sitemap Coverage", auto: false, desc: "For international sites, checks if a dedicated hreflang sitemap declares all language/region alternates correctly." },
    { name: "Dynamic Sitemap Generation", auto: false, desc: "Verifies that dynamically generated sitemaps update automatically when new pages are published or deleted." },
    { name: "Orphaned Pages in Sitemap", auto: false, desc: "Cross-checks sitemap URLs against internal link graph — pages only discoverable via sitemap may lack internal link equity." },
    { name: "Sitemap Freshness", auto: false, desc: "Checks the sitemap was last generated recently — stale sitemaps miss newly published or updated content." },
    { name: "Paginated Pages in Sitemap", auto: false, desc: "Reviews whether paginated URLs beyond page 1 are unnecessarily included — may inflate crawl budget requests." },
    { name: "Sitemap Split by Content Type", auto: false, desc: "Evaluates whether large sites split sitemaps by content type (products, blog, categories) for easier GSC reporting." },
    { name: "Multilingual Sitemap Coverage", auto: false, desc: "For multi-language sites, checks that all language versions of pages are included in the sitemap." },
    { name: "Sitemap URL Format Consistency", auto: true,  desc: "Verifies all sitemap URLs use the canonical domain format (HTTPS, preferred www/non-www) consistently." },
    { name: "Sitemap Accessibility from All Subdomains", auto: false, desc: "Checks that the sitemap is accessible from all relevant subdomains/domains it's intended to serve." },
    { name: "Sitemap Error Rate in GSC", auto: false, desc: "Reviews GSC sitemap error percentage — a high error rate reduces Google's trust in your sitemap data." },
  ],
  "JavaScript & Rendering": [
    { name: "Critical Content in HTML", auto: true,  desc: "Checks that primary content (H1, body text, links) exists in the raw HTML response before JavaScript execution." },
    { name: "JS Rendering Required for Index", auto: true,  desc: "Identifies pages where key SEO elements are only present after JS rendering — Googlebot may miss them in first crawl." },
    { name: "Render-Blocking Resources", auto: true,  desc: "Detects synchronous JS or CSS in the <head> that blocks page rendering — delays Time to Interactive significantly." },
    { name: "JavaScript Error Detection", auto: true,  desc: "Identifies console errors and uncaught JS exceptions that may prevent correct page rendering for Googlebot." },
    { name: "Lazy-Loaded Content Indexation", auto: false, desc: "Checks if content loaded via infinite scroll or lazy-loading is discoverable by Googlebot without user interaction." },
    { name: "Dynamic Meta Tags via JS", auto: false, desc: "Tests whether title, meta description, and canonical tags injected via JS are visible after Googlebot rendering." },
    { name: "SPA Crawlability", auto: false, desc: "For single-page applications, checks whether server-side rendering or dynamic rendering is in place for crawlers." },
    { name: "Structured Data in JS", auto: false, desc: "Verifies JSON-LD structured data injected by JavaScript is visible to crawlers — embedded JSON-LD is more reliable." },
    { name: "Internal Links in JavaScript", auto: true,  desc: "Finds internal links that only exist in JavaScript event handlers or rendered DOM — crawlers may not follow these." },
    { name: "Resource Loading Errors", auto: true,  desc: "Detects failed JS/CSS/font resource loads that could break page rendering for Googlebot." },
    { name: "Third-Party Script Impact", auto: false, desc: "Identifies heavy third-party scripts (chat widgets, analytics) that delay page interactivity and affect Core Web Vitals." },
    { name: "Hydration Errors (SSR/SSG)", auto: false, desc: "For server-rendered sites, checks for React/Next.js hydration errors that cause content mismatch between server and client HTML." },
    { name: "Client-Side Routing SEO", auto: false, desc: "For SPAs, verifies that client-side route changes update the page title, meta tags, and canonical correctly." },
  ],
  "HTML Structure": [
    { name: "Valid HTML Doctype", auto: true,  desc: "Checks all pages declare <!DOCTYPE html> at the top — missing doctype triggers quirks mode rendering in browsers." },
    { name: "Language Attribute (lang=)", auto: true,  desc: "Verifies the html lang attribute is set correctly — required for accessibility and hreflang processing." },
    { name: "Charset Declaration", auto: true,  desc: "Confirms UTF-8 charset is declared in the <head> — prevents character encoding issues in search snippets." },
    { name: "Viewport Meta Tag", auto: true,  desc: "Checks for a correct viewport meta tag — required for Google's mobile-first indexing and responsive layout." },
    { name: "Valid HTML Structure", auto: false, desc: "Validates HTML against W3C standards — unclosed tags, nested errors, and invalid attributes can affect rendering." },
    { name: "Head Section Completeness", auto: true,  desc: "Reviews the <head> for all required tags: title, meta description, canonical, viewport, and charset." },
    { name: "Body Content Exists", auto: true,  desc: "Confirms each page has non-empty <body> content — blank body pages indicate rendering or CMS build errors." },
  ],
  "M-Site vs Desktop": [
    { name: "Mobile vs Desktop Content Parity", auto: false, desc: "Checks that mobile versions serve the same main content as desktop — Google indexes the mobile version first." },
    { name: "Separate Mobile URL Configuration", auto: true,  desc: "For m-dot sites, verifies correct rel=alternate and rel=canonical annotations between mobile and desktop versions." },
    { name: "Responsive Design Detection", auto: true,  desc: "Confirms the site uses responsive design (single URL, CSS media queries) — Google's recommended mobile configuration." },
    { name: "Mobile-Friendly Viewport", auto: true,  desc: "Checks viewport meta tag is configured correctly for mobile rendering — required for mobile-friendly designation." },
    { name: "Touch Target Sizes", auto: false, desc: "Validates interactive elements (buttons, links) meet minimum 48x48px touch target requirements for mobile usability." },
    { name: "Mobile Redirect Logic", auto: true,  desc: "For m-dot sites, verifies mobile redirects are user-agent based and mirror desktop URLs one-to-one (no homepage redirects)." },
    { name: "Interstitials on Mobile", auto: false, desc: "Checks for intrusive interstitials (pop-ups blocking content) on mobile — a known negative ranking signal since 2017." },
    { name: "Font Size on Mobile", auto: false, desc: "Verifies body text is at least 16px on mobile — text too small to read causes poor mobile usability signals." },
    { name: "Mobile Page Speed Parity", auto: false, desc: "Compares Core Web Vitals between mobile and desktop — significant gaps may indicate mobile-only performance issues." },
    { name: "AMP Implementation", auto: false, desc: "For AMP pages, checks correct rel=amphtml / rel=canonical pairing and AMP validation errors." },
    { name: "Mobile Sitemap Coverage", auto: false, desc: "Verifies mobile (m-dot) URLs are included in sitemap submissions for complete mobile crawl coverage." },
    { name: "Dynamic Serving Configuration", auto: false, desc: "For dynamic serving, checks the Vary: User-Agent header is present to enable correct caching by CDNs and Googlebot." },
    { name: "Mobile Structured Data", auto: false, desc: "Checks that structured data is present on mobile versions of pages — Google's mobile indexer must see schema markup too." },
    { name: "Content Hidden Behind Tabs on Mobile", auto: false, desc: "Tests if important content is hidden in collapsed tabs/accordions on mobile — these are indexable but lower-weighted." },
    { name: "Mobile URL in Hreflang", auto: false, desc: "For m-dot international sites, verifies hreflang annotations use the mobile URLs for mobile-targeted regions." },
    { name: "Desktop-to-Mobile Crawl Parity", auto: false, desc: "Compares Googlebot Mobile vs Desktop crawl stats in GSC — large discrepancies indicate mobile-specific blocking issues." },
  ],
  "Schema & Structured Data": [
    { name: "JSON-LD Valid Syntax", auto: true,  desc: "Validates all JSON-LD blocks are syntactically correct JSON — invalid JSON is silently ignored by Google." },
    { name: "Required Schema Properties", auto: true,  desc: "Checks mandatory properties are present for each schema type (e.g., name and description for Product; headline for Article)." },
    { name: "Schema Matches Page Content", auto: false, desc: "Verifies schema markup accurately describes the visible page content — misleading schema can trigger a manual action." },
    { name: "Rich Result Eligibility", auto: false, desc: "Tests each schema type against Google's rich result requirements — confirms pages qualify for enhanced SERP features." },
    { name: "Product Schema", auto: true,  desc: "Checks product pages for correct Product schema including price, availability, and review aggregation markup." },
    { name: "Article / BlogPosting Schema", auto: true,  desc: "Verifies blog and news pages use Article or BlogPosting schema with required author, datePublished, and headline fields." },
    { name: "BreadcrumbList Schema", auto: true,  desc: "Checks breadcrumb navigation is marked up with BreadcrumbList schema for SERP breadcrumb display." },
    { name: "FAQPage Schema", auto: true,  desc: "Validates FAQ sections use FAQPage schema correctly — eligible for expanded FAQ rich results in search." },
    { name: "LocalBusiness Schema", auto: true,  desc: "For local businesses, checks LocalBusiness schema has correct name, address, phone, opening hours, and geo coordinates." },
    { name: "SiteLinks Search Box", auto: false, desc: "Checks for WebSite schema with SearchAction for sitelinks searchbox eligibility in branded SERP results." },
    { name: "HowTo Schema", auto: false, desc: "Validates HowTo schema on instructional content — eligible for step-by-step rich results in search and Google Assistant." },
    { name: "Review / AggregateRating Schema", auto: true,  desc: "Checks review markup for required ratingValue, ratingCount, and bestRating fields — star ratings drive CTR." },
    { name: "VideoObject Schema", auto: false, desc: "Verifies video pages use VideoObject schema with required thumbnailUrl, uploadDate, and description." },
    { name: "Event Schema", auto: false, desc: "Checks event pages for Event schema with name, startDate, and location — eligible for event rich results." },
    { name: "Organization Schema on Homepage", auto: true,  desc: "Verifies the homepage has Organization schema with logo, name, URL, and social profile links — supports knowledge panel." },
    { name: "Microdata vs JSON-LD Conflict", auto: true,  desc: "Detects pages using both Microdata and JSON-LD for the same entity — can cause conflicting signals; JSON-LD preferred." },
    { name: "Schema Inheritance Errors", auto: false, desc: "Checks for incorrect use of @type inheritance — using the wrong parent type reduces property validity." },
    { name: "Deprecated Schema Properties", auto: false, desc: "Flags use of schema.org properties that have been deprecated and may be ignored by Google." },
    { name: "Hidden Schema (Content Mismatch)", auto: false, desc: "Detects structured data describing entities not visible on the page — flagged by Google as spammy markup." },
    { name: "Schema Coverage Rate", auto: true,  desc: "Reports what percentage of key page types (products, articles, FAQs) have appropriate schema markup." },
    { name: "Recipe Schema", auto: false, desc: "For food/cooking sites, validates Recipe schema with required fields for recipe rich results." },
    { name: "Schema Testing Tool Errors", auto: false, desc: "Cross-references pages against Google's Rich Results Test API to identify errors and warnings at scale." },
    { name: "ItemList Schema for Category Pages", auto: false, desc: "Checks category/listing pages for ItemList schema to support carousel-style rich results in mobile search." },
    { name: "Speakable Schema", auto: false, desc: "For news publishers, checks for Speakable schema marking content suitable for text-to-speech in Google Assistant." },
  ],
  "Images & Media": [
    { name: "Alt Text Present", auto: true,  desc: "Checks all <img> tags have a non-empty alt attribute — required for image indexation, accessibility, and screen readers." },
    { name: "Alt Text Quality", auto: false, desc: "Reviews alt text for descriptiveness — generic terms like 'image' or 'photo' provide no SEO or accessibility value." },
    { name: "Image File Size", auto: true,  desc: "Flags uncompressed images over 150KB — large images are the most common cause of slow page speed and poor LCP." },
    { name: "Next-Gen Image Formats", auto: true,  desc: "Checks whether images use WebP or AVIF formats — significantly smaller than JPEG/PNG for the same visual quality." },
    { name: "Responsive Images (srcset)", auto: true,  desc: "Verifies images use srcset to serve appropriately sized versions to different screen widths — critical for mobile performance." },
    { name: "Lazy Loading Implementation", auto: true,  desc: "Checks images below the fold use loading='lazy' to defer fetches until needed — improves initial page load time." },
    { name: "Image Dimensions Specified", auto: true,  desc: "Verifies width and height attributes are set on images — prevents layout shifts (CLS) during page load." },
    { name: "Broken Images", auto: true,  desc: "Detects <img> tags with src URLs that return 404 or other errors — displays broken image icons and degrades UX." },
    { name: "Image Filename Keyword", auto: false, desc: "Reviews image filenames for descriptive keywords — 'red-running-shoes.webp' is better than 'IMG_20231025.jpg'." },
    { name: "Image Title Attributes", auto: false, desc: "Checks for meaningful title attributes on important images — provides supplementary text for hovering users." },
    { name: "Decorative Images Hidden", auto: false, desc: "Verifies decorative images (icons, backgrounds) use empty alt='' so screen readers skip them." },
    { name: "Image Sitemap Coverage", auto: false, desc: "Checks if key images are listed in a dedicated image sitemap to improve Google Image search discovery." },
    { name: "Schema for Images", auto: false, desc: "Verifies important images are referenced in structured data (ImageObject schema) with caption and author." },
    { name: "Above-the-Fold Image Preloading", auto: true,  desc: "Checks if the hero/LCP image is preloaded using <link rel=preload> — critical for achieving fast LCP scores." },
    { name: "Video Embed Performance", auto: false, desc: "Reviews third-party video embeds (YouTube, Vimeo) for lazy loading implementation — video iframes are major performance bottlenecks." },
    { name: "Image CDN Usage", auto: false, desc: "Checks if images are served from a CDN with proper Cache-Control headers — reduces latency for globally distributed users." },
  ],
  "Core Web Vitals & Page Speed": [
    { name: "Largest Contentful Paint (LCP)", auto: true,  desc: "Measures time for the largest visible element to render. Target: under 2.5s. Primary Google page experience signal." },
    { name: "Cumulative Layout Shift (CLS)", auto: true,  desc: "Measures unexpected visual movement during page load. Target: under 0.1. Causes mis-clicks and poor user experience." },
    { name: "Interaction to Next Paint (INP)", auto: true,  desc: "Measures responsiveness to all user interactions throughout the page lifetime. Target: under 200ms. Replaced FID in 2024." },
    { name: "First Contentful Paint (FCP)", auto: true,  desc: "Measures time until first content is painted. Target: under 1.8s. Signals to users the page is loading." },
    { name: "Time to First Byte (TTFB)", auto: true,  desc: "Measures server response time. Target: under 800ms. A high TTFB indicates server, hosting, or CDN issues." },
    { name: "Total Blocking Time (TBT)", auto: true,  desc: "Measures total time the main thread is blocked, preventing user interaction. Lab proxy for INP performance." },
    { name: "Speed Index", auto: true,  desc: "Measures how quickly content is visually displayed during page load. Lower score = faster perceived load time." },
    { name: "Render-Blocking Resources", auto: true,  desc: "Identifies CSS and JavaScript in the critical path that delay rendering — should be deferred or inlined." },
    { name: "Unused JavaScript", auto: true,  desc: "Flags JS files loaded but not executed — wasted bytes that increase load time without benefit." },
    { name: "Unused CSS", auto: true,  desc: "Identifies CSS rules loaded but not applied on the page — bloated stylesheets delay render-blocking parsing." },
    { name: "Image Optimization Score", auto: true,  desc: "Aggregates image format, compression, and sizing issues — the single largest quick-win category for most sites." },
    { name: "Font Loading Strategy", auto: true,  desc: "Checks font loading uses font-display:swap and preconnect hints — prevents invisible text during loading (FOIT)." },
    { name: "Cache Policy (TTL)", auto: true,  desc: "Verifies static assets have appropriate Cache-Control max-age headers — reduces repeat visit load times significantly." },
    { name: "CDN Usage", auto: false, desc: "Checks if static assets are served via a CDN — reduces latency for geographically distributed users." },
    { name: "Minified JS/CSS", auto: true,  desc: "Confirms JavaScript and CSS files are minified — removing whitespace and comments reduces file sizes by 10-40%." },
    { name: "GZIP / Brotli Compression", auto: true,  desc: "Verifies text-based assets are compressed before transmission — typically reduces transfer size by 60-80%." },
    { name: "Third-Party Script Impact", auto: false, desc: "Measures combined loading time of third-party scripts (analytics, chat, ads) — often the largest performance bottleneck." },
    { name: "Critical CSS Inlined", auto: false, desc: "Checks if above-the-fold CSS is inlined in the <head> to allow immediate rendering without waiting for external stylesheets." },
    { name: "LCP Image Preloaded", auto: true,  desc: "Verifies the LCP element's image is discovered early via <link rel=preload> — one of the highest-impact LCP fixes." },
    { name: "Mobile vs Desktop CWV Gap", auto: false, desc: "Compares field CWV data between mobile and desktop — large gaps indicate mobile-specific issues needing separate fixes." },
    { name: "CrUX Field Data Status", auto: false, desc: "Checks if the page has sufficient real-user Chrome UX Report data — pages without field data rely on lab estimates only." },
    { name: "PageSpeed Insights Score", auto: true,  desc: "Overall Lighthouse performance score (0-100). Scores below 50 indicate significant performance problems." },
    { name: "HTTP/2 or HTTP/3 Usage", auto: true,  desc: "Confirms modern protocol use — HTTP/2 enables multiplexed requests significantly reducing waterfall load time." },
    { name: "Preconnect for External Origins", auto: true,  desc: "Checks for <link rel=preconnect> hints for critical third-party origins — reduces connection setup latency." },
    { name: "Image Aspect Ratio in HTML", auto: true,  desc: "Verifies images specify width and height so the browser can reserve space — prevents layout shifts during load." },
    { name: "Long Tasks (JavaScript)", auto: false, desc: "Identifies JavaScript tasks over 50ms on the main thread that block user interaction — root cause of poor INP." },
    { name: "DOM Size", auto: true,  desc: "Flags pages with over 1,500 DOM elements — excessive DOM size slows style calculations and rendering." },
    { name: "Resource Hints Usage", auto: false, desc: "Reviews prefetch, preload, and dns-prefetch hints — strategic use can significantly improve navigation speed." },
    { name: "Web Fonts Count", auto: true,  desc: "Checks total number of web font files loaded — each font file adds a network request and potential render-blocking delay." },
    { name: "Layout Shift Sources", auto: false, desc: "Identifies the specific elements causing CLS — images without dimensions, ads, and injected banners are the most common causes." },
    { name: "Service Worker / PWA", auto: false, desc: "Checks for a service worker providing offline caching and faster repeat visits — Progressive Web App enhancement." },
    { name: "Core Web Vitals Pass Rate", auto: true,  desc: "Overall percentage of URLs passing all three Core Web Vitals thresholds (LCP, CLS, INP) in field data." },
    { name: "Interaction Delay (INP Breakdown)", auto: false, desc: "Breaks down INP into input delay, processing time, and presentation delay — needed to identify the root cause." },
    { name: "Cumulative Layout Shift Sources", auto: false, desc: "Identifies which specific DOM elements are shifting and why — the first step in fixing CLS issues." },
    { name: "Above-the-Fold Optimisation", auto: false, desc: "Reviews critical rendering path for above-the-fold content — LCP element should be render-critical, not lazy-loaded." },
  ],
  "Internal Linking & Architecture": [
    { name: "Orphaned Pages", auto: true,  desc: "Finds pages with no internal links pointing to them — orphaned pages receive no link equity and low crawl priority." },
    { name: "Internal Link Depth", auto: true,  desc: "Measures click depth from homepage. Pages more than 4 clicks deep receive reduced crawl priority and lower equity." },
    { name: "Crawl Coverage via Links", auto: true,  desc: "Estimates what % of the site is reachable by following internal links from the homepage — gaps indicate structural problems." },
    { name: "Broken Internal Links", auto: true,  desc: "Finds internal links pointing to pages that return 404 or redirect — wastes crawl budget and link equity." },
    { name: "Internal Link Anchor Text", auto: false, desc: "Reviews whether internal links use descriptive, keyword-rich anchor text vs generic 'click here' or 'read more'." },
    { name: "Hub Pages / Pillar Content Links", auto: false, desc: "Checks if high-authority hub pages link to supporting cluster content — pillar-cluster architecture boosts topical authority." },
    { name: "Reciprocal Link Ratio", auto: false, desc: "Flags excessive mutual linking between pages — high reciprocal link ratios can appear manipulative to algorithms." },
    { name: "Link Distribution Evenness", auto: false, desc: "Analyses internal PageRank flow — identifies if link equity is concentrated in a few pages while key pages are under-linked." },
    { name: "Pagination Link Structure", auto: false, desc: "Checks paginated series use rel=next/prev links or clear numerical pagination for correct crawl sequencing." },
    { name: "Navigation Link Depth", auto: false, desc: "Reviews whether key category and product pages are reachable from global navigation — max 2 clicks from homepage." },
    { name: "Footer Link Quality", auto: false, desc: "Audits footer links for relevance — site-wide footer links pass link equity to every page and should point to key destinations." },
    { name: "Sidebar / Related Content Links", auto: false, desc: "Checks sidebar and related content modules link to topically relevant pages — strengthens topical clustering." },
    { name: "Breadcrumb Navigation Links", auto: true,  desc: "Verifies breadcrumb navigation provides crawlable links to parent category pages — reinforces URL hierarchy signals." },
    { name: "Nofollow on Internal Links", auto: true,  desc: "Flags internal links with rel=nofollow — this blocks PageRank flow and should almost never be used on internal links." },
    { name: "Link to Noindexed Pages", auto: true,  desc: "Identifies internal links pointing to noindexed pages — wastes link equity on pages that won't rank." },
    { name: "Maximum Links per Page", auto: true,  desc: "Checks if any pages exceed ~150 internal links — Google crawls all links but equity per link decreases with volume." },
    { name: "Category-to-Product Link Coverage", auto: false, desc: "For ecommerce, verifies all product pages are linked from at least one category page in the main navigation tree." },
    { name: "Cross-Category Internal Linking", auto: false, desc: "Reviews whether related products or articles across categories are cross-linked — expands topical context signals." },
    { name: "JavaScript-Only Internal Links", auto: true,  desc: "Finds links that only exist in JavaScript and may not be crawled — all critical navigation should use standard <a href=>." },
    { name: "Internal Link Velocity (New Pages)", auto: false, desc: "Checks if newly published pages receive internal links within the first crawl cycle — new content with no links won't rank." },
    { name: "Link Equity to Key Conversion Pages", auto: false, desc: "Analyses if high-priority conversion pages (demo, pricing, contact) receive sufficient internal link equity." },
    { name: "Site Architecture Depth Visualisation", auto: false, desc: "Maps the URL depth tree to identify structural imbalances — too-shallow or too-deep architectures affect crawl efficiency." },
    { name: "Homepage Link Audit", auto: false, desc: "Reviews the homepage's internal links — the homepage distributes the most equity and its links should reflect SEO priorities." },
    { name: "Internal Redirect Links", auto: true,  desc: "Finds internal links that point to redirecting URLs — should be updated to point directly to final destination." },
    { name: "Missing Internal Links to High-Traffic Pages", auto: false, desc: "Cross-references top organic landing pages from GSC against their internal link count — popular pages should be well-linked." },
  ],
  "Local SEO": [
    { name: "NAP Consistency", auto: false, desc: "Checks that Name, Address, and Phone number are identical across the website, GMB, and major citation sources." },
    { name: "LocalBusiness Schema", auto: true,  desc: "Verifies LocalBusiness (or subtype) schema with name, address, phone, opening hours, geo, and URL." },
    { name: "Google Business Profile Optimisation", auto: false, desc: "Reviews GBP completeness: categories, description, photos, services, Q&A, and regular post frequency." },
    { name: "Local Landing Pages", auto: false, desc: "For multi-location businesses, checks each location has a dedicated, unique landing page with local content." },
    { name: "Local Citation Coverage", auto: false, desc: "Audits presence on major citation sources (Yelp, TripAdvisor, industry directories) — citations are a local ranking factor." },
    { name: "Review Schema Markup", auto: true,  desc: "Checks for AggregateRating schema on local pages showing review count and average rating for rich results." },
    { name: "Opening Hours Markup", auto: true,  desc: "Verifies OpeningHoursSpecification is correctly implemented in schema — enables hours display in knowledge panels." },
    { name: "Location Page Internal Linking", auto: false, desc: "Checks that location pages are accessible from a store finder or locations section and not orphaned." },
    { name: "City/Region in Key On-Page Elements", auto: false, desc: "Verifies the target city or region appears in title tag, H1, and body content for local keyword relevance." },
    { name: "GeoCoordinates Schema", auto: true,  desc: "Checks GeoCoordinates schema (latitude/longitude) is present and accurate — used by Google Maps and knowledge panel." },
    { name: "Local Backlink Signals", auto: false, desc: "Reviews presence of links from local news sites, chambers of commerce, and regional directories." },
    { name: "Hreflang for Local Variants", auto: false, desc: "For businesses targeting multiple language regions locally, checks hreflang correctly differentiates local language variants." },
    { name: "Mobile Click-to-Call", auto: false, desc: "Verifies phone numbers are linked with tel: on mobile pages — click-to-call is a key local UX and ranking signal." },
    { name: "Embedded Google Maps", auto: false, desc: "Checks for an embedded map on location pages — reinforces geographic relevance signals to local search algorithms." },
    { name: "Service Area Pages", auto: false, desc: "For service-area businesses, reviews whether towns and regions served have individual SEO-optimised pages." },
    { name: "Local Content Uniqueness", auto: false, desc: "Checks each location page has genuinely unique content beyond just the location name in a template." },
    { name: "Review Management", auto: false, desc: "Reviews response rate to Google reviews — businesses that respond to reviews outperform those that don't in local packs." },
    { name: "Competitor Proximity Analysis", auto: false, desc: "Identifies local competitors ranking in the same pack — used to benchmark optimisation gaps." },
    { name: "Local Structured Data Errors in GSC", auto: false, desc: "Checks Google Search Console for structured data errors on local pages that may suppress rich result display." },
    { name: "Location Page URL Structure", auto: false, desc: "Reviews URL format for location pages — /locations/city-name is cleaner and more crawlable than query strings." },
    { name: "Multi-Location Sitemap Section", auto: false, desc: "Verifies all location pages are included in the sitemap — critical for crawl discovery of large location sets." },
  ],
  "Backlinks & Authority": [
    { name: "Total Referring Domains", auto: false, desc: "Counts unique domains linking to the site — a primary indicator of overall domain authority and trust." },
    { name: "Toxic / Spammy Link Detection", auto: false, desc: "Identifies backlinks from link farms, PBNs, or spammy directories that could trigger algorithmic or manual penalties." },
    { name: "Anchor Text Distribution", auto: false, desc: "Reviews the mix of branded, exact-match, partial-match, and generic anchor text — unnatural over-optimisation is a risk factor." },
    { name: "Follow vs Nofollow Ratio", auto: false, desc: "Analyses the proportion of followed vs nofollowed backlinks — a natural link profile contains a mix of both." },
    { name: "Link Velocity (Rate of Gain)", auto: false, desc: "Tracks the rate of new link acquisition — unnatural spikes can trigger algorithmic scrutiny." },
    { name: "High-Authority Links Presence", auto: false, desc: "Checks for backlinks from high-DA domains (government, education, major news) — these carry the most ranking weight." },
    { name: "Lost Backlinks (Recent)", auto: false, desc: "Identifies valuable links lost in recent months that may need reclamation — common after site migrations." },
    { name: "Broken Backlinks (External 404s)", auto: false, desc: "Finds inbound links pointing to 404 pages — each one is recoverable link equity with a simple redirect." },
    { name: "Competitor Link Gap", auto: false, desc: "Compares your backlink profile against top competitors — surfaces link-building targets your competitors have but you don't." },
    { name: "Linking Domain Diversity", auto: false, desc: "Analyses geographic and industry diversity of referring domains — diverse, natural profiles signal organic link acquisition." },
    { name: "Internal vs External Link Ratio", auto: false, desc: "Reviews balance between internal and external links on pages — too many external links relative to internal can dilute equity." },
    { name: "Link Building Opportunity Pages", auto: false, desc: "Identifies your pages that already rank well and deserve more external links to push them to position 1." },
    { name: "Disavow File Review", auto: false, desc: "Checks if an existing Google disavow file is present and whether it's current — stale disavow files may be unnecessary or incomplete." },
    { name: "Outbound Link Quality", auto: false, desc: "Reviews external links pointing from your pages to other sites — linking to low-quality or penalised sites can transfer negative signals." },
    { name: "PageRank Distribution", auto: false, desc: "Analyses which pages on your site attract the most external links — used to identify authority pages and internal linking priorities." },
    { name: "Nofollow Backlinks Value", auto: false, desc: "Reviews nofollow backlinks for traffic and brand value — while not passing direct equity, they drive referral traffic and brand awareness." },
    { name: "Link Reclamation Opportunities", auto: false, desc: "Finds brand mentions or implied links from authority sites that haven't linked back yet — outreach candidates." },
    { name: "Site-Wide Link Detection", auto: false, desc: "Identifies site-wide links (footer links on other domains) — these often pass less equity and can look unnatural in bulk." },
    { name: "Press / Media Coverage", auto: false, desc: "Reviews presence of links from media publications and PR placements — earned editorial links are the strongest type." },
    { name: "Guest Post Link Profile", auto: false, desc: "Checks if the link profile is heavily reliant on guest post links — Google has discounted low-quality guest post link schemes." },
    { name: "Domain Rating Trend", auto: false, desc: "Tracks changes in domain-level authority metrics over time — sustained declines may indicate link losses or penalties." },
    { name: "Backlink Country Distribution", auto: false, desc: "For local/regional sites, verifies a majority of links come from the target country — geo-relevance matters for local rankings." },
    { name: "Redirect-Through Links", auto: false, desc: "Checks how many inbound links point to redirecting URLs — equity is partially lost through redirects; link targets should be updated." },
    { name: "Backlink-to-Traffic Correlation", auto: false, desc: "Analyses whether pages with the most backlinks also drive the most organic traffic — mismatches indicate conversion optimisation opportunities." },
  ],
  "Hreflang": [
    { name: "Hreflang Tags Present", auto: true,  desc: "Checks that multilingual/multiregional pages have hreflang annotations — required for correct language/region targeting." },
    { name: "Reciprocal Hreflang Links", auto: true,  desc: "Verifies every page referenced by another page's hreflang tag links back — one-way hreflang is invalid and ignored." },
    { name: "x-default Annotation", auto: true,  desc: "Checks for an x-default hreflang tag specifying the fallback URL for unmatched regions or languages." },
    { name: "Valid Language Codes", auto: true,  desc: "Validates hreflang language codes follow ISO 639-1 (e.g., en, fr, de) — invalid codes cause the entire set to be ignored." },
    { name: "Valid Region Codes", auto: true,  desc: "Validates hreflang region codes follow ISO 3166-1 alpha-2 (e.g., en-GB, fr-FR) — malformed region codes break the annotation." },
    { name: "Hreflang URL Accessibility", auto: true,  desc: "Confirms all hreflang-referenced URLs return a 200 response — 404s or redirects in hreflang break the cluster." },
    { name: "Hreflang in Sitemap vs HTML Head", auto: false, desc: "Reviews whether hreflang is implemented via HTML head or sitemap — both are valid but mixing methods is error-prone." },
    { name: "Missing Language Variants", auto: false, desc: "Identifies gaps in the hreflang cluster — if English has 5 alternates but French only has 3, something is misconfigured." },
  ],
  "Analytics & Tracking": [
    { name: "GA4 Tag Present", auto: true,  desc: "Confirms Google Analytics 4 tag is firing on all key pages — without it, you're flying blind on traffic and behaviour data." },
    { name: "No Duplicate Analytics Tags", auto: true,  desc: "Checks only one GA4 tag fires per page — duplicates inflate all metrics by double or triple counting." },
    { name: "Google Tag Manager Deployment", auto: true,  desc: "Verifies GTM container loads correctly and fires on all pages — GTM deployment errors cause tracking gaps." },
    { name: "Conversion Tracking", auto: false, desc: "Checks whether key conversion events (form submit, purchase, sign-up) are tracked in GA4 or Google Ads." },
    { name: "Search Console Linked to GA4", auto: false, desc: "Verifies GSC is linked to GA4 for organic traffic data in the Traffic Acquisition report." },
    { name: "Internal Traffic Filtering", auto: false, desc: "Checks IP or developer filters are in place to exclude internal/developer traffic from contaminating analytics data." },
    { name: "Cross-Domain Tracking", auto: false, desc: "For sites spanning multiple domains (e.g., shop.domain.com), verifies cross-domain measurement is configured." },
    { name: "Event Tracking Completeness", auto: false, desc: "Reviews whether key user interactions (scroll depth, video plays, downloads) are tracked as events." },
    { name: "Core Web Vitals in GA4", auto: false, desc: "Checks if CWV data (LCP, CLS, INP) is being sent to GA4 via web vitals library — enables field data in your own analytics." },
    { name: "Heatmap / Session Recording Tool", auto: false, desc: "Checks for presence of qualitative analytics tools (Hotjar, Microsoft Clarity) for UX optimisation data." },
    { name: "Analytics on Error Pages", auto: true,  desc: "Verifies analytics fires on 404 and error pages — these represent lost traffic that can be recovered with redirects." },
    { name: "Subdomain Tracking", auto: false, desc: "For sites with subdomains, checks whether subdomain sessions are tracked as same session or separate sources." },
    { name: "PageView Deduplication", auto: false, desc: "Checks that SPA (React, Angular) pages fire pageview events correctly on route changes without duplication." },
    { name: "Attribution Model Configuration", auto: false, desc: "Reviews GA4 attribution model settings — data-driven attribution is Google's recommended model for SEO/paid mix analysis." },
    { name: "Cookie Consent Compliance", auto: false, desc: "Verifies analytics only loads after cookie consent is granted — GDPR/CCPA compliance requirement that affects data completeness." },
    { name: "Benchmark Data Availability", auto: false, desc: "Checks that at least 12 months of data is available for year-over-year comparison — baseline for seasonality analysis." },
  ],
  "Log File & Crawl Analysis": [
    { name: "Googlebot Crawl Frequency", auto: false, desc: "Analyses log file data to determine how often Googlebot visits — low frequency may indicate crawl budget issues." },
    { name: "Crawl Budget Allocation", auto: false, desc: "Reviews which URL types consume the most crawl budget — identifies whether critical pages receive sufficient crawl attention." },
    { name: "Bot vs Human Traffic Ratio", auto: false, desc: "Compares bot traffic patterns against analytics — helps identify crawler-only issues invisible in user-facing tools." },
    { name: "Uncrawled Important Pages", auto: false, desc: "Cross-references log file data with sitemap — surfaces pages that haven't been crawled despite being submitted." },
    { name: "Crawl Error Rate", auto: false, desc: "Measures what % of Googlebot requests result in non-200 responses — high error rates reduce crawl efficiency." },
    { name: "Crawl Distribution by Section", auto: false, desc: "Shows which site sections (blog, products, categories) attract the most Googlebot crawl attention." },
    { name: "Crawl Spike Detection", auto: false, desc: "Identifies unusual spikes in Googlebot crawl activity — may indicate a sitemap submission, link acquisition, or content change." },
    { name: "Parameter URL Crawl Waste", auto: false, desc: "Quantifies how much crawl budget is wasted on parameter URL variants — guides robots.txt or canonical fixes." },
    { name: "Fetch Frequency vs Content Freshness", auto: false, desc: "Compares how often pages are crawled vs how often they're updated — frequently crawled, rarely updated pages waste budget." },
    { name: "Mobile vs Desktop Bot Crawl", auto: false, desc: "Compares Googlebot Smartphone vs Googlebot Desktop crawl patterns — significant gaps indicate mobile crawling issues." },
    { name: "CDN / Bot Filtering Accuracy", auto: false, desc: "Checks whether Googlebot is correctly identified in logs vs being filtered by CDN or WAF rules." },
    { name: "Log File Retention Availability", auto: false, desc: "Confirms server log files are being retained and are accessible for ongoing audit — a prerequisite for all log analysis." },
    { name: "Image / PDF Crawl Ratio", auto: false, desc: "Reviews what % of crawl budget is spent on non-HTML assets — may indicate unnecessary media file crawling." },
  ],
};

const CATEGORIES = [
  { name: "Content Quality & Duplicates",    checks: 37, route: "/content-quality" },
  { name: "Core Web Vitals & Page Speed",    checks: 35, route: "/core-web-vitals" },
  { name: "Sitemaps",                         checks: 27, route: "/sitemaps" },
  { name: "Canonical Tags",                   checks: 26, route: "/canonical-tags" },
  { name: "Internal Linking & Architecture", checks: 25, route: "/internal-linking" },
  { name: "Schema & Structured Data",        checks: 24, route: "/schema" },
  { name: "Backlinks & Authority",           checks: 24, route: "/backlinks" },
  { name: "URL Structure",                   checks: 23, route: "/url-structure" },
  { name: "Title Tags",                      checks: 22, route: "/title-tags" },
  { name: "Local SEO",                       checks: 21, route: "/local-seo" },
  { name: "Robots.txt",                      checks: 20, route: "/robots-txt" },
  { name: "Headings",                        checks: 18, route: "/headings" },
  { name: "Meta Robots & Indexation",        checks: 17, route: "/meta-robots" },
  { name: "M-Site vs Desktop",              checks: 16, route: "/m-site-desktop" },
  { name: "Images & Media",                 checks: 16, route: "/images-media" },
  { name: "Analytics & Tracking",           checks: 16, route: "/analytics-tracking" },
  { name: "Keyword Strategy",               checks: 15, route: "/keyword-strategy" },
  { name: "Redirects",                       checks: 14, route: "/redirects" },
  { name: "Log File & Crawl Analysis",      checks: 13, route: "/log-file-analysis" },
  { name: "JavaScript & Rendering",         checks: 13, route: "/javascript-rendering" },
  { name: "Meta Descriptions",              checks: 12, route: "/meta-descriptions" },
  { name: "404 & Status Errors",            checks: 11, route: "/404-errors" },
  { name: "HTTPS & Security",              checks:  9, route: "/https-security" },
  { name: "Hreflang",                       checks:  8, route: "/hreflang" },
  { name: "Response Codes & HTTP Status",  checks:  7, route: "/response-codes" },
  { name: "HTML Structure",                checks:  7, route: "/html-structure" },
];

const TOTAL = CATEGORIES.reduce((s, c) => s + c.checks, 0);

// Maps each category to the backend section key(s) that supply its crawl data
const SECTION_MAP = {
  "Response Codes & HTTP Status":  ["response-codes"],
  "Redirects":                     ["redirects"],
  "404 & Status Errors":           ["404-errors"],
  "HTTPS & Security":              ["https-security"],
  "Canonical Tags":                ["canonicals"],
  "Robots.txt":                    ["robots-txt"],
  "Meta Robots & Indexation":      ["meta-robots"],
  "URL Structure":                 ["url-structure"],
  "Title Tags":                    ["meta-tags"],
  "Meta Descriptions":             ["meta-tags"],
  "Headings":                      ["headings"],
  "Content Quality & Duplicates":  ["content-quality"],
  "Keyword Strategy":              ["keyword-strategy"],
  "Sitemaps":                      ["sitemaps"],
  "JavaScript & Rendering":        ["javascript-rendering"],
  "HTML Structure":                ["html-structure"],
  "M-Site vs Desktop":             ["m-site-desktop"],
  "Schema & Structured Data":      ["structured-data"],
  "Images & Media":                ["images-media"],
  "Core Web Vitals & Page Speed":  ["core-web-vitals"],
  "Internal Linking & Architecture":["internal-links"],
  "Local SEO":                     ["local-seo"],
  "Backlinks & Authority":         [],
  "Hreflang":                      ["hreflang"],
  "Analytics & Tracking":          ["analytics-tracking"],
  "Log File & Crawl Analysis":     [],
};

// ─── Chevron icon ──────────────────────────────────────────────────────────────
function Chevron({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round"
         style={{ width: 16, height: 16, flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// ─── Data Source Status Panel ─────────────────────────────────────────────────
const SOURCE_META = {
  database:  { label: "Database",             icon: "🗄️" },
  sf_cli:    { label: "Screaming Frog CLI",   icon: "🕷️" },
  gsc:       { label: "Google Search Console",icon: "🔍" },
  ga4:       { label: "Google Analytics 4",  icon: "📊" },
  claude:    { label: "Claude AI",            icon: "🤖" },
  psi:       { label: "PageSpeed Insights",  icon: "⚡" },
  linear:    { label: "Linear",              icon: "📋" },
  slack:     { label: "Slack Webhook",       icon: "💬" },
  smtp:      { label: "SMTP Email",          icon: "📧" },
};

function StatusBadge({ status }) {
  const cfg = {
    pass: { bg: "#D1FAE5", color: "#065F46", label: "Pass"  },
    warn: { bg: "#FEF3C7", color: "#92400E", label: "Warn"  },
    fail: { bg: "#FEE2E2", color: "#991B1B", label: "Fail"  },
    skip: { bg: "#F3F4F6", color: "#6B7280", label: "Skip"  },
  }[status] || { bg: "#F3F4F6", color: "#6B7280", label: "—" };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 6, fontSize: 11, fontWeight: 700,
      padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.05em",
    }}>{cfg.label}</span>
  );
}

function DataSourcePanel({ onClose }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  function runTest() {
    setLoading(true);
    setError(null);
    api.get("/settings/status")
      .then(r => { setStatus(r.data); setLoading(false); })
      .catch(e => { setError(e.message || "Request failed"); setLoading(false); });
  }

  useEffect(() => { runTest(); }, []);

  const summary = status?._summary;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:1000,
      }} />
      {/* Drawer */}
      <div style={{
        position:"fixed", top:0, right:0, bottom:0, width:440,
        background:"var(--surface, #fff)", zIndex:1001,
        boxShadow:"-4px 0 24px rgba(0,0,0,0.12)",
        display:"flex", flexDirection:"column", overflowY:"auto",
      }}>
        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"20px 24px 16px", borderBottom:"1px solid var(--border)",
          position:"sticky", top:0, background:"var(--surface, #fff)", zIndex:2,
        }}>
          <div>
            <div style={{ fontWeight:700, fontSize:16 }}>Data Source Status</div>
            {status?._tested_at && (
              <div style={{ fontSize:11, color:"var(--text-secondary)", marginTop:2 }}>
                Last tested: {new Date(status._tested_at).toLocaleTimeString()}
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-sm" onClick={runTest} disabled={loading}
              style={{ fontSize:12, padding:"5px 12px" }}>
              {loading ? "Testing…" : "Re-test"}
            </button>
            <button onClick={onClose} style={{
              background:"none", border:"none", cursor:"pointer",
              color:"var(--text-secondary)", fontSize:20, lineHeight:1, padding:4,
            }}>×</button>
          </div>
        </div>

        <div style={{ padding:"16px 24px", flex:1 }}>
          {loading && !status && (
            <div style={{ textAlign:"center", color:"var(--text-secondary)", padding:"48px 0" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🔄</div>
              Running live tests on all data sources…
            </div>
          )}

          {error && (
            <div style={{
              background:"#FEE2E2", color:"#991B1B", borderRadius:8,
              padding:"12px 16px", fontSize:13, marginBottom:16,
            }}>
              Test failed: {error}
            </div>
          )}

          {status && (
            <>
              {/* Summary bar */}
              {summary && (
                <div style={{
                  display:"flex", gap:8, marginBottom:20,
                  background:"var(--surface-secondary, #f9fafb)",
                  borderRadius:10, padding:"12px 16px",
                }}>
                  {[
                    { key:"pass", color:"#10B981", label:"Passing" },
                    { key:"warn", color:"#F59E0B", label:"Warnings" },
                    { key:"fail", color:"#EF4444", label:"Failing" },
                    { key:"skip", color:"#9CA3AF", label:"Skipped" },
                  ].map(s => (
                    <div key={s.key} style={{ flex:1, textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:s.color }}>
                        {summary[s.key] || 0}
                      </div>
                      <div style={{ fontSize:11, color:"var(--text-secondary)" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Individual sources */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(SOURCE_META).map(([key, meta]) => {
                  const s = status[key] || "skip";
                  const detail = status[`${key}_detail`] || "";
                  return (
                    <div key={key} style={{
                      display:"flex", alignItems:"flex-start", gap:12,
                      background:"var(--surface-secondary, #f9fafb)",
                      borderRadius:10, padding:"12px 14px",
                      border: s === "fail" ? "1px solid #FCA5A5"
                            : s === "warn" ? "1px solid #FCD34D"
                            : s === "pass" ? "1px solid #A7F3D0"
                            : "1px solid transparent",
                    }}>
                      <span style={{ fontSize:20, lineHeight:1, marginTop:1 }}>{meta.icon}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontWeight:600, fontSize:13 }}>{meta.label}</span>
                          <StatusBadge status={s} />
                        </div>
                        {detail && (
                          <div style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.5, wordBreak:"break-word" }}>
                            {detail}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function AuditHealth() {
  const [checks, setChecks] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [showStatus, setShowStatus] = useState(false);
  const [sections, setSections] = useState({});     // section key → { critical, warning, info, ok }
  const { activeSiteId } = useSites();

  useEffect(() => {
    api.get("/checks").then(r => setChecks(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeSiteId) return;
    api.get(`/reports/${activeSiteId}/summary`)
      .then(r => setSections(r.data?.sections || {}))
      .catch(() => {});
  }, [activeSiteId]);

  // Returns { working, notWorking } for a category based on real data availability
  function getWorkingCounts(catName) {
    const catChecks = CHECKS_DATA[catName] || [];
    const autoChecks = catChecks.filter(c => c.auto);
    const manualChecks = catChecks.filter(c => !c.auto);
    const sectionKeys = SECTION_MAP[catName] || [];
    const hasData = sectionKeys.some(k => sections[k]);
    const workingAuto = hasData ? autoChecks.length : 0;
    const notWorking = autoChecks.length - workingAuto + manualChecks.length;
    return { working: workingAuto, notWorking };
  }

  const passing = checks.filter(c => c.status === "pass").length;
  const total = checks.length || TOTAL;

  function toggleRow(name) {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <div className="space-y-5">
      {showStatus && <DataSourcePanel onClose={() => setShowStatus(false)} />}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 className="page-title">Audit Health</h1>
          <p className="page-desc">Pass/fail status across all {TOTAL} SEO checks in 26 categories.</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button className="btn btn-secondary" onClick={() => setShowStatus(true)}
            style={{ fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
            <span>🔌</span> Data Source Status
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ fontFamily:"Plus Jakarta Sans,sans-serif", fontWeight:800, fontSize:28, color:"var(--brand)" }}>{passing}</div>
            <div style={{ fontSize:13, color:"var(--text-secondary)" }}>/ {total} passing</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card-sm">
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--text-secondary)", marginBottom:8 }}>
          <span>Overall Coverage</span>
          <span style={{ fontWeight:600, color: total>0 && (passing/total)>=0.7 ? "var(--pass)" : "var(--warning)" }}>
            {total>0 ? Math.round((passing/total)*100) : 0}%
          </span>
        </div>
        <div className="progress-bar" style={{ height:10 }}>
          <div className="progress-fill success" style={{ width: total>0 ? `${(passing/total)*100}%` : "0%" }} />
        </div>
      </div>

      {/* Category table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Category</th>
              <th>Total Checks</th>
              <th>Automated</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => {
              const { working, notWorking } = getWorkingCounts(cat.name);
              const catChecks = CHECKS_DATA[cat.name] || [];
              const isOpen = !!expanded[cat.name];

              return (
                <>
                  <tr key={cat.name}
                      onClick={() => toggleRow(cat.name)}
                      style={{ cursor: "pointer" }}
                      className={isOpen ? "active" : ""}>
                    <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                      <Chevron open={isOpen} />
                    </td>
                    <td style={{ fontWeight: 500 }}>{cat.name}</td>
                    <td style={{ fontFamily: "JetBrains Mono,monospace", fontWeight: 700 }}>{cat.checks}</td>
                    <td>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: working > 0 ? "#065F46" : "var(--text-secondary)",
                      }}>
                        <span style={{ color: "#10B981", fontWeight: 700 }}>{working} working</span>
                        {" / "}
                        <span style={{ color: notWorking > 0 ? "#EF4444" : "var(--text-secondary)" }}>{notWorking} not working</span>
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-gray">⏳ No crawl data</span>
                    </td>
                  </tr>

                  {isOpen && catChecks.map((chk, idx) => (
                    <tr key={`${cat.name}-${idx}`}
                        style={{ background: "var(--surface-secondary, #f9fafb)" }}>
                      <td />
                      <td colSpan={4} style={{ paddingLeft: 32, paddingTop: 10, paddingBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          {/* auto/manual pill */}
                          <span style={{
                            flexShrink: 0,
                            marginTop: 1,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: chk.auto ? "#DBEAFE" : "#F3F4F6",
                            color: chk.auto ? "#1D4ED8" : "#6B7280",
                          }}>
                            {chk.auto ? "Auto" : "Manual"}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{chk.name}</div>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{chk.desc}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
