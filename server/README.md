# North API

The API provides owner-scoped accounts and local-first document synchronization.

1. Create a PostgreSQL database.
2. Run every SQL file in `db/migrations` in filename order. Migrations are additive and `0012_nova_intelligence_hub.sql` adds the private Nova store.
3. Set `DATABASE_URL` and a strong `JWT_SECRET` in the server environment.
4. To enable live Nova locally, set `OPENAI_API_KEY`. `NOVA_MODEL` and `NOVA_AI_BASE_URL` are optional overrides; the API key must never be placed in Vite or browser environment variables. To show per-account estimated provider cost, also set `NOVA_INPUT_COST_MICROS_PER_TOKEN`, `NOVA_CACHED_INPUT_COST_MICROS_PER_TOKEN`, and `NOVA_OUTPUT_COST_MICROS_PER_TOKEN` from the active provider/model pricing. These values remain server-only; leave them unset to track replies and tokens without a dollar estimate.
5. Run `npm run server` and `npm run dev` in separate terminals.

PowerShell example for the current terminal:

```powershell
$env:DATABASE_URL='postgresql://north_app:password@127.0.0.1:5432/north'
$env:JWT_SECRET='replace-with-a-long-random-secret'
$env:OPENAI_API_KEY='your-local-provider-key'
npm.cmd run server
```

Nova remains account-scoped when the provider is unavailable. Goals, approved memory, messages, proposals and action receipts are stored server-side; the model is never given a caller-supplied user ID.

Access tokens expire after 15 minutes. Refresh tokens rotate on every refresh and are stored only as SHA-256 hashes. Sync writes require an `Idempotency-Key`; stale document versions return a 409 conflict instead of silently overwriting another device.
