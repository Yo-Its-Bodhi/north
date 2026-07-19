# North Product Makeover Contract

## Status

Active. This document governs the whole-product visual overhaul.

It supplements `NORTH_1_0_VISUAL_SYSTEM.md`. Where the two documents differ, this contract wins until the overhaul is complete.

## Product Standard

North is an athletic field journal: calm, specific, personal, and capable.

It must feel like a trusted training product with a clear point of view, not a generic wellness app, glassmorphism concept, crypto dashboard, admin panel, or enlarged phone prototype. Every screen must make the next useful decision obvious within one scan.

Premium is earned through hierarchy, restraint, consistency, useful feedback, and performance. It is not achieved by adding more cards, gradients, decorative labels, shadows, or rounded containers.

## Non-Negotiable Rules

### Visual Language

1. Use one visual grammar across member screens: warm solid surface, deep ink, restrained North blue or teal for action, and semantic status colors only for meaning.
2. Do not use gradients as content backgrounds. A subtle page-canvas gradient is permitted only when content remains on a solid, readable surface.
3. Use exactly three surface levels:
   - Canvas: page background, never a content card.
   - Base: unframed content and divider-led groups.
   - Raised workspace: a contained editing tool, modal, or explicitly independent interactive area.
4. Use one border family. Borders explain grouping; they must not outline every element by default.
5. Use `8px` corners for controls, `12px` for raised workspaces, and `16px` for modals or exceptional hero surfaces. No pills unless the content is a small status, filter, or count.
6. Shadows are exceptional. A workspace may have one quiet shadow; ordinary content must not float.
7. Icons are functional, from Lucide, normally 16-20px, and never decorative filler. Icon containers must communicate a distinct type or status.
8. Never use emoji as a product icon.

### Typography And Copy

1. Use Manrope for headings and DM Sans for interface/body copy. Barlow Condensed is reserved for athletic numeric emphasis and short performance labels, never paragraphs.
2. Every screen has one primary heading. Supporting headings must be visibly subordinate.
3. Body copy is normally at least `14px`; supporting metadata is normally at least `12px`. Labels below `11px` require a clear operational need.
4. Use uppercase labels sparingly. A label must orient the user, not compensate for weak layout.
5. Do not stack an eyebrow, a heading, a subheading, a statistic, and a callout when one concise heading and one supporting sentence do the job.
6. Copy must be specific to the member's current reality. Prefer evidence-led statements over generic motivational language.

### Action Hierarchy

1. Every decision area has one primary action. It is filled and visually dominant.
2. A secondary action is bordered or solid-surface, never visually equal to the primary action.
3. Quiet actions are text or icon-plus-text with no enclosing card.
4. Destructive actions are visually distinct but never visually dominant until confirmation.
5. Do not show advanced editing, setup, or management controls until the member asks to manage that thing.
6. A mobile destination must not present more than two immediate high-emphasis actions above its first major scroll boundary.

### Layout And Responsiveness

1. Mobile is thumb-first. Persistent navigation is permitted only at mobile and compact tablet widths.
2. Desktop is a workspace, not a larger mobile shell. At desktop widths, remove the floating mobile frame and fixed bottom navigation.
3. Desktop uses a stable navigation rail or top navigation, a main working column, and an optional context rail when evidence supports the active task.
4. Never center a narrow mobile column inside a large desktop canvas when a task needs comparison, planning, editing, or history review.
5. The content grid, not arbitrary margins, must determine desktop alignment. Use responsive constraints for charts, nav, toolbars, calendar strips, and action areas.
6. Every target screen must work at 320, 375, 430, 768, 1024, and 1440px with no horizontal overflow, overlap, or clipped commands.

### Information Architecture

1. Today answers: what matters now, what one action is next, and how the week is moving.
2. Training answers: what is planned, what is selected, and how to start. Building, importing, libraries, programs, and detailed editing are secondary workspaces.
3. Journey answers: what happened, what it means, and what has changed. It is a personal record, not a dashboard of report sections.
4. Nova begins with a current evidence-based decision or question. It must prove usefulness before explaining itself.
5. You presents identity, direction, body/record progress, and learned traits. Account administration belongs elsewhere.
6. Account contains privacy, devices, syncing, services, installation, and preferences. It is operational, not a member story.
7. Admin is an efficient operational console. Density is appropriate there; member-facing visual treatments must not leak into it.

## Explicit Prohibitions

- No generic rounded segmented controls when destination navigation needs a stronger information architecture.
- No card inside a card unless the inner object is an independently usable tool or a modal.
- No repeated decorative gradients, glow effects, or soft shadows used to manufacture hierarchy.
- No text-only navigation state that relies on a faint divider or subtle color difference.
- No large empty hero treatment without real narrative media, a meaningful action, or current member evidence.
- No form fields shown by default on an identity/progress screen unless they are the immediate task.
- No desktop bottom navigation.
- No change accepted because it compiles. Every visual change requires a rendered review at the relevant viewport.

## Canonical Primitives

All new work must reuse or migrate toward these primitives. Do not invent a screen-specific substitute without a documented reason.

| Primitive | Purpose | Required behavior |
| --- | --- | --- |
| Screen header | Orient a destination | One title, optional concise evidence, no decorative stack. |
| Direction hero | The next meaningful action | One primary command and one compact supporting fact. |
| Record band | Compact evidence | Divider-led, no decorative card by default. |
| Timeline row | A dated event | Date, outcome, one relevant measure, one optional action. |
| Recognition row | Milestone progress | Title, real measure, thin progress or earned state. |
| Evidence row | A comparison or trend | One question answered with source or limit visible. |
| Workspace panel | Editing or configuration | Solid raised surface, explicit save/cancel state, no nested cards. |
| Context rail | Desktop support | Read-only supporting evidence; it must not compete with the main task. |
| Identity header | Member profile context | Identity, direction, concise record summary, one edit path. |

## Screen Acceptance Criteria

### Today: Flagship

- The first viewport makes today's one useful action unmistakable.
- Show a compact rhythm of the week and one meaningful evidence/record route.
- Completed state changes the action to a relevant next action; it never asks to resume or repeat the completed workout.
- Remove supporting modules that do not affect a decision today.

### Training: Operational Focus

- The selected day and primary Start/Prepare action dominate.
- The weekly rhythm is visible without requiring a control-heavy edit surface.
- Detailed plan editing, session creation, workout library, programs, import, and quick logging are progressively disclosed.
- On desktop, selected workout is the main workspace; program/recent/load context can live in a clear rail.

### Journey: Personal Record

- Timeline is the default story and prioritizes meaningful events over incidental data.
- Milestones group earned, close, and later recognition rather than rendering an undifferentiated list.
- Insights is an evidence desk with a small number of questions, not a vertical report.
- View navigation is intentional, discoverable, and works at 320px without cramped text or ambiguous state.

### Nova: Trusted Coach

- Empty state gives one current, useful prompt grounded in known evidence.
- Starter prompts are contextual and limited; they must not look like a generic chatbot template.
- Conversation, evidence, proposed action, approval, and resulting state are visually distinct.
- The composer is always reachable, editable while Nova responds, and never hidden by navigation.

### You And Account

- You is a member story, not a settings surface. Measurement entry is collapsed behind an explicit action.
- Account owns devices, privacy, sync, installation, services, preferences, and data management.
- Memory settings are expressed as consent and evidence, not product feature marketing.

### Onboarding

- First run has one focused choice per step and shows genuine product/athlete context where media is used.
- It must not feel like a long questionnaire with different field styles.
- Recovery code handling remains prominent, copyable, and clearly separated from normal setup choices.

### Admin

- Treat as a serious control console with dense, scannable hierarchy and restrained decoration.
- Preserve auditability, clear destructive-action states, and information density.
- Do not reuse member-app hero language or decorative wellness treatments.

## Migration Protocol

1. Do not add another broad CSS override layer. Identify and replace the controlling style for a migrated component.
2. Start with Today and establish reusable tokens and primitives from that work.
3. Migrate Training around its primary workflow, then Journey around story and evidence.
4. Split You from Account responsibilities before polishing either.
5. Migrate Nova, onboarding, and admin using the established primitives rather than bespoke visual systems.
6. Make desktop layouts after the mobile workflow is coherent, but before declaring any screen complete.
7. Remove obsolete style rules as each component is migrated. Do not leave competing legacy definitions in the cascade.

## Visual Release Gates

A screen is not complete until all gates pass:

- One dominant task/action is identifiable without reading every module.
- All visible controls meet touch, contrast, focus, and label requirements.
- No unrelated card, radius, border, or button treatment appears in the screen.
- Mobile 320/375/430 and desktop 1024/1440 screenshots have been inspected.
- No horizontal overflow, clipped text, navigation collision, or blocked touch target exists.
- Empty, loading, disabled, error, success, offline, and completed states have an intentional hierarchy where applicable.
- A focused executable check passes, followed by a screenshot review for visual work.

## Definition Of Done

The makeover is complete only when every member and operational destination follows this contract, obsolete conflicting CSS is removed, desktop has its own usable navigation/workspace model, and visual regression coverage includes Today, Training, Journey, Nova, You, onboarding, Account, and Admin at representative mobile and desktop viewports.