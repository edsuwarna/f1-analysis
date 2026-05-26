#!/bin/bash
# Cloudflare Pages build script for F1 Analysis
# Replaces the API URL placeholder with the production API URL
# Set API_URL env var in CF Pages dashboard → Settings → Environment variables

set -e

echo "🔧 F1 Analysis — CF Pages Build"
echo "================================"

API_URL="${API_URL:-}"

if [ -z "$API_URL" ]; then
  echo "⚠️  API_URL not set — using relative paths (local dev mode)"
  echo "   Set API_URL in CF Pages → Settings → Environment variables"
else
  echo "📍 Setting API endpoint to: $API_URL"
  sed -i "s|const API = ''|const API = '${API_URL}'|g" frontend/index.html
  echo "✅ API URL updated!"
fi

echo "✅ Build complete — output at frontend/"
