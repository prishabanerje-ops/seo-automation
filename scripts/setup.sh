#!/bin/bash
set -e

echo "SEO Audit Platform - Setup"
echo "=========================="

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is required. Install from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js 18+ required. Current version: $(node -v)"
  exit 1
fi

echo "Node.js $(node -v) - OK"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install --quiet

# Create required directories
mkdir -p backend/exports
echo "Created backend/exports/"

# Copy .env if not exists
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "Created .env from .env.example - EDIT THIS FILE before starting"
  fi
else
  echo ".env already exists - skipping"
fi

# Run database migrations
echo ""
echo "Running database migrations..."
node -e "require('./backend/db/migrations/001_initial').migrate()"
node -e "require('./backend/db/migrations/002_v3_additions').migrate()"
echo "Migrations complete"

# Seed audit checks
if [ -f "scripts/seed-audit-checks.js" ] && [ -f "data/audit-checks.csv" ]; then
  echo ""
  echo "Seeding audit checks registry..."
  node scripts/seed-audit-checks.js
fi

# Verify SF CLI
SF_PATH="${SF_BINARY_PATH:-$HOME/.local/bin/ScreamingFrogSEOSpider}"
if [ -f "$SF_PATH" ]; then
  echo "Screaming Frog CLI found at $SF_PATH"
else
  echo ""
  echo "WARNING: Screaming Frog CLI not found at $SF_PATH"
  echo "  Install from: https://www.screamingfrog.co.uk/seo-spider/"
  echo "  Then set SF_BINARY_PATH in your .env file"
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your credentials"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:5173"
echo "  4. Create your admin account at /setup"
