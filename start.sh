#!/usr/bin/env bash
set -euo pipefail

# Simple start script for Railpack/hosts that expect a single entrypoint.
# It installs backend dependencies and starts the backend server.

echo "=== Beibora start.sh ==="

if [ -f backend/package.json ]; then
  echo "Found backend/package.json — installing and starting backend"
  cd backend
  # Install production deps only (faster). For debugging remove --production.
  npm install --production

  # Ensure a start script exists in backend/package.json
  if npm run | sed -n '1,200p' | grep -q "start"; then
    npm run start
  else
    # fallback to node server.js
    node server.js
  fi
else
  echo "No backend/package.json found. Nothing to start."
fi
