# North 0.4 — Nova Intelligence Hub

Status: local release candidate. Do not deploy until explicitly approved.

## What is included

- Real server-side Nova conversation through the OpenAI Responses API.
- Durable conversation history shared by every device on the same North account.
- Strict account isolation derived from the authenticated access token.
- A Direction & Goals ledger with active, paused and completed states.
- A reviewable “What Nova knows” memory ledger with confirm, reject, pause and erase controls.
- Account-scoped context from workouts, weekly plans, check-ins, activities, profile, program, reviews and personal workouts.
- Evidence and confidence shown with Nova responses.
- Structured, allow-listed proposals for goals, memory, check-ins, Journey reflections and workout planning.
- Retrieval from all 784 canonical exercises so generated workouts use real North IDs and incompatible invented movements are rejected.
- Explicit approval before meaningful changes.
- Applied-action receipts and server audit events.
- Idempotent goal, memory, check-in and reflection application for safe retries.
- Safety language for urgent symptoms and a clear boundary against diagnosis.
- Offline fallback: existing local guidance remains usable, but live AI and server actions wait for connectivity.

## Local server setup

Apply every migration in `db/migrations` in filename order, including:

- `0011_exercise_library_v2.sql`
- `0012_nova_intelligence_hub.sql`

Set these only in the server process:

```powershell
$env:DATABASE_URL='postgresql://north_app:password@127.0.0.1:5432/north'
$env:JWT_SECRET='replace-with-a-long-random-secret'
$env:OPENAI_API_KEY='your-provider-key'
$env:NOVA_MODEL='gpt-5.2' # optional override
npm.cmd run server
```

Run the web application separately:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

The OpenAI key must never be stored in Vite, localStorage, the browser bundle or a North sync document.

## Release gate

```powershell
npm.cmd run validate:exercises
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:browser
npm.cmd run test:visual
```

Before upload, also verify with a real local PostgreSQL/API instance:

1. Two different North accounts cannot see each other’s goals, memories, conversations or proposals.
2. The same account sees the same Nova conversation on desktop and mobile.
3. A rejected proposal changes nothing.
4. A confirmed check-in, reflection or goal appears after a second-device sync.
5. Retrying an interrupted proposal does not create a duplicate.
6. Nova never claims a change occurred before the receipt is stored.
7. Provider failure leaves the member’s message and North records safe.

## Known release note

The production bundle passes. Vite reports the existing main bundle as larger than 500 kB; this is a performance warning rather than a build failure. Code splitting remains a worthwhile post-0.4 optimization.
