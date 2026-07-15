#!/usr/bin/env bash
set -euo pipefail

site=/etc/nginx/sites-available/north.bodhix.io
backup="${site}.bak-20260714"
cp "$site" "$backup"

if ! grep -q 'Strict-Transport-Security' "$site"; then
  sed -i '/add_header X-Content-Type-Options/a\    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;' "$site"
fi
sed -i '/add_header Cache-Control "public, immutable";/d' "$site"
sed -i 's/add_header Cache-Control "no-cache";/expires -1;/' "$site"

nginx -t
systemctl reload nginx
