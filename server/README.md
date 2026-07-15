# North API

The API provides owner-scoped accounts and local-first document synchronization.

1. Create a PostgreSQL database.
2. Run `db/migrations/0001_initial.sql`, then `0002_auth_and_document_sync.sql`.
3. Copy `.env.example` values into your environment.
4. Run `npm run server`.

Access tokens expire after 15 minutes. Refresh tokens rotate on every refresh and are stored only as SHA-256 hashes. Sync writes require an `Idempotency-Key`; stale document versions return a 409 conflict instead of silently overwriting another device.
