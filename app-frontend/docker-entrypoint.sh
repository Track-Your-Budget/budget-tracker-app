#!/bin/sh
set -eu

# Rewrite the runtime env file with values from the container environment
# so the SPA can read them via window._env_ without a rebuild.
cat > /usr/share/nginx/html/env-config.js <<EOF
window._env_ = {
  GOOGLE_LINK: "${VITE_GOOGLE_LINK:-}",
  GITHUB_LINK: "${VITE_GITHUB_LINK:-}",
  MICROSOFT_LINK: "${VITE_MICROSOFT_LINK:-}"
};
EOF
