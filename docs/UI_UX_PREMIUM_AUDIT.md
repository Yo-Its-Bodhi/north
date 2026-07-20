# North premium UI/UX audit

## Standard

North should feel calm, decisive, personal, and exceptionally easy to use with one hand. Premium does not mean more decoration. It means excellent typography, obvious hierarchy, fast actions, trustworthy feedback, coherent motion, and no dead ends.

## P0 — trust and basic usability

- [x] Self-host the intended DM Sans and Manrope families; remove every production font fallback failure.
- [x] Establish a readable type scale: 16px body, 14px supporting copy, 12px metadata minimum, with exceptional 11px labels only.
- [x] Pin global navigation to the viewport with safe-area support and consistent content clearance.
- [x] Make every visible Nova entry point perform a useful action or clearly label it unavailable; never present a dead conversational control.
- [ ] Add loading, success, error, disabled, retry, and offline states to every account and data action.
- [x] Correct mojibake and encoding artifacts throughout visible source copy; automated source scan returns no known markers.

## P0 — onboarding

- [x] Let the member toggle exact training/rest days on the first-week preview.
- [x] Enforce the selected training-day count, explain the remaining selection, and prevent an invalid confirmation.
- [x] Preserve exact chosen days when applying the generated week.
- [x] Add Back/Edit controls on the final review rather than forcing completion or restart.
- [x] Improve desktop composition so onboarding is a designed desktop experience, not an oversized phone screenshot.
- [ ] Keep recovery-code handling visually prominent, printable, copyable, and never stored as plain text.

## P0 — information architecture

- [x] Training opens with “This week / Your rhythm,” because planning and choosing today are the primary jobs.
- [ ] Follow with the selected-day workout card and primary Start/Prepare action.
- [ ] Move Nova guidance into contextual support beneath the actionable plan.
- [ ] Group Quick log, Programs, My workouts, Library, Import, Recent, and Analytics by user intent.
- [x] Put local weather in the Today header’s top-right position; keep its permission and refresh state compact.
- [ ] Give every detail screen a consistent back destination, title, primary action, and overflow menu.

## P1 — workouts and programs

- [x] Favorite/unfavorite both North plans and custom workouts.
- [x] Make My Workouts a real collection containing favorites and personal templates.
- [x] Add a quick “Start,” “Schedule,” and “Preview” action pattern to workout cards.
- [x] Replace single program equipment with an accessible checkbox dropdown/multi-select.
- [ ] Match programs against combinations of available equipment and clearly explain unavailable exercises.
- [ ] Preserve equipment preferences in the profile and reuse them in onboarding, programs, and substitutions.
- [ ] Add recent, pinned, and frequently used workouts for faster gym-floor access.

## P1 — visual system

- [x] Create semantic design tokens for spacing, radius, elevation, surface, text, action, focus, success, warning, danger, and desktop-rail states.
- [~] Reduce the number of unrelated card styles and gradients; the three semantic surface levels now exist, but legacy screen-specific cards still need migration.
- [~] Standardize primary, secondary, quiet, destructive, icon, segmented, and chip buttons; primary/secondary/icon foundations exist, while destructive, segmented, and chip variants remain screen-specific.
- [ ] Make all touch targets at least 44×44px with visible keyboard focus.
- [~] Strengthen contrast and reduce excessive pale-on-pale presentation; desktop rail contrast is now token-enforced and core surfaces have distinct roles, but each destination needs visual review and migration.
- [ ] Use icons consistently: one family, consistent stroke, size, container, and semantic color.
- [x] Define responsive mobile, tablet, and desktop layouts instead of only widening the phone shell.

### Visual-system execution plan

1. [x] Establish semantic roles and repair the desktop navigation rail’s dark-on-dark text regression.
2. [x] Define the three-surface contract: canvas for page backgrounds, raised for actionable/grouped content, and subtle for supporting or nested information.
3. [ ] Migrate Today and Training to the surface contract; remove legacy gradient cards except intentional training-direction and achievement moments.
4. [ ] Migrate Journey, Nova, You, Account, Settings, workout flows, library, and onboarding using the same contract.
5. [ ] Replace remaining bespoke buttons, pills, borders, shadows, and radii with the semantic primitives; preserve only meaningful status and achievement color.
6. [ ] Raise gym-floor metadata and control labels to the 12px minimum except compact, nonessential labels.
7. [ ] Add desktop and mobile visual checks for the rail, surface separation, focus, contrast, and all destination states.

## P1 — Nova

- [x] Persist conversations per account and render thinking/retry states; streaming remains future server-model work.
- [x] Give Nova real tools for plan explanation, workout adjustment, check-ins, reflection, active-program scheduling, and progression routing; conversational substitution remains part of universal recommendation work.
- [x] Show the exact records used, confidence/limitations, and the proposed edit before confirmation.
- [x] Add persistent, stale-safe undo after every Nova or progression-applied change.
- [x] Add confirmation, correction, stale-plan protection, and undo to Nova-applied Today plan changes.
- [x] Provide useful starter prompts and context-aware empty states.
- [x] Enforce initial health-safety boundaries and urgent-symptom escalation language.

## P2 — polish and proof

- [x] Add automated Chrome coverage for all five destinations, onboarding, core workout/library/Nova paths, visible button names, keyboard focus, and horizontal overflow at every target width.
- [ ] Audit every screen at 320, 375, 430, 768, 1024, and 1440px.
- [ ] Test complete keyboard and screen-reader paths.
- [ ] Test one-handed logging, poor reception, refresh mid-workout, offline completion, and session recovery.
- [ ] Add restrained transitions, skeletons, haptics where available, and reduced-motion equivalents.
- [ ] Add visual regression screenshots for onboarding and five primary destinations.
- [ ] Run moderated first-use tests: account creation, first-week setup, find a workout, edit a day, and start a session.

## Build order

1. Typography, base scale, fixed navigation, safe areas, encoding, and global button/focus tokens.
2. Editable onboarding week and responsive onboarding composition.
3. Training hierarchy, Today weather placement, and destination navigation cleanup.
4. Favorites/My Workouts and multi-equipment program setup.
5. Account/sync states and complete Nova behavior.
6. Responsive/accessibility/field validation and final visual refinement.
