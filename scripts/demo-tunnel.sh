#!/usr/bin/env bash
# Serve Torii from this machine on a public HTTPS link via Cloudflare Tunnel.
#
#   npm run demo:tunnel            build, start, reset demo data, open tunnel
#   SKIP_BUILD=1 npm run demo:tunnel   reuse the last build
#   RESET=0 npm run demo:tunnel        keep current demo data
#
# Requires cloudflared (brew install cloudflared). The link stays up while this
# script runs and this computer is awake. Press Ctrl+C to stop both.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3100}"
command -v cloudflared >/dev/null || { echo "cloudflared isn't installed. Run: brew install cloudflared" >&2; exit 1; }

# Fresh secrets for this run unless you set your own.
export SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -hex 32)}"
export SIMULATOR_WEBHOOK_SECRET="${SIMULATOR_WEBHOOK_SECRET:-$(openssl rand -hex 32)}"

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  npm run build
fi

PORT="$PORT" npm start &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null || true' EXIT INT TERM

echo "Waiting for Torii on port $PORT…"
until curl -s -o /dev/null "http://localhost:$PORT/campaigns"; do sleep 1; done

if [ "${RESET:-1}" = "1" ]; then
  curl -s -X POST "http://localhost:$PORT/api/demo/reset" -H 'content-type: application/json' -d '{"confirm":"reset"}' >/dev/null
  echo "Demo data reset to the seeded starting point."
fi

echo "Opening Cloudflare Tunnel — look for the https://…trycloudflare.com link below."
cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate
