# AS-BUILT — Confirmed Working Features

Last updated: April 2026

## What Works (Do Not Redo)

| Feature | Endpoint / File | Notes |
|---|---|---|
| SF Spider/List/Sitemap crawl | POST /api/crawl/start | Screaming Frog 23.3 headless |
| Crawl cancel | DELETE /api/crawl/cancel/:jobId | Sets status=cancelled, SIGTERM to SF |
| Crawl history | GET /api/crawl/history | All jobs across sites |
| Socket.IO live logs | crawl:log, crawl:progress events | Real-time during crawl |
| SF CSV parsing (9 types) | sf-parser.service.js | internal, response_codes, page_titles, meta_desc, h1, h2, images, canonicals, structured_data |
| GSC OAuth + fetch + display | /api/gsc/* + /gsc route | Clicks, impressions, position, CTR |
| Per-issue AI suggestion (SSE) | POST /api/ai/suggest | Streaming, cached per check+job |
| AI feedback | POST /api/ai/suggest/:id/feedback | Thumbs up/down |
| Scheduler | /api/schedules/* | node-cron, Slack/email on complete |
| Slack notifications | /api/notify/slack/* | Webhook |
| Email notifications | /api/notify/email/* | SMTP |
| CSV export | GET /api/export/csv/:siteId/:section | Download per section |
| Health summary | GET /api/reports/:siteId/summary | 0-100 score + section breakdown |
| Compare crawls | GET /api/reports/compare-crawls/:siteId | New/fixed/regressed/unchanged |
| PageSpeed PSI | POST /api/pagespeed/run | Lab + field data |
| Sites CRUD | /api/sites/* | Fully DB-driven, no hardcoded sites |
| Linear backend | /api/linear/* | Connect + create ticket (no UI button) |
| Sheets backend | POST /api/export/sheets/:siteId | Works (no UI button) |
| GA4 backend | /api/ga4/* | OAuth + fetch (UI is stub) |
| Auth middleware | backend/middleware/auth.js | JWT + requireRole helper |
| Auth routes | /api/auth/* | login, logout, me, register |

## Known Gaps

| Gap | Status |
|---|---|
| Auth middleware not applied to routes | To be fixed in v3 |
| /api/checks endpoint missing | To be added in v3 |
| GA4 Overlay UI is a stub | To be wired in v3 |
| Linear ticket UI button missing | To be added in v3 |
| Sheets export UI button missing | To be added in v3 |
| FounderView Kanban is mock data | To be wired in v3 |
| AuditHealth shows static counts | To be wired in v3 |

## SF CLI Confirmed Limitations

See docs/SF-CLI-LIMITATIONS.md for full details.
Settings that appear in CrawlRunner UI but are NOT applied:
- Max crawl depth, crawl delay, user agent, JS rendering, max URLs

These controls are kept in the UI with warning tooltips.
