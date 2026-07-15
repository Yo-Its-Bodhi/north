# North hosted-product roadmap

## Product promise

North helps a person decide what to do today, record what really happened, and use that evidence to guide what happens next.

## Entry experience

1. A calm public welcome explains North in one screen.
2. New members choose a unique username and strong password; returning members sign in.
3. North creates a high-entropy recovery code and shows it once. The member must save and confirm it before continuing.
4. A short, resumable walkthrough gathers only information needed to create the first useful week: name, direction, experience, schedule, time, equipment, activities, units, accessibility, coaching tone, and memory permission.
5. North previews the generated week and explains why it fits. Nothing is scheduled until the member confirms it.
6. The member arrives on Today with a real plan and clear next action.

## Account and recovery rules

- Usernames are case-insensitively unique and become the sign-in identity.
- Passwords are hashed with bcrypt and never logged or returned.
- Recovery codes contain at least 128 bits of randomness, are shown once, and are stored only as SHA-256 hashes.
- Successful recovery rotates the recovery code and revokes every existing refresh token.
- Access tokens are short lived; refresh tokens rotate on use.
- Every server query is scoped by the authenticated owner ID.
- Account deletion is explicit, confirmed, and cascades through server-owned records.
- No email address or activation flow is required in the first hosted release.

## Delivery order

1. Authentication, recovery, ownership, abuse controls, and account API.
2. Welcome, sign-in, recovery handoff, and resumable onboarding shell.
3. First-week generation and confirmation using existing programs and workouts.
4. Account, sync, restore, conflicts, devices, export, and deletion UX.
5. VPS packaging, HTTPS proxy, migrations, backups, monitoring, and deployment runbook.
6. Accessibility, mobile/gym-floor testing, security review, and limited launch.

## Definition of usable

A new person can create an account, save a recovery code, finish onboarding, receive and edit a first week, complete a workout, sign out, sign in on another device, restore their records, recover a forgotten password without email, and delete the account. All critical paths work on a narrow mobile screen and with keyboard navigation.

## Production deployment

- Host: `https://north.bodhix.io`
- Web: static Vite build served by Nginx
- API: Fastify on `127.0.0.1:3020`, managed by PM2 as `north-api`
- Data: local PostgreSQL database `north` with isolated role `north_app`
- TLS: Let's Encrypt certificate with scheduled Certbot renewal
- Files: `/opt/north`; private runtime secrets are root-readable only in `/opt/north/.env`
- Proxy: `/v1/*` and `/health` route to the API; all other paths use the SPA fallback
- Verified: HTTPS, security headers, registration, login, document sync/pull, recovery-code rotation, and deletion
