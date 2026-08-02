# North backups

North creates an encrypted PostgreSQL custom-format dump every night at 03:10 UTC. Each dump is decrypted to a temporary file and checked with `pg_restore --list` before it is accepted.

## Retention

The local and offsite sets use overlapping grandfather-father-son retention:

- newest backup from each of 14 days
- newest backup from each of 8 weeks
- newest backup from each of 6 months

One file can satisfy more than one tier, so 28 files is the hard maximum. Cleanup runs only after a new encrypted backup passes its integrity check.

## Restore testing

`verify-north-restore.sh` restores the newest backup into an isolated temporary database and validates its migrations. Cron runs this on the first day of every month at 04:10 UTC.

## Offsite activation

Backblaze B2 is the recommended destination, but any rclone remote works.

1. Install rclone and run `rclone config` directly on the VPS. Never send provider credentials through chat or commit them to the repository.
2. Copy `deploy/north-backup-offsite.conf.example` to `/etc/north-backup-offsite.conf` and set its destination to a dedicated bucket or prefix.
3. Set ownership to `root:root` and mode to `600`.
4. Run `/opt/north/deploy/sync-north-backups.sh` and confirm `rclone check` succeeds.

The encryption key at `/root/.north-backup-key` must be stored separately in the operator password manager. Losing both the VPS and this key makes offsite backups intentionally unreadable.