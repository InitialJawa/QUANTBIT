#!/bin/bash
# apply-prod-migration.sh
# Apply pending DB migrations to production Cloudflare D1.
# Usage: CLOUDFLARE_API_TOKEN=xxx ./apply-prod-migration.sh
#        or: ./apply-prod-migration.sh (will prompt to login)

set -e

cd "$(dirname "$0")/.."

echo "🔍 Checking Cloudflare auth..."
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo ""
  echo "❌ CLOUDFLARE_API_TOKEN not set."
  echo ""
  echo "Pilih salah satu:"
  echo "  1. Set token: export CLOUDFLARE_API_TOKEN=xxx && ./apply-prod-migration.sh"
  echo "     (Get token: https://dash.cloudflare.com/profile/api-tokens, scope: D1 Edit)"
  echo ""
  echo "  2. Login: npx wrangler login && ./apply-prod-migration.sh"
  echo ""
  exit 1
fi

echo "✅ Token found. Checking current state..."
echo ""

npm run db:status 2>&1 | tail -15

echo ""
echo "📋 Applying pending migrations to PRODUCTION D1..."
read -p "Continue? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
npm run db:migrate

echo ""
echo "✅ Done. Final state:"
echo ""
npm run db:status
