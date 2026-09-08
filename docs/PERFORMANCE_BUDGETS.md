# North Performance Budgets

Status: automated production-build regression gate

Baseline reviewed: 2026-08-05

These budgets prevent silent growth while North completes real-device profiling and load testing. They are ceilings, not claims that the current build is fully optimized.

## Enforced budgets

| Measure | Ceiling | Baseline reason |
|---|---:|---|
| Member entry JavaScript, raw | 850,000 bytes | Current route-split entry is about 813 KB |
| Member entry JavaScript, gzip | 245,000 bytes | Current route-split entry is about 231 KB |
| Main stylesheet, raw | 625,000 bytes | Current stylesheet is about 606 KB |
| Main stylesheet, gzip | 110,000 bytes | Current stylesheet is about 102 KB |
| All JavaScript, raw | 900,000 bytes | Includes lazy owner and development chunks |
| All JavaScript, gzip | 260,000 bytes | Prevents hidden growth outside the entry chunk |
| All fonts, raw | 340,000 bytes | Covers the shipped North font weights and formats |
| Largest image | 2,000,000 bytes | Keeps runtime artwork below 2 MB per file |
| Android companion APK | 13,000,000 bytes | The current access flow links directly to the APK |
| Complete deployable distribution | 62,000,000 bytes | Includes PWA files, runtime artwork, and the APK |

Run `npm run test:performance` after a production build. `npm run build` also prepares the distribution and enforces these budgets automatically.

## Build preparation

Vite copies everything under `public` by default. North's build preparation removes only verified non-runtime material from `dist`, while preserving the source library:

- duplicate top-level PNG artwork when the UI references the compressed JPG equivalent;
- brand boards, previews, social/email/footer exports, obsolete web snippets, and source tools;
- high-resolution transparent brand source exports.

The Samsung/Health Connect APK remains in the distribution because the current member access flow uses it as the Android intent fallback. Workout-card images also remain because the product resolves them dynamically by filename.

## Known debt

- The member entry chunk still exceeds Vite's 500 KB raw warning threshold. The warning remains enabled.
- `App.tsx` and the shared stylesheet are large and need measured route/component/CSS splitting rather than arbitrary fragmentation.
- Workout-card and exercise media dominate the non-APK distribution and should be converted to an efficient reviewed format without reducing instructional clarity.
- Raw/gzip size does not measure parsing, rendering, interaction latency, memory, API latency, sync duration, or behavior on a constrained phone/network.

## Required before public launch

- Profile startup and critical interactions on a representative mid-range phone with a throttled connection.
- Record Web Vitals or equivalent user-centered measurements for onboarding, Today, Training, workout recording, Journey, Nova, and You.
- Establish API latency and concurrency targets from the intended launch audience and run load tests against staging.
- Measure long-history rendering, account restoration, sync, health import, and interrupted-workout recovery.
- Tighten these ceilings after optimization; do not raise a ceiling merely to make a regression pass.