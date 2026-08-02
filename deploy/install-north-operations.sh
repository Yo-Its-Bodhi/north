#!/usr/bin/env bash
set -Eeuo pipefail

cat > /etc/cron.d/north-operations <<'CRON'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
10 3 * * * root /opt/north/deploy/backup-north.sh >> /var/log/north-backup.log 2>&1
10 4 1 * * root /opt/north/deploy/verify-north-restore.sh >> /var/log/north-restore-test.log 2>&1
40 3 * * * root /opt/north/deploy/maintain-north.sh >> /var/log/north-maintenance.log 2>&1
CRON
chmod 644 /etc/cron.d/north-operations