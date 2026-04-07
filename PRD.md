# Product Requirements Document
## SEO Audit Platform

**Version:** 1.0  
**Date:** April 2026  
**Status:** Living Document

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Roles & Personas](#3-user-roles--personas)
4. [Current Features](#4-current-features)
   - 4.1 [Site Management](#41-site-management)
   - 4.2 [Web Crawling Engine](#42-web-crawling-engine)
   - 4.3 [Audit & Issue Detection](#43-audit--issue-detection)
   - 4.4 [AI-Powered Recommendations](#44-ai-powered-recommendations)
   - 4.5 [Google Search Console Integration](#45-google-search-console-integration)
   - 4.6 [Google Analytics 4 Integration](#46-google-analytics-4-integration)
   - 4.7 [PageSpeed Insights](#47-pagespeed-insights)
   - 4.8 [Linear Integration](#48-linear-integration)
   - 4.9 [Notifications (Slack & Email)](#49-notifications-slack--email)
   - 4.10 [Export & Reporting](#410-export--reporting)
   - 4.11 [Scheduled Crawls](#411-scheduled-crawls)
   - 4.12 [Task & Kanban Board](#412-task--kanban-board)
   - 4.13 [User Management & Auth](#413-user-management--auth)
   - 4.14 [System Health Dashboard](#414-system-health-dashboard)
5. [Audit Coverage (477 Checks)](#5-audit-coverage-477-checks)
6. [Technical Architecture](#6-technical-architecture)
7. [Future Roadmap](#7-future-roadmap)
   - 7.1 [CMS Integrations](#71-cms-integrations)
   - 7.2 [Advanced AI Features](#72-advanced-ai-features)
   - 7.3 [Expanded Analytics](#73-expanded-analytics)
   - 7.4 [Collaboration & Workflow](#74-collaboration--workflow)
   - 7.5 [Additional Integrations](#75-additional-integrations)
   - 7.6 [Performance & Scale](#76-performance--scale)
   - 7.7 [Reporting & Dashboards](#77-reporting--dashboards)
8. [Non-Goals](#8-non-goals)
9. [Constraints & Dependencies](#9-constraints--dependencies)

---

## 1. Product Overview

The SEO Audit Platform is an open-source, self-hosted technical SEO tool that crawls websites, detects issues across 477 predefined SEO checks, delivers AI-powered fix recommendations via Claude, and integrates with the tools teams already use (GSC, GA4, Linear, Slack, Google Sheets).

It is designed for in-house SEO teams and agencies who need a repeatable, auditable, automation-first SEO workflow — without the cost or data-sharing constraints of SaaS alternatives like Ahrefs, SEMrush, or Lumar.

**Core value proposition:** Own your crawl data. Automate your audits. Ship fixes faster with AI.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|------|--------|
| Surface critical SEO issues fast | Time from crawl start → first actionable issue < 5 min |
| Reduce manual audit effort | % of issues auto-categorised vs. manually tagged |
| Accelerate fix velocity | Average time from issue detection → Linear ticket created |
| Improve audit consistency | % of 477 checks covered per crawl |
| Enable non-SEO teams to act | Issues assigned and resolved via task board by dev/content teams |

---

## 3. User Roles & Personas

### Founder (Full Access)
Platform owner or lead SEO. Can manage sites, users, integrations, billing configuration, and view all cross-site data. Invites team members, configures credentials, and sets crawl schedules.

### SEO Manager
Day-to-day SEO practitioner. Runs crawls, interprets audit results, creates Linear tickets, exports reports. Cannot manage users or change platform settings.

### Read-Only (Stakeholder / Client)
View and export audit results only. Cannot trigger crawls or create tickets. Intended for clients, executives, or external stakeholders who need visibility without edit access.

---

## 4. Current Features

### 4.1 Site Management

Users can register multiple websites as "sites" within the platform. Each site stores:

- **Label & URL** — display name and canonical base URL
- **GSC Property** — linked Google Search Console property
- **GA4 Property ID** — linked Google Analytics 4 data stream
- **Color** — visual tag for multi-site dashboards
- **Google Sheets Tab** — target tab for push exports
- **Linear Project ID** — project tickets are filed under

Sites are the central organising unit. All crawl history, audit results, GSC data, GA4 data, Linear connections, and schedules are scoped to a site.

---

### 4.2 Web Crawling Engine

Crawls are powered by **Screaming Frog SEO Spider CLI** (headless mode), spawned as a child process. Real-time progress and logs are streamed to the frontend via Socket.io.

**Crawl Modes:**

| Mode | Description |
|------|-------------|
| **Spider** | Follows links from the root URL. Standard full-site audit. |
| **List** | Crawls a predefined list of URLs or a sitemap. Use for targeted audits. |
| **Import** | Parses uploaded Screaming Frog CSV exports. No live crawl required. |
| **Compare** | Diffs two completed crawl jobs and surfaces new/fixed/regressed issues. |

**Configuration options:**
- Crawl depth (default unlimited)
- Thread count (default 5)
- JavaScript rendering (none / basic JS)
- User agent presets (Screaming Frog, Googlebot, Bingbot, custom)
- Respect/ignore robots.txt and meta robots
- Custom request headers and URL rewrite rules

**Job lifecycle:** `running → completed | failed | cancelled`

Completed jobs are persisted in the database and available for historical comparison indefinitely (until manually deleted).

---

### 4.3 Audit & Issue Detection

Each completed crawl produces a set of **audit results** — individual issue instances linked to a URL and classified by:

- **Section** — the audit category (e.g. meta-tags, headings, canonical-tags)
- **Severity** — `critical`, `warning`, `info`, `ok`
- **Issue Type** — e.g. `missing_title`, `duplicate_h1`, `broken_image`
- **Data payload** — raw field values (JSON) extracted by Screaming Frog

**Audit Health Score** is calculated as:
```
score = 100 - (((critical × 3) + (warning × 2) + (info × 1)) / total_urls × 10)
```

The score powers the audit health ring chart and trend line on the **Audit Health** page (`/audit-health`), which also shows:
- A full categorised checklist of all 477 checks, each tagged as `automated` or `manual`
- Per-check descriptions explaining what is detected and why it matters
- Pass/fail/warning status per check for the latest crawl
- Crawl comparison timeline — health score over consecutive crawls

**27 dedicated audit category pages** are available in the UI, each providing filtered, sortable, paginated views of issues with inline AI recommendation access.

---

### 4.4 AI-Powered Recommendations

When a user opens any audit issue, they can request a Claude-powered recommendation. The system:

1. Checks a cache (per check + crawl job) to avoid redundant API calls
2. If uncached, streams a response from `claude-sonnet-4-6` via Server-Sent Events
3. Caches the full response for future access
4. Prompts Claude as a **senior technical SEO engineer** with:
   - Issue name, category, severity
   - Sample of affected URLs
   - Total affected URL count
   - Detection method
5. Claude returns a structured response:
   - Root cause (2–3 sentences)
   - Step-by-step fix instructions
   - How to verify the fix
   - Priority assessment

Users can rate each suggestion (thumbs up / thumbs down) to build a feedback dataset.

---

### 4.5 Google Search Console Integration

OAuth2 connection to the Google Search Console API (webmasters v3).

**Data fetched per site:**
- Page-level: clicks, impressions, CTR, position (current 28 days + previous 28 days for delta)
- Query-level: top queries with clicks, impressions, CTR, position
- Daily trend: 16-week click/impression/CTR/position history

**Frontend views:**
- GSC Overlay page — trend chart, top queries table, page performance table
- Founder View — cross-site GSC summary with period-over-period comparison

All data is cached in the database. Users can trigger a manual refresh at any time.

---

### 4.6 Google Analytics 4 Integration

OAuth2 connection to the GA4 Data API (analyticsdata v1beta).

**Data fetched per site (28-day rolling window):**
- sessions, engaged sessions, engagement rate, bounce rate
- average session duration, total revenue, conversions
- Scoped by `pagePath` dimension

**Frontend view:** GA4 Overlay page — page-level metrics table with sort/search.

---

### 4.7 PageSpeed Insights

Integrates with the Google PageSpeed Insights API (PSI v5).

**Per URL, both mobile and desktop:**
- Lighthouse performance score
- Core Web Vitals: LCP, CLS, FCP, TTFB
- CrUX field data (if available for the URL)

**Issue detection thresholds:**
- LCP > 2.5s → critical
- CLS > 0.1 → critical
- Performance score < 50 → warning

Results surface in the Core Web Vitals audit category page.

---

### 4.8 Linear Integration

Connects to Linear via API key (GraphQL).

**Capabilities:**
- Create a Linear issue directly from any audit result
- Maps SEO severity to Linear priority:
  - `critical` → Urgent (P1)
  - `warning` → High (P2)
  - `info` → Medium (P3)
- Attaches issue description with URL list, fix recommendation, detection method
- Stores the Linear issue URL linked to the audit result
- View the linked ticket from within the audit result

One Linear connection per project, with configurable team and project ID.

---

### 4.9 Notifications (Slack & Email)

**Slack:**
- Incoming webhook integration
- Sends block-kit formatted crawl completion summaries
- Shows: site name, URLs crawled, critical/warning/info counts, dashboard link
- Can be triggered post-crawl manually or automatically via schedules

**Email (SMTP):**
- Sends HTML crawl completion reports via Nodemailer
- Styled with site brand colour
- Contains issue breakdown, link to dashboard
- Supports any SMTP provider (SendGrid, SES, Postmark, self-hosted)

---

### 4.10 Export & Reporting

**CSV Export**
- Download any audit section for the latest crawl as CSV
- Headers: url, severity, issue_type, plus all extracted data fields
- Available for all 8 audit sections

**Google Sheets Export**
- Push audit results directly to a designated Google Sheets tab per site
- Uses Google service account credentials (no OAuth prompt)
- Sections: response codes, meta tags, headings, images, canonicals, internal links, structured data

---

### 4.11 Scheduled Crawls

Cron-based scheduling using standard 5-field cron expressions.

- Assign one or multiple sites to a schedule
- Enable/disable optional Slack and Email notifications per schedule
- Schedules survive server restarts (loaded from DB on boot)
- Manual "run now" trigger available from the Scheduler UI
- Tracks `last_run` and `next_run` timestamps

---

### 4.12 Task & Kanban Board

Lightweight task management built into the platform.

- Create tasks linked to specific audit results
- Four statuses: **Backlog → In Progress → Review → Done**
- Assign tasks to platform users
- Optionally link to a Linear ticket
- Filter tasks by site and status

Designed for teams who want to manage SEO fixes without leaving the platform.

---

### 4.13 User Management & Auth

**Authentication:**
- Email + password (bcrypt hashed, 12 rounds)
- JWT issued as HttpOnly cookie (7-day expiry)
- First-run setup flow at `/setup` — creates the founder account
- Invite-based user creation (no self-registration after setup)

**Invite flow:**
- Founder sends invite by email
- 32-byte hex token, 48-hour expiration
- Invited user sets their own name and password on acceptance

**Role management:**
- Founders can change any user's role
- Founders cannot change their own role (guard against lockout)
- Users can be deactivated or deleted

---

### 4.14 Custom Extraction

Displays custom data fields extracted by Screaming Frog during a crawl. Screaming Frog supports up to 3 custom extraction rules (CSS selectors, XPath, or regex) that pull arbitrary on-page data into the crawl output. The platform surfaces these as **Extraction 1**, **Extraction 2**, and **Extraction 3** columns alongside the URL.

**Use cases:**
- Extract word counts from a specific content container
- Pull structured data fields not covered by standard audits
- Extract custom meta tags (e.g. `<meta name="author">`)
- Capture JavaScript-rendered text values

The extraction rules are configured in Screaming Frog's settings before the crawl runs. Results are imported and stored in the `custom-extraction` audit section.

---

### 4.15 Log File & Crawl Intelligence

Displays server log file data after it has been imported and parsed by Screaming Frog. The page shows per-URL data including:

- **Bot Crawls** — number of times Googlebot (or other bots) crawled the URL
- **User Sessions** — human visits to the URL from log data
- **Response Code** — HTTP status returned to the bot (colour-coded: green/amber/red)
- **Crawl Frequency** — how often the bot revisits the URL

**Use cases:**
- Identify pages being over-crawled (wasting crawl budget)
- Find important pages Googlebot is not crawling
- Detect crawl budget leakage (bots crawling faceted URLs, session IDs)
- Validate that recently fixed 404s are now receiving bot hits

Requires a server log file processed and exported through Screaming Frog's Log File Analyser before import.

---

### 4.16 Founder View (Cross-Site Executive Dashboard)

A dedicated executive dashboard accessible only to the `founder` role. Aggregates data across all registered sites into a single view.

**Sections:**

- **Site Health Cards** — each site displayed as a card with its health score ring (SVG, colour-coded), latest crawl status, and critical/warning/info counts
- **GSC Summary** — clicks, impressions, CTR, and average position per site with period-over-period delta indicators
- **Top Issues (Cross-Site)** — the most severe unresolved issues across the entire portfolio
- **Kanban Board** — unified task board showing all in-progress and backlog issues across every site, filterable by site
- **Crawl History** — recent crawl jobs across all sites with status indicators

This view is designed for agency leads, founders, and heads of SEO who oversee multiple properties simultaneously.

---

### 4.17 System Health Dashboard

A live integration status page that runs real-time tests on every connected service:

| Check | What it tests |
|-------|---------------|
| Database | Connectivity + crawl record count |
| Screaming Frog CLI | Binary present + version output |
| Google Search Console | Token validity + API connectivity |
| Google Analytics 4 | Connection status |
| Claude API | Anthropic API key validity |
| PageSpeed Insights | API key validity |
| Linear | API key validity + team access |
| Slack | Webhook URL reachability |
| SMTP | Configuration presence |

Each check returns `pass`, `warn`, `fail`, or `skip` with a detail message and timestamp.

---

## 5. Audit Coverage (477 Checks)

The platform ships with a registry of **477 predefined SEO checks** seeded into the database, covering:

| Category | Example Checks |
|----------|----------------|
| Response Codes | 4xx pages, 5xx pages, redirect chains, redirect loops |
| Meta Tags | Missing title, duplicate title, title too long/short, missing meta description |
| Headings | Missing H1, multiple H1s, empty headings, heading hierarchy violations |
| Images | Missing alt text, oversized images, broken image URLs |
| Canonical Tags | Missing canonical, self-referencing canonical, canonical to redirect |
| Internal Links | Broken internal links, nofollow on internal links, redirect targets |
| Structured Data | Invalid JSON-LD, missing required fields, schema type mismatches |
| Core Web Vitals | LCP > 2.5s, CLS > 0.1, FCP > 1.8s, low performance score |
| URL Structure | URLs with parameters, uppercase URLs, URLs with spaces |
| HTTPS / Security | Mixed content, HTTP pages, missing HSTS |
| robots.txt | Blocked CSS/JS, disallow all, missing sitemap reference |
| Sitemaps | XML sitemap missing, non-200 URLs in sitemap, sitemap too large |
| JavaScript Rendering | Content only visible with JS, render-blocking resources |
| Hreflang | Missing x-default, conflicting hreflang, wrong language codes |
| Content Quality | Thin content (< 300 words), duplicate content, low text-to-HTML ratio |

---

## 6. Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                 │
│         Port 5173 — proxies /api to backend             │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP + Socket.io
┌────────────────────────▼────────────────────────────────┐
│               Node.js / Express Backend                  │
│                     Port 3002                            │
│                                                          │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │  Auth + JWT  │  │ Crawl Engine │  │  AI (Claude)   │ │
│  └──────────────┘  └──────┬──────┘  └────────────────┘ │
│                            │ spawn()                     │
│                    ┌───────▼───────┐                     │
│                    │ Screaming Frog│                     │
│                    │    CLI        │                     │
│                    └───────────────┘                     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  SQLite Database                         │
│             (better-sqlite3, 25+ tables)                 │
└─────────────────────────────────────────────────────────┘

External Services:
  - Google Search Console API (OAuth2)
  - Google Analytics 4 API (OAuth2)
  - PageSpeed Insights API (API key)
  - Anthropic Claude API (API key)
  - Linear GraphQL API (API key)
  - Slack Incoming Webhooks
  - SMTP (email)
  - Google Sheets API (service account)
```

**Stack:**
- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Axios, Socket.io-client
- **Backend:** Node.js, Express, Socket.io, better-sqlite3, bcryptjs, jsonwebtoken, node-cron, Nodemailer
- **Database:** SQLite (file-based, zero infrastructure)
- **Crawler:** Screaming Frog SEO Spider CLI (requires licence for > 500 URLs)

---

## 7. Future Roadmap

### 7.1 CMS Integrations

**WordPress**
- Connect via WordPress REST API (application password auth)
- Push SEO fix recommendations as post meta (Yoast/RankMath compatible fields)
- Detect posts missing meta descriptions, duplicate titles, thin content
- Auto-apply safe fixes (e.g. set SEO title, canonical) with one-click approval
- Pull published URL list into platform for targeted crawl

**Webflow**
- Connect via Webflow CMS API
- Sync collection item SEO fields (title, meta description, og:image)
- Detect issues across CMS-generated pages
- Surface Webflow-specific issues (slugs with uppercase, missing alt on CMS images)

**Shopify**
- Connect via Shopify Admin API (OAuth app)
- Audit product pages, collections, blog posts, and policy pages
- Detect missing product schema, duplicate titles across variants
- Push canonical, meta description, and alt text fixes to Shopify metafields

**Contentful / Sanity / Strapi (Headless CMS)**
- Connect via Content Delivery API
- Map content model fields to SEO attributes
- Detect content entries missing SEO metadata
- Push recommended meta values back via Management API
- Works across any content type

**Priority:** WordPress first (largest market share), then Shopify, then headless CMSes.

---

### 7.2 Advanced AI Features

**Bulk AI Triage**
- Run Claude across all critical issues in a crawl automatically (background job)
- Pre-generate fix recommendations so they appear instantly (no streaming wait)
- Configurable: run on crawl completion or on-demand

**AI Fix Confidence Score**
- Claude rates its own confidence in the suggested fix (high / medium / low)
- Low-confidence suggestions are flagged for human review before ticket creation

**Content Brief Generation**
- For thin content issues, Claude drafts an expansion brief
- Includes target keyword, suggested headings, word count target, semantic topics to cover

**AI-Generated Audit Summary**
- After a crawl completes, Claude writes a plain-English executive summary
- Highlights the top 5 issues by impact, trend vs. previous crawl, and recommended priority order
- Auto-attached to Slack/email notifications

**Competitor Gap Analysis (AI-Assisted)**
- Input competitor URLs
- Claude compares their meta strategy, heading structure, and schema coverage vs. the audited site
- Surfaces specific opportunities

---

### 7.3 Expanded Analytics

**Bing Webmaster Tools**
- OAuth integration with Bing WMT API
- Surface Bing-specific crawl errors, index coverage, and keyword performance
- Side-by-side Google vs. Bing traffic comparison

**Google Looker Studio Connector**
- Publish a Looker Studio community connector
- Teams can build custom dashboards on top of platform data without CSV exports

**Search Trend Data (Google Trends API)**
- Overlay search volume trends on GSC keyword data
- Detect seasonal opportunity windows for content refreshes

**Rank Tracking**
- Track position history for target keywords per site
- Daily/weekly position checks via DataForSEO or SEMrush API
- Alert on significant position drops (> 5 positions)

---

### 7.4 Collaboration & Workflow

**Comments on Audit Issues**
- Team members can leave comments on individual audit results
- Threads support @mentions (sends in-app notification)
- Comment history preserved alongside the issue

**Approval Workflows**
- SEO manager proposes a fix
- Founder or designated approver reviews and approves before Linear ticket is created
- Configurable per issue severity (e.g. auto-approve warnings, require approval for criticals)

**Fix Verification**
- After a Linear ticket is marked Done, automatically re-crawl the affected URL
- Confirm the issue is resolved; update audit result to `ok`
- Reopen the ticket if the fix did not work

**Audit Templates**
- Save a reusable audit configuration (which sections to check, severity thresholds)
- Apply a template to new sites for consistent auditing across clients

---

### 7.5 Additional Integrations

**Jira**
- Create Jira issues from audit results (in addition to Linear)
- Map severity to Jira priority + story points
- Configurable project key and issue type per site

**GitHub Issues**
- Create GitHub issues for technical SEO bugs
- Useful for teams where developers manage the backlog in GitHub

**Notion**
- Push audit summaries and issue lists to a Notion database
- Auto-update properties (status, severity, affected URLs) as issues are resolved

**HubSpot / Salesforce**
- For agencies: link site audits to a client record in CRM
- Push audit health score as a CRM property
- Trigger CRM workflows on critical issue detection

**DataForSEO**
- SERP data for keyword position tracking
- Backlink profile data (referring domains, anchor text, toxic link detection)
- Search volume and keyword difficulty for content strategy

**Ahrefs / Moz API**
- Domain authority and backlink metrics
- Surface DR/DA score on the site dashboard

**Cloudflare Workers / CDN Cache Purge**
- After a fix is applied (e.g. canonical update), auto-purge the Cloudflare cache for affected URLs
- Ensures fixes are validated against live, uncached pages

---

### 7.6 Performance & Scale

**PostgreSQL Support**
- Add PostgreSQL as an alternative database driver
- Required for multi-user SaaS deployments and high-volume crawl data
- Migration tooling to move from SQLite to Postgres

**Multi-Tenant / Agency Mode**
- Workspace concept: multiple independent organisations on one installation
- Each workspace has its own sites, users, billing, and data isolation
- Workspace admin role above founder
- Subdomain routing per workspace

**Background Job Queue**
- Replace synchronous crawl spawning with a proper job queue (BullMQ / Redis)
- Support parallel crawls across multiple sites
- Retry logic for failed crawl jobs
- Job priority (manual trigger > scheduled)

**Distributed Crawling**
- Support multiple Screaming Frog instances across machines
- Load-balance large crawls across workers
- Critical for agencies managing 50+ sites

**Crawl Diff Webhook**
- POST a webhook payload on crawl completion
- Payload includes: site, health score delta, new critical issues
- Allows external systems (Zapier, n8n, custom scripts) to react to crawl results

---

### 7.7 Reporting & Dashboards

**White-Label PDF Reports**
- Generate branded PDF audit reports for client delivery
- Cover: audit health score, top issues, trend charts, fix recommendations
- Configurable logo, colour scheme, and introductory text per client

**Executive Dashboard**
- A single screen showing health score trends across all sites over time
- Configurable KPI targets (e.g. health score > 85, zero criticals)
- Traffic delta (GSC) + issue delta (audit) side by side

**Scheduled Report Delivery**
- Auto-email weekly or monthly PDF report to stakeholders
- No login required — report lands in their inbox

**Custom Report Builder**
- Drag-and-drop selection of which audit sections and metrics to include
- Save named report templates
- Export as CSV, Google Sheets, or PDF

**Issue Trend Tracking**
- Track how many issues of each type exist across consecutive crawls
- Plot trend lines per issue category
- Highlight issue categories that are consistently growing

---

## 8. Non-Goals

The following are explicitly out of scope for the current version:

- **Paid link building tools** — the platform surfaces backlink data but does not facilitate outreach
- **Content writing or generation** — AI is used for fix recommendations only, not content creation
- **Real-time monitoring** — crawls are scheduled/triggered, not continuous
- **Browser extension** — no plans for a browser-based auditing tool
- **Public SaaS hosting** — the platform is self-hosted; no managed cloud offering planned

---

## 9. Constraints & Dependencies

| Constraint | Detail |
|------------|--------|
| Screaming Frog licence | Crawls > 500 URLs require a paid Screaming Frog licence |
| Claude API key | AI recommendations require an Anthropic API key (pay-per-use) |
| Google OAuth app | GSC and GA4 integrations require a Google Cloud project with OAuth consent |
| Google service account | Sheets export requires a GCP service account with Sheets API enabled |
| macOS / Linux only | Screaming Frog CLI is not supported on Windows |
| Node.js 20+ | Backend requires Node.js 20 or later |
| SQLite limitations | Concurrent write-heavy workloads require migration to PostgreSQL |

---

## 10. Technical Specification

This section contains every implementation detail required to rebuild the platform from scratch.

---

### 10.1 Repository Structure

```
/
├── .env                          # Runtime environment variables (see §10.2)
├── .env.example                  # Template for .env
├── package.json                  # Root: concurrently runs frontend + backend
├── PRD.md                        # This document
├── README.md                     # Quick-start guide
│
├── backend/
│   ├── server.js                 # Express app entry point
│   ├── seo-automation.db         # SQLite database file (auto-created)
│   ├── config/
│   │   └── sf-paths.js           # Screaming Frog binary path resolver
│   ├── db/
│   │   ├── sqlite.js             # DB singleton (WAL mode, FK enabled)
│   │   └── migrations/
│   │       ├── 001_initial.js    # Core tables + v2 tables + indexes
│   │       ├── 002_v3_additions.js # Performance indexes + column additions
│   │       └── 003_gsc_extended.js # gsc_queries + gsc_daily tables
│   ├── middleware/
│   │   └── auth.js               # JWT middleware + requireRole() + PUBLIC_PATHS
│   ├── routes/
│   │   ├── ai.js                 # Claude streaming recommendations
│   │   ├── auth.js               # Login, register, invite, user management
│   │   ├── crawl.js              # Start/cancel/import/history crawl jobs
│   │   ├── export.js             # CSV download + Google Sheets push
│   │   ├── ga4.js                # GA4 OAuth + data fetch + cache
│   │   ├── gsc.js                # GSC OAuth + data fetch + cache
│   │   ├── linear.js             # Linear issue creation
│   │   ├── notify.js             # Slack + email notifications
│   │   ├── pagespeed.js          # PageSpeed Insights API
│   │   ├── reports.js            # Audit results query + summary + compare
│   │   ├── schedule.js           # Cron schedule CRUD
│   │   ├── settings.js           # Platform settings + system health
│   │   ├── sites.js              # Site CRUD
│   │   └── tasks.js              # Kanban task CRUD
│   ├── services/
│   │   ├── sf-cli.service.js     # Screaming Frog CLI spawn + Socket.io events
│   │   ├── sf-parser.service.js  # CSV → audit_results parser
│   │   ├── sf-config.service.js  # Generate SF .seospiderconfig XML
│   │   ├── scheduler.service.js  # node-cron job loader
│   │   └── slack.service.js      # Slack block-kit message sender
│   └── exports/                  # Runtime: SF CSV output per site (gitignored)
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js            # Vite + proxy config (proxies /api → backend)
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx              # React root, RouterProvider, AuthProvider
│       ├── router.jsx            # All routes (public + protected)
│       ├── App.jsx               # App shell: Sidebar + Header + <Outlet>
│       ├── api/
│       │   └── index.js          # Axios instance (baseURL: "/api")
│       ├── context/
│       │   ├── AuthContext.jsx   # useAuth() — user state + logout
│       │   └── SitesContext.jsx  # useSites() — site list + active site
│       ├── components/
│       │   ├── AuditPage.jsx     # Reusable audit category table component
│       │   ├── DataTable.jsx     # Generic sortable/paginated table
│       │   ├── Header.jsx        # Top bar (site selector + user menu)
│       │   ├── Sidebar.jsx       # Left navigation
│       │   ├── ProtectedRoute.jsx # Redirects to /login if unauthenticated
│       │   ├── IssueCard.jsx     # Issue row with AI recommendation trigger
│       │   ├── SiteSelector.jsx  # Dropdown to switch active site
│       │   └── charts/
│       │       ├── ResponseCodePie.jsx
│       │       └── TrendLine.jsx
│       └── pages/                # One file per route (see §4 for full list)
│
├── scripts/
│   └── setup.sh                  # Install deps + run migrations
├── crawl-configs/                # Saved SF .seospiderconfig XML files
└── docs/
    └── SF-CLI-LIMITATIONS.md
```

---

### 10.2 Environment Variables

All variables live in `.env` at the project root. The backend loads them with `require("dotenv").config({ path: "../.env" })`.

| Variable | Required | Type | Default | Description |
|---|---|---|---|---|
| `NODE_ENV` | No | string | `development` | `development` or `production` |
| `PORT` | No | number | `3001` | Backend HTTP port |
| `FRONTEND_URL` | Yes | string | — | Frontend origin for CORS + cookie policy (e.g. `http://localhost:5173`) |
| `JWT_SECRET` | Yes | string | fallback dev string | 64-char random string for JWT signing. **Must be set in production.** |
| `SF_BINARY_PATH` | Yes | string | — | Absolute path to Screaming Frog CLI binary or wrapper script |
| `SF_LICENSE_KEY` | No | string | — | Screaming Frog licence key (stored in SF prefs on first use) |
| `GOOGLE_CLIENT_ID` | For GSC/GA4 | string | — | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | For GSC/GA4 | string | — | Google OAuth2 client secret |
| `GOOGLE_REDIRECT_URI` | For GSC/GA4 | string | — | Must match Google Console. Format: `http://localhost:{PORT}/api/gsc/callback` |
| `GOOGLE_APPLICATION_CREDENTIALS` | For Sheets | string | `./google-service-account.json` | Path to GCP service account JSON |
| `ANTHROPIC_API_KEY` | For AI | string | — | Anthropic API key. Can also be stored in `settings` DB table. |
| `SLACK_WEBHOOK_URL` | No | string | — | Slack incoming webhook URL |
| `SMTP_HOST` | No | string | — | SMTP server hostname |
| `SMTP_PORT` | No | number | `587` | SMTP port |
| `SMTP_USER` | No | string | — | SMTP username |
| `SMTP_PASS` | No | string | — | SMTP password |
| `SMTP_FROM` | No | string | `noreply@yourplatform.com` | From address for emails |

**Settings also stored in the DB `settings` table** (editable via `/settings` UI, not `.env`):
`slack_webhook_url`, `psi_api_key`, `sheets_spreadsheet_id`, `anthropic_api_key`, `smtp_*`, `gsc_tokens`, `gsc_connected_email`

---

### 10.3 Database Schema (Full DDL)

SQLite, WAL journal mode, foreign keys enabled. Run migrations in order: 001 → 002 → 003.

```sql
-- ── Migration 001 ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sites (
  id              TEXT PRIMARY KEY,
  project_id      TEXT,
  label           TEXT,
  url             TEXT,
  gsc_property    TEXT,
  ga4_property_id TEXT,
  color           TEXT,
  sheets_tab_name TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
  id            TEXT PRIMARY KEY,
  site_id       TEXT,
  project_id    TEXT,
  started_at    DATETIME,
  completed_at  DATETIME,
  status        TEXT,           -- running | completed | failed | cancelled
  mode          TEXT,           -- spider | list | sitemap | import | compare
  total_urls    INTEGER,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS audit_results (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  crawl_job_id TEXT,
  site_id      TEXT,
  section      TEXT,            -- response-codes | meta-tags | headings | images |
                                -- canonicals | internal-links | structured-data |
                                -- custom-extraction | log-file-analysis
  url          TEXT,
  data         JSON,            -- arbitrary key-value pairs extracted from SF CSV
  severity     TEXT,            -- critical | warning | info | ok
  issue_type   TEXT             -- snake_case identifier e.g. missing_title
);

CREATE TABLE IF NOT EXISTS gsc_cache (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id     TEXT,
  url         TEXT,
  clicks      INTEGER,
  impressions INTEGER,
  ctr         REAL,
  position    REAL,
  top_query   TEXT,
  period      TEXT DEFAULT 'current',  -- current | previous
  fetched_at  DATETIME
);

CREATE TABLE IF NOT EXISTS schedules (
  id              TEXT PRIMARY KEY,
  site_ids        JSON,          -- ["site-id-1", "site-id-2"]
  cron_expression TEXT,          -- standard 5-field cron
  notify_slack    INTEGER,       -- 0 | 1
  notify_email    INTEGER,       -- 0 | 1
  enabled         INTEGER,       -- 0 | 1
  last_run        DATETIME,
  next_run        DATETIME
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS workspaces (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,           -- UUID v4
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,              -- bcrypt, 12 rounds
  name           TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'seo', -- founder | seo | readonly
  avatar_url     TEXT,
  status         TEXT DEFAULT 'active',
  last_active_at TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invites (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'readonly',
  token      TEXT NOT NULL UNIQUE,           -- 32-byte hex, 48h expiry
  invited_by TEXT,
  expires_at TEXT NOT NULL,
  accepted   INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  description  TEXT,
  created_by   TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gsc_connections (
  id                TEXT PRIMARY KEY,
  project_id        TEXT,
  site_id           TEXT,
  access_token_enc  TEXT,          -- AES-256 encrypted
  refresh_token_enc TEXT,          -- AES-256 encrypted
  token_expiry      TIMESTAMP,
  property_url      TEXT,
  status            TEXT DEFAULT 'connected',
  connected_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ga4_connections (
  id                TEXT PRIMARY KEY,
  project_id        TEXT,
  site_id           TEXT,
  access_token_enc  TEXT,          -- AES-256 encrypted
  refresh_token_enc TEXT,          -- AES-256 encrypted
  token_expiry      TIMESTAMP,
  ga4_property_id   TEXT,
  status            TEXT DEFAULT 'connected',
  connected_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ga4_cache (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id              TEXT NOT NULL,
  url                  TEXT NOT NULL,
  sessions             INTEGER DEFAULT 0,
  engaged_sessions     INTEGER DEFAULT 0,
  engagement_rate      REAL DEFAULT 0,
  bounce_rate          REAL DEFAULT 0,
  avg_session_duration REAL DEFAULT 0,
  total_revenue        REAL DEFAULT 0,
  conversions          INTEGER DEFAULT 0,
  fetched_at           TEXT DEFAULT (datetime('now')),
  UNIQUE(site_id, url)
);

CREATE TABLE IF NOT EXISTS linear_connections (
  id                TEXT PRIMARY KEY,
  project_id        TEXT,
  api_key_enc       TEXT,          -- AES-256 encrypted
  team_id           TEXT,
  linear_project_id TEXT,
  default_assignee  TEXT,
  connected_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS linear_tickets (
  id              TEXT PRIMARY KEY,
  audit_result_id TEXT,
  linear_issue_id TEXT NOT NULL,
  linear_url      TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by      TEXT
);

CREATE TABLE IF NOT EXISTS audit_checks (
  id               INTEGER PRIMARY KEY,
  check_number     INTEGER NOT NULL,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL,
  detection_method TEXT,
  tool_source      TEXT,
  severity_default TEXT DEFAULT 'warning',
  is_automated     INTEGER DEFAULT 0,     -- 0 | 1
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id            TEXT PRIMARY KEY,
  check_id      INTEGER,
  job_id        TEXT,
  site_id       TEXT,
  type          TEXT DEFAULT 'issue',
  section       TEXT,
  response_text TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_suggestion_feedback (
  id            TEXT PRIMARY KEY,
  suggestion_id TEXT NOT NULL,
  user_id       TEXT,
  rating        INTEGER NOT NULL,   -- 1 (thumbs up) or -1 (thumbs down)
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT,
  user_id      TEXT,
  type         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  link         TEXT,
  is_read      INTEGER DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_settings (
  project_id TEXT NOT NULL,
  key        TEXT NOT NULL,
  value_enc  TEXT,
  is_secret  INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, key)
);

CREATE TABLE IF NOT EXISTS crawl_configs (
  id         TEXT PRIMARY KEY,
  project_id TEXT,
  site_id    TEXT,
  name       TEXT NOT NULL,
  config     TEXT NOT NULL,         -- JSON: sfConfig object (see §10.7)
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_status (
  id               TEXT PRIMARY KEY,
  audit_result_id  TEXT,
  site_id          TEXT,
  status           TEXT DEFAULT 'backlog',  -- backlog | in_progress | review | done
  assignee_id      TEXT,
  linear_ticket_id TEXT,
  linear_url       TEXT,
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now'))
);

-- ── Migration 002 (additional indexes) ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_results_job      ON audit_results(crawl_job_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_section  ON audit_results(section);
CREATE INDEX IF NOT EXISTS idx_audit_results_severity ON audit_results(severity);
CREATE INDEX IF NOT EXISTS idx_audit_results_site     ON audit_results(site_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_site_job ON audit_results(site_id, crawl_job_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_url      ON audit_results(url);
CREATE INDEX IF NOT EXISTS idx_gsc_cache_site         ON gsc_cache(site_id);
CREATE INDEX IF NOT EXISTS idx_gsc_cache_site_url     ON gsc_cache(site_id, url);
CREATE INDEX IF NOT EXISTS idx_ga4_cache_site         ON ga4_cache(site_id);
CREATE INDEX IF NOT EXISTS idx_ga4_cache_site_url     ON ga4_cache(site_id, url);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_sessions_user          ON sessions(user_id);

-- ── Migration 003 (GSC extended) ──────────────────────────────────────────────

-- Add period column to gsc_cache
ALTER TABLE gsc_cache ADD COLUMN period TEXT DEFAULT 'current';

CREATE TABLE IF NOT EXISTS gsc_queries (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id          TEXT NOT NULL,
  query            TEXT NOT NULL,
  clicks           INTEGER DEFAULT 0,
  impressions      INTEGER DEFAULT 0,
  ctr              REAL DEFAULT 0,
  position         REAL DEFAULT 0,
  prev_clicks      INTEGER DEFAULT 0,
  prev_impressions INTEGER DEFAULT 0,
  fetched_at       DATETIME DEFAULT (datetime('now')),
  UNIQUE(site_id, query)
);

CREATE TABLE IF NOT EXISTS gsc_daily (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id     TEXT NOT NULL,
  date        TEXT NOT NULL,         -- YYYY-MM-DD
  clicks      INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr         REAL DEFAULT 0,
  position    REAL DEFAULT 0,
  fetched_at  DATETIME DEFAULT (datetime('now')),
  UNIQUE(site_id, date)
);

CREATE INDEX IF NOT EXISTS idx_gsc_queries_site    ON gsc_queries(site_id, clicks DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_daily_site_date ON gsc_daily(site_id, date);
```

---

### 10.4 Authentication System

**JWT format:**
```json
{ "sub": "<uuid>", "email": "user@example.com", "name": "Alice", "role": "founder" }
```
- Signed with `JWT_SECRET` using HS256
- Expiry: 7 days
- Delivered as `Set-Cookie: auth_token=<token>; HttpOnly; SameSite=Strict; MaxAge=604800`
- In production (`NODE_ENV=production`): `Secure` flag added

**Auth middleware — `PUBLIC_PATHS` (no JWT required):**

| Method | Path |
|--------|------|
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| GET | `/api/auth/me` |
| POST | `/api/auth/register` |
| POST | `/api/auth/invite/accept` |
| POST | `/api/auth/password/reset-request` |
| POST | `/api/auth/password/reset` |
| GET | `/api/gsc/auth` |
| GET | `/api/gsc/callback` |
| GET | `/api/ga4/callback` |
| GET | `/health` |

**Role enforcement:** `requireRole("founder")` middleware — returns `403` if `req.user.role` not in allowed list.

**Frontend auth state:**
- On app load, `AuthContext` calls `GET /api/auth/me`
- Returns `{ user: null }` if unauthenticated (no 401 thrown — allows graceful redirect)
- `ProtectedRoute` wraps all app routes; redirects to `/login` if `user === null`
- On first visit, `GET /api/auth/setup-status` checks if `users` table is empty → redirects to `/setup` if so

---

### 10.5 Complete API Reference

#### Auth (`/api/auth`)

**POST `/api/auth/login`**
```json
// Request
{ "email": "admin@seo.local", "password": "admin123" }

// Response 200
{ "user": { "sub": "uuid", "email": "...", "name": "...", "role": "founder" } }

// Response 401
{ "error": "Invalid email or password" }
```

**POST `/api/auth/register`** *(first-run only — fails if any user exists)*
```json
// Request
{ "email": "admin@seo.local", "password": "admin123", "name": "Admin" }

// Response 201 — sets auth cookie
{ "user": { "sub": "uuid", "email": "...", "name": "Admin", "role": "founder" } }

// Response 403
{ "error": "Setup already complete. Use invite flow." }
```

**GET `/api/auth/setup-status`**
```json
// Response
{ "needsSetup": true }
```

**POST `/api/auth/invite`** *(founder only)*
```json
// Request
{ "email": "team@example.com", "role": "seo" }

// Response 200
{ "ok": true, "inviteUrl": "http://localhost:5173/invite/<token>", "expiresAt": "ISO8601" }
```

**POST `/api/auth/invite/accept`**
```json
// Request
{ "token": "<32-byte-hex>", "name": "Alice", "password": "securepass" }

// Response 200
{ "ok": true, "message": "Account created. You can now log in." }
```

**GET `/api/auth/users`** *(founder only)*
```json
// Response
{
  "users": [{ "id": "uuid", "email": "...", "name": "...", "role": "founder", "status": "active", "last_active_at": "...", "created_at": "..." }],
  "pending": [{ "id": "uuid", "email": "...", "role": "seo", "expires_at": "...", "accepted": 0, "created_at": "..." }]
}
```

---

#### Sites (`/api/sites`)

**GET `/api/sites`** → `[{ id, label, url, gsc_property, ga4_property_id, color, sheets_tab_name, created_at }]`

**POST `/api/sites`**
```json
// Request
{ "id": "my-site", "label": "My Site", "url": "https://example.com", "color": "#6366f1" }
```

**PUT `/api/sites/:id`** — same shape as POST, all fields optional

**DELETE `/api/sites/:id`** → `{ "ok": true }`

---

#### Crawl (`/api/crawl`)

**POST `/api/crawl/start`**
```json
// Request (registered site)
{
  "siteIds": ["my-site"],
  "mode": "spider",
  "sfConfig": {
    "maxCrawlDepth": -1,
    "maxThreads": 5,
    "renderType": "None",
    "userAgent": "ScreamingFrogSEOSpider",
    "obeyRobots": true
  }
}

// Request (free-form URL, no site registration needed)
{
  "targetUrl": "https://example.com",
  "crawlName": "Example Audit",
  "mode": "spider"
}

// Request (list mode)
{
  "siteIds": ["my-site"],
  "mode": "list",
  "urlList": ["https://example.com/page1", "https://example.com/page2"]
}

// Response
{ "jobs": [{ "jobId": "uuid", "siteId": "my-site", "status": "running" }] }
```

**GET `/api/crawl/status/:jobId`**
```json
{
  "id": "uuid",
  "site_id": "my-site",
  "status": "completed",
  "mode": "spider",
  "total_urls": 1432,
  "started_at": "2026-04-06T09:00:00",
  "completed_at": "2026-04-06T09:08:23",
  "error_message": null
}
```

**POST `/api/crawl/import`** — `multipart/form-data`
- Field: `siteId` (text)
- Field: `csvFiles` (up to 20 files, Screaming Frog CSV exports)
- Response: `{ "jobId": "uuid", "parsed": 4821 }`

---

#### Reports (`/api/reports`)

**GET `/api/reports/:siteId/summary`**
```json
{
  "jobId": "uuid",
  "totalUrls": 1432,
  "healthScore": 74,
  "sections": {
    "meta-tags": { "critical": 12, "warning": 45, "info": 203, "ok": 1172 },
    "response-codes": { "critical": 3, "warning": 8, "info": 0, "ok": 1421 }
  }
}
```

**GET `/api/reports/:siteId/:section`** — query params: `severity`, `issue_type`, `search`, `page`, `limit`
```json
{
  "results": [
    { "id": 1, "url": "https://example.com/page", "severity": "critical", "issue_type": "missing_title", "data": { "title": "" } }
  ],
  "total": 12,
  "page": 1,
  "limit": 50
}
```

**GET `/api/reports/job/:jobId`** — query params: `severity`, `section`, `issue_type`, `search`, `page`, `limit`

**GET `/api/reports/compare-crawls/:siteId`** — query params: `jobA`, `jobB`
```json
{
  "newIssues": [...],
  "fixed": [...],
  "regressed": [...],
  "unchanged": [...]
}
```

**GET `/api/reports/top-issues`** — query param: `limit` (default 10)
```json
[{ "issue_type": "missing_title", "severity": "critical", "count": 45, "site_id": "my-site" }]
```

---

#### AI (`/api/ai`)

**POST `/api/ai/suggest`** — returns Server-Sent Events stream
```json
// Request
{
  "checkId": 42,
  "jobId": "uuid",
  "siteId": "my-site",
  "issueData": {
    "name": "Missing Title Tag",
    "category": "Meta Tags",
    "severity": "critical",
    "siteUrl": "https://example.com",
    "urls": ["https://example.com/page1", "https://example.com/page2"],
    "totalUrls": 12,
    "detectionMethod": "Screaming Frog"
  }
}

// SSE stream events:
data: {"text": "Root cause: "}
data: {"text": "The title tag is missing..."}
data: {"done": true, "id": "suggestion-uuid"}

// If cached (returns JSON, not SSE):
{ "suggestion": "...", "cached": true, "id": "suggestion-uuid" }
```

**POST `/api/ai/suggest/:id/feedback`**
```json
// Request
{ "rating": 1 }   // 1 = thumbs up, -1 = thumbs down
```

---

#### Schedules (`/api/schedules`)

**POST `/api/schedules`**
```json
// Request
{
  "site_ids": ["my-site", "other-site"],
  "cron_expression": "0 3 * * 1",
  "notify_slack": true,
  "notify_email": false,
  "enabled": true
}
```

---

#### Settings (`/api/settings`)

**GET `/api/settings/status`** — system health check
```json
{
  "checks": [
    { "name": "Database", "status": "pass", "detail": "1432 crawl records", "ts": "ISO8601" },
    { "name": "Screaming Frog CLI", "status": "pass", "detail": "Version 23.3", "ts": "..." },
    { "name": "Google Search Console", "status": "pass", "detail": "Connected as user@gmail.com", "ts": "..." },
    { "name": "Claude API", "status": "fail", "detail": "API key not configured", "ts": "..." }
  ]
}
```

---

### 10.6 Socket.io Event Contract

The frontend connects to the backend WebSocket on the same origin. Events are namespaced by `jobId`.

| Event emitted by server | Payload | Description |
|---|---|---|
| `crawl:log:<jobId>` | `{ type: "info"|"stdout"|"stderr"|"error", message: string }` | Raw log line from SF process |
| `crawl:progress:<jobId>` | `{ progress: number }` | 0–99 integer (percentage) |
| `crawl:complete:<jobId>` | `{ status: "completed"|"failed"|"cancelled", code: number }` | Crawl finished |

**Frontend subscription pattern:**
```js
socket.on(`crawl:log:${jobId}`, ({ type, message }) => { ... });
socket.on(`crawl:progress:${jobId}`, ({ progress }) => { ... });
socket.on(`crawl:complete:${jobId}`, ({ status }) => { ... });
```

Progress parsing: SF stdout is scanned for patterns `N of M` or `N/M` to derive the percentage.

---

### 10.7 Screaming Frog CLI Integration

**Binary location** (macOS):
```
~/.local/bin/ScreamingFrogSEOSpider
```
This wrapper script calls: `exec "$SF_JRE" -jar "$SF_JAR" "$@"` with the bundled JRE.

**CLI arguments used:**

| Flag | Value | Purpose |
|------|-------|---------|
| `--headless` | — | Run without GUI |
| `--save-crawl` | — | Save crawl data to disk |
| `--overwrite` | — | Overwrite existing output |
| `--export-tabs` | comma-separated list | Which CSV tabs to export |
| `--output-folder` | absolute path | Where to write CSVs |
| `--crawl` | URL | Spider mode: start URL |
| `--crawl-sitemap` | URL | Sitemap mode |
| `--crawl-list` | file path | List mode: path to .txt file of URLs (one per line) |

**JVM flag:** `JAVA_TOOL_OPTIONS=-Xmx2g` (2 GB heap)

**Export tabs used:**

| SF Tab Export Name | Parsed Section | Parser Function |
|---|---|---|
| `internal_all.csv` | `internal-links` | `parseInternalLinks` |
| `response_codes_all.csv` | `response-codes` | `parseResponseCodes` |
| `page_titles_all.csv` | `meta-tags` | `parsePageTitles` |
| `meta_description_all.csv` | `meta-tags` | `parseMetaDescriptions` |
| `h1_all.csv` | `headings` | `parseH1` |
| `h2_all.csv` | `headings` | `parseH2` |
| `images_all.csv` | `images` | `parseImages` |
| `canonicals_all.csv` | `canonicals` | `parseCanonicalsExport` |
| `structured_data_all.csv` | `structured-data` | `parseStructuredData` |

**SF Config object schema** (passed as `sfConfig` in crawl start request):
```json
{
  "checkImages": true,
  "checkCSS": true,
  "checkJavaScript": true,
  "checkExternals": false,
  "crawlAllSubdomains": false,
  "obeyRobots": true,
  "obeyMetaRobots": true,
  "obeyCanonicalTags": false,
  "maxCrawlDepth": -1,
  "maxCrawlUrls": 0,
  "maxThreads": 5,
  "crawlDelay": 0,
  "requestTimeout": 30000,
  "renderType": "None",
  "userAgent": "ScreamingFrogSEOSpider",
  "userAgentPreset": "screamingfrog",
  "respectRobots": true,
  "authEnabled": false,
  "authUsername": "",
  "authPassword": "",
  "includePatterns": [],
  "excludePatterns": [],
  "extractions": [],
  "customHeaders": [],
  "includeSitemap": false,
  "sitemapUrls": []
}
```

---

### 10.8 Claude AI Prompt Template

**System message:**
```
You are a senior technical SEO engineer. Give precise, actionable advice.
```

**User message template:**
```
You are a senior technical SEO engineer with 10+ years of experience.
Give precise, actionable fix recommendations. Be specific about code, config, or CMS changes required. No generic advice. No filler.

Issue: {issueData.name}
Category: {issueData.category}
Severity: {issueData.severity}
Site URL: {issueData.siteUrl}
Affected URLs (sample):
  - {url1}
  - {url2}
  ... (up to 5 URLs)
Total affected URLs: {issueData.totalUrls}
Detection method: {issueData.detectionMethod}

Provide your response in this exact structure:
1. Root cause (2-3 sentences max)
2. Step-by-step fix (numbered, specific — include code/config where applicable)
3. Verification method (how to confirm the fix worked)
4. Priority: fix this week / fix this sprint / fix this quarter
```

**Model:** `claude-sonnet-4-6`  
**Max tokens:** `1024`  
**Streaming:** Server-Sent Events via `text/event-stream`  
**Caching key:** `(check_id, job_id)` — cached in `ai_suggestions` table indefinitely

---

### 10.9 Frontend Architecture

**Entry point:** `frontend/src/main.jsx`
```jsx
<RouterProvider router={router} />
// router wraps everything in <AuthProvider>
```

**State management:** React Context only (no Redux/Zustand)
- `AuthContext` — `{ user, isLoading, setUser, logout }`
- `SitesContext` — `{ sites, activeSite, setActiveSite, reload }`

**HTTP client:** Axios with `baseURL: "/api"` — proxied by Vite to backend during dev.

**Vite proxy configuration:**
```js
proxy: {
  "/api":    { target: "http://localhost:<PORT>", changeOrigin: true },
  "/health": { target: "http://localhost:<PORT>", changeOrigin: true }
}
```

**Route protection:** All app routes wrapped in `<ProtectedRoute>`:
```jsx
// ProtectedRoute.jsx
if (isLoading) return <Spinner />;
if (!user) return <Navigate to="/login" />;
return children;
```

**Reusable audit page pattern:**
All 27+ audit category pages use the shared `<AuditPage>` component:
```jsx
<AuditPage
  title="Title Tags"
  section="meta-tags"
  columns={[
    { key: "url", label: "URL", render: v => <a href={v}>{v}</a> },
    { key: "title", label: "Title", render: v => <span>{v}</span> },
    { key: "length", label: "Length", render: v => <span>{v}</span> }
  ]}
/>
```
`AuditPage` handles: active site detection, fetching from `/api/reports/:siteId/:section`, severity filter, search, pagination, and the AI recommendation panel.

---

### 10.10 Design System

**CSS variables (defined globally):**
```css
--bg-base:        #0f1117   /* Page background */
--bg-surface:     #1a1d27   /* Card/panel background */
--bg-raised:      #222635   /* Elevated elements */
--border:         #2d3148   /* Default border */
--text-primary:   #e2e8f0   /* Primary text */
--text-muted:     #64748b   /* Secondary/muted text */
--brand:          #6366f1   /* Primary accent (indigo) — overridable per site */

--critical:       #ef4444
--critical-bg:    #fef2f2
--critical-text:  #991b1b

--warning:        #f59e0b
--warning-bg:     #fffbeb
--warning-text:   #92400e

--pass:           #10b981
--info:           #3b82f6
```

**Font stack:**
- UI text: System stack (Tailwind default)
- Code/monospace: `JetBrains Mono, monospace` (used for URLs, response codes, terminal logs)

**Severity pill colours:** Applied inline via CSS variables above.

**Health score ring:** SVG circle with `stroke-dasharray` animation. Colour thresholds:
- Score ≥ 80 → `--pass` (green)
- Score ≥ 50 → `--warning` (amber)
- Score < 50 → `--critical` (red)

---

### 10.11 Package Dependencies

**Backend (`backend/package.json`):**
```json
{
  "@anthropic-ai/sdk": "latest",
  "axios": "^1.x",
  "bcryptjs": "^2.x",
  "better-sqlite3": "^9.x",
  "cookie-parser": "^1.x",
  "cors": "^2.x",
  "csv-parse": "^5.x",
  "dotenv": "^16.x",
  "express": "^4.x",
  "jsonwebtoken": "^9.x",
  "multer": "^1.x",
  "node-cron": "^3.x",
  "nodemailer": "^6.x",
  "socket.io": "^4.x",
  "uuid": "^9.x"
}
```

**Frontend (`frontend/package.json`):**
```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "react-router-dom": "^6.x",
  "axios": "^1.x",
  "recharts": "^2.x",
  "socket.io-client": "^4.x",
  "tailwindcss": "^3.x",
  "@vitejs/plugin-react": "^4.x",
  "vite": "^5.x"
}
```

**Root `package.json`** (runs both together):
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && nodemon server.js",
    "dev:frontend": "cd frontend && vite"
  },
  "devDependencies": {
    "concurrently": "^8.x"
  }
}
```

---

### 10.12 Audit Health Score Formula

```
healthScore = 100 - Math.round(
  ((critical × 3) + (warning × 2) + (info × 1)) / totalUrls × 10
)
```
- Minimum score: 0 (clamped)
- If `totalUrls === 0`: score is `null` (shown as "—")
- Score is computed server-side in `GET /api/reports/:siteId/summary`

---

### 10.13 Crawl Comparison Algorithm

`GET /api/reports/compare-crawls/:siteId?jobA=<uuid>&jobB=<uuid>`

Comparison logic (jobA = old, jobB = new):
1. Load all `audit_results` for jobA and jobB grouped by `(url, issue_type)`
2. **New issues:** present in jobB, absent in jobA
3. **Fixed:** present in jobA, absent in jobB
4. **Regressed:** present in both, but severity increased (critical > warning > info)
5. **Unchanged:** present in both with same or lower severity

Severity ranking for regression detection: `critical=3, warning=2, info=1, ok=0`

---

### 10.14 Google OAuth Scopes

**GSC scopes:**
- `https://www.googleapis.com/auth/webmasters.readonly`

**GA4 scopes:**
- `https://www.googleapis.com/auth/analytics.readonly`

Both use `access_type: "offline"` to obtain a refresh token. Tokens are stored encrypted in `gsc_connections` / `ga4_connections` tables. Global GSC tokens are also stored as JSON in the `settings` table under key `gsc_tokens`.

---

### 10.15 Linear GraphQL Integration

**Endpoint:** `https://api.linear.app/graphql`

**Create issue mutation:**
```graphql
mutation CreateIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue { id url }
  }
}
```

**Input shape:**
```json
{
  "teamId": "<team-uuid>",
  "projectId": "<project-uuid>",
  "title": "[critical] Missing Title Tag — 12 URLs affected",
  "description": "**Issue:** Missing Title Tag\n**Severity:** critical\n**Affected URLs:**\n- https://...\n\n**AI Recommendation:**\n<cached suggestion text>",
  "priority": 1
}
```

**Priority mapping:**
| SEO Severity | Linear Priority |
|---|---|
| `critical` | 1 (Urgent) |
| `warning` | 2 (High) |
| `info` | 3 (Medium) |

**Auth:** `Authorization: Bearer <api_key>` header
