# SEO Audit Platform

Open-source technical SEO audit platform. Crawl any website, detect 477 SEO issues, get AI fix recommendations via Claude, and track issues in Linear.

## Default Login

| Field    | Value             |
|----------|-------------------|
| Email    | `admin@seo.local` |
| Password | `admin123`        |

## Prerequisites

- Node.js 20+
- Screaming Frog SEO Spider 23.3 (licence required for unlimited crawls)
- SQLite (included via better-sqlite3)

## Quick Start

1. Clone: `git clone https://github.com/prishabanerje-ops/seo-audit-platform`
2. Copy env: `cp .env.example .env`
3. Fill in `.env` (see Environment Variables below)
4. Run setup: `bash scripts/setup.sh`
5. Start: `npm run dev`
6. Open: `http://localhost:5173`
7. First login: a "Create Admin" page will appear at `/setup`

## Screaming Frog Setup

- Install SF from https://www.screamingfrog.co.uk/seo-spider/
- On macOS: the wrapper at `~/.local/bin/ScreamingFrogSEOSpider` invokes the bundled JRE + JAR
- Set `SF_BINARY_PATH` in your `.env` to point at your wrapper or binary
- SF settings like crawl depth, user agent, and JS rendering require a pre-saved binary config — see `docs/SF-CLI-LIMITATIONS.md`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development` or `production` |
| `PORT` | No | Backend port (default: 3001) |
| `FRONTEND_URL` | Yes | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `JWT_SECRET` | Yes | 64-char random string for JWT signing |
| `SF_BINARY_PATH` | Yes | Path to Screaming Frog CLI binary |
| `SF_LICENSE_KEY` | No | SF licence key (stored in SF prefs automatically) |
| `GOOGLE_CLIENT_ID` | For GSC/GA4 | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | For GSC/GA4 | Google OAuth2 client secret |
| `GOOGLE_REDIRECT_URI` | For GSC/GA4 | Must match Google Console setting |
| `SLACK_WEBHOOK_URL` | No | Incoming webhook for Slack alerts |
| `SMTP_HOST` | No | SMTP server for email reports |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `SMTP_FROM` | No | From address for emails |

> Anthropic API key, PSI API key, Linear API key, and Google Sheets config are stored per-project in the database (Settings page), not in `.env`.

## First Run

1. Create admin account at `/setup`
2. Add your first site at `/sites`
3. Connect GSC at `/settings`
4. Run your first crawl at `/crawl`
5. View unified analysis at `/analysis`

## Claude AI Setup

1. Get API key from https://console.anthropic.com
2. Add to Settings → API Keys in the dashboard
3. AI section remarks and chat will appear on all report pages

## User Roles

| Role | Description |
|---|---|
| `founder` | Full access: manage sites, users, settings, view all data |
| `seo` | SEO Manager: run crawls, view/export data, create Linear tickets |
| `readonly` | View and export only |

## Contributing

PRs welcome. Please open an issue before starting large changes.
