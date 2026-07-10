# Sprint 2 — Product Design

## Status

This document captures the product and UX decisions locked during Sprint 2. It is the current design source of truth for North's core mobile experience.

North is not a loud fitness dashboard. It is a calm, intelligent daily companion that helps people understand themselves, make better decisions, and keep moving forward.

## Core Navigation

The bottom navigation remains fixed across the app:

1. **Today** — the user's day and immediate direction
2. **Journey** — memory, milestones, and understanding over time
3. **Training** — the body and the work
4. **Nova** — the mind and conversation
5. **Profile** — identity, preferences, controls, and account settings

Navigation labels and order must not change between screens.

## Design North Star

North should feel:

- Soft, purposeful, and intelligent
- Approachable to both wellness-focused users and serious trainees
- Premium without becoming decorative
- Calm enough for a morning coffee, fast enough for a gym floor
- Human rather than clinical, spiritual, crypto-like, or gamified

### Design laws

- Stop trying to make it beautiful. Make it feel inevitable.
- North should reduce noise, not create it.
- North should never shout.
- The interface should put the user at ease.
- Every new element must earn its place.
- Light mode is the flagship expression of North.
- Dark mode is the same home after sunset, not a neon redesign.

## Visual System

### North Blue

North Blue is the signature accent across the product.

Use it for:

- Active navigation states
- Primary actions
- Focus and selection states
- Nova interaction accents
- Key guidance and directional moments

Other colours may support activity categories, weather, milestones, and contextual status, but they must not fragment the brand.

### Materials

North's surfaces should feel like:

- Morning glass
- Soft paper
- Blue-hour glass in dark mode
- Subtle translucency and depth

Avoid card-on-card stacking wherever possible. Prefer smooth sections, restrained separators, and connected glass surfaces.

### Typography

Use one consistent modern sans-serif system across Today, Training, Journey, Milestones, Insights, Nova, and Profile.

Do not introduce serif or editorial display typography on individual pages. Personality should come from language and hierarchy, not from changing font families.

### Icons

Icons should be soft, minimal, consistent in stroke weight, and eventually custom to North.

The **compass** is the Nova/North signature mark. Do not replace it with sparkles, diamonds, stars, owls, or unrelated AI symbols.

## Dynamic Appearance

Appearance options:

- **Morning** — always light
- **Night** — always dark
- **North** — changes naturally through the day

North mode may gradually move through morning, afternoon, evening, and blue hour. Changes should be subtle enough to feel rather than announce themselves.

## Screen 1 — Today

### Purpose

Today is the calm front door to North.

It answers:

- What does today look like?
- What direction should I take?
- What matters right now?

### Locked structure

- Adaptive greeting
- Weather context
- Nova guidance surface
- Today's Direction
- Start Today activity choices
- Today's Session
- Journey snapshot
- This Day / meaningful memory surface where relevant
- Fixed bottom navigation

### Rules

- Today must never become busier as the product grows.
- Extra features should live elsewhere.
- Greetings may evolve naturally with the user's language over time.
- Weather may have subtle motion in North mode.

## Screen 2 — Training

### Purpose

Training is where North becomes more focused and performance-oriented. It may feel slightly more "workout" or gym-forward than the rest of the product while still belonging to the same calm system.

### Locked structure

- Training header and date strip
- Nova adjustment strip
- Today's Training
- Body-state illustration
- Start Workout and View Details
- This Week plan
- Recent Sessions
- Progress This Week
- Fixed bottom navigation

### Body-State System

Use one consistent human-body outline system rather than swapping between unrelated illustrations.

- Strength day: highlight relevant muscle groups
- Lower-body day: highlight legs/glutes/core
- Cardio/conditioning: indicate whole-body or central effort state
- Active recovery: softer whole-body state
- Rest: dim, quiet state

The illustration supports understanding; it must not dominate the page.

### Nova Strip

Nova surfaces use:

- NOVA title when needed
- Compass mark
- Straight living colour line
- Calm, relevant guidance

The line is Nova's signature presence, not decoration.

## Screen 3 — Journey Timeline

### Purpose

Journey answers: **Who am I becoming?**

It turns effort into memory and gives ordinary users somewhere to reflect and feel proud of themselves.

### Locked tabs

- Timeline
- Milestones
- Insights

"This Day" is not a permanent core tab at launch. Its memory concept may return later as a surfaced Journey feature once meaningful history exists.

### Timeline structure

- Weekly momentum summary
- Reverse chronological vertical timeline
- Today at the top
- Older entries below
- "Your journey begins" as the oldest origin entry
- Activity, note, feeling, photo, or milestone attached to moments
- Nova reflection surface
- Recent milestones preview

Timeline is a story, not a workout list.

## Journey — Milestones

### Purpose

Milestones provide recognition without ego.

They are moments earned, not prizes handed out.

### Structure

- Milestone summary
- Category filters
- Recently earned
- In progress
- Upcoming
- Nova milestone insight

### Language

Prefer human, quietly proud language:

- "You showed up for a full week"
- "You built consistency"
- "You're close to 10 workouts"

Avoid game-show celebration, fake urgency, and shame-based lock states.

### User Notes

Users may attach a feeling, memory, or note to meaningful milestones so they can understand what the moment meant months or years later.

## Journey — Insights

### Purpose

Insights explain the user to themselves.

It should feel like understanding, not analysis; clarity, not a trading dashboard.

### Structure

- Overview and momentum statement
- Gentle insight level/score where useful
- Key trends
- Focus areas
- What to consider
- Nova insight

### Rules

- Reduce glow and chart intensity
- Avoid crypto/trading visual language
- Prefer human summaries over raw percentages
- Use labels such as "Looking strong" or "Keep an eye on this" where appropriate
- The message should remain more important than the metric
- Use sleek connected glass surfaces rather than repeated card stacks

## Screen 4 — Nova

### Purpose

Nova is for the mind.

Nova is where the user thinks, asks, reflects, plans, and continues meaningful conversations. It should feel like the calmest room in North — somewhere to stay for five minutes with a coffee.

### Product identity

Nova is not:

- A dashboard
- A feature launcher
- A separate AI app
- A therapy product
- A generic chatbot

Nova is a companion with context and continuity.

### Locked interaction model

- Open directly into conversation
- Nova aligned left
- User aligned right
- Avoid traditional solid chat bubbles
- Words appear on one shared, soft glass surface
- User messages may carry the faintest North Blue tint
- Nova messages remain quieter and closer to the surface
- Same typography as the rest of North
- Minimal timestamps only when useful
- Speaker labels should be restrained and not repeated mechanically
- Message input remains the primary stable container

### Living Nova Line

The straight Nova signature line is the main ambient brand signal.

- Use the established North/Nova colour treatment
- It may move almost imperceptibly while Nova is thinking or responding
- It replaces loud typing dots, glows, and decorative AI effects
- It should feel alive, not animated for attention

### Conversation Continuity

Previous conversations are essential.

Provide a subtle history control and a lightweight recent conversations list. Users must be able to reopen and continue meaningful threads such as:

- Injury/recovery discussions
- Training plans
- Goal planning
- Reflections
- Long-term projects

Continuity is part of Nova's value: it says, "I remember."

### Nova language

Nova should sound caring and useful rather than transactional.

Preferred:

- "What would be helpful today?"
- "Let's figure that out together."
- "How are the legs after yesterday's ride?"

Avoid:

- "How can I assist?"
- Marketing-style feature labels
- Generic motivational slogans

### Emotional objective

Every other page helps the user do something. Nova should help the user think and feel looked after.

## Reflection / Check-In

Reflection remains a feature idea, not a separate bottom-navigation destination.

It may later appear as:

- A Nova conversation flow
- A bottom sheet
- A prompt from Today
- A lightweight Journey entry

Do not create a separate visual language or replace Nova in the core navigation.

## Future Concept — The Trail

**Status: Parking Lot**

The Trail is a future community experience where people leave footprints rather than create influencer content.

Possible content:

- Personal bests
- Runs and bike rides
- Milestones
- Achievement images/cards
- Personal notes and context

Principles:

- Progress over popularity
- Support over comparison
- Minimal toxicity
- Beautiful automatically generated achievement cards
- Activity-led discovery rather than influencer-led feeds
- Reactions and encouragement; comments may be limited or user-controlled

Do not build The Trail before the core North experience is strong and useful without it.

## Locked Product Mapping

- **Today** — presence and direction
- **Training** — body
- **Journey** — memory
- **Insights** — understanding
- **Nova** — mind
- **Soul** — not a page; it should be present throughout the experience

## Next Design Step

Design **Profile** using the same North system, then review all five core destinations together for:

- Navigation consistency
- Typography consistency
- North Blue usage
- Surface/card reduction
- Light/dark parity
- Motion opportunities
- Nova signature consistency
