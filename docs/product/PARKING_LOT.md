# North — Parking Lot

Ideas worth protecting but not building before the core product is ready.

## The Trail

A future community space where people leave footprints rather than compete for attention.

### Concept

Users may share:

- Personal bests
- Runs and bike rides
- Milestones
- Achievement cards
- Photos
- Notes about what the moment meant

### Product principles

- Progress over popularity
- Support over comparison
- No influencer-first design
- No algorithmic pressure to perform
- Activity-led discovery
- Beautiful North-generated share cards
- Reactions focused on encouragement
- Comments optional, limited, or user-controlled

### Why it waits

Community multiplies the value of a strong product; it does not replace one. Today, Training, Journey, Insights, Nova, and Profile must work brilliantly before The Trail is considered for active development.

## This Day Memories

The original "This Day" concept remains valuable as a delayed-payoff Journey feature, but not as a launch tab.

Potential future behaviour:

- "On this day last week"
- "On this day last month"
- "On this day last year"
- Milestone and reflection resurfacing

It should appear naturally only when meaningful history exists.

## Reflection / Daily Check-In

Reflection is retained as a feature concept under Nova, Today, or Journey rather than as a core navigation destination.

Possible forms:

- Nova-led conversational check-in
- Bottom sheet
- Post-workout reflection
- Morning energy/mood check
- Journey note prompt

The feature must use the established North visual system and must never replace Nova in the main navigation.

## Guided Timed Sets

For duration-based exercises, North could become the timer rather than sending the user to another phone app. Dead hangs, planks, wall sits, carries, mobility holds and multi-position isometrics are the clearest use cases.

This should be driven by the exercise prescription, not enabled indiscriminately across every set. Rep-based exercises such as squats remain untimed unless the user or coach deliberately adds a duration target.

Potential behavior:

- Replace the normal set detail with a large countdown that can be read when the phone is propped several feet away.
- Give work, transition, next-position, rest and complete phases unmistakably different colours.
- Preview the next position, then advance automatically for multi-hold sequences.
- Offer optional sound and haptic cues alongside the visual state change.
- Keep pause, extend, restart and skip controls on the workout screen.
- Keep the screen awake during an active timed set and record the completed duration with the set.
- Return directly to normal set logging when the timed sequence ends.

The core value is continuity: the user remains inside North and can see what comes next without switching apps mid-session. Colour is especially valuable as a distance-readable cue, but it must not be the only cue; labels, sound and haptics should preserve accessibility.

### Why it waits

North needs a clean duration-based set model before this becomes interface work. A first prototype should cover one hold and one two-position sequence, then be tested on a real gym floor for legibility, wake lock, interruption handling, sound, haptics and background behavior. It should not begin as a general-purpose interval timer.

## North for Coaches

A future professional workspace could let a real coach remain usefully present between sessions without taking ownership away from the client.

### Core relationship

- Every client has their own standard North account and records their own sessions.
- A client invites or explicitly accepts a coach connection.
- The coach adds that connected account to a private roster and sees only the information the client has agreed to share.
- Either person can end the relationship; client access revocation is immediate.
- The client's record remains intact if they change coach or the coach closes their business account.

### Useful coach workflow

- Scan a roster for recent sessions, adherence, progress, recovery signals and items awaiting review.
- Open a client timeline and inspect completed exercises, sets, notes and trends.
- Leave session feedback or a check-in for the client.
- Build, assign and revise workouts or programs with a visible change history.
- See what changed since the previous appointment and prepare the next conversation.
- Receive restrained exceptions such as repeated missed work or a client-requested review, rather than constant notifications.

The first version should not include lead generation, public coach rankings, payments between coach and client, appointment scheduling, invoicing or a generic gym CRM. Those systems would distract from the differentiated value: connecting credible coaching to the training evidence already inside North.

### Commercial hypothesis

- The client remains a normal North subscriber. `$14.99` is a candidate consumer price to validate, not a launch commitment.
- The coach buys a separate business subscription for roster, review, planning and collaboration tools.
- Coach pricing could scale by active-client bands, allowing a solo coach to start affordably while larger practices pay for greater operational value.
- A coach-referred client could create a one-time acquisition reward: after an eligible new client's first paid `$14.99` month clears its refund window, `$4.99` is credited to the referring coach. North retains the remaining first-month revenue before costs and all later subscription revenue.
- A later practice tier could add assistant-coach roles, client assignment and shared programming while keeping each client's permissions explicit.
- Bundled client invitations or sponsored seats may be tested later, but must not make a client's data conditional on staying with a coach.

### Coach partner attribution

The one-time `$4.99` signup reward is the preferred first experiment, not a guaranteed public rate until acquisition economics and legal treatment are verified.

- Attribution comes from a coach invitation or referral link accepted during client registration, and is visible to both parties.
- The client pays North directly and receives the same product, price, cancellation rights and data rights as any other member.
- The coach reward is earned once, only after the eligible client's first payment clears any refund or chargeback window.
- Payouts use a minimum threshold and a clear statement showing qualified referrals, pending rewards, credits, reversals and amount paid.
- Self-referrals, duplicate accounts, recycled subscriptions and misleading claims are ineligible.
- Referral attribution must not imply permanent control of the client relationship; ending coaching access does not delete the client's North account.
- Before launch, North must decide the qualification window, coach tax documentation, VAT/sales-tax treatment, payment-provider fees, refunds and territorial availability.

The first commercial test should compare the `$4.99` reward with normal customer-acquisition cost and model first-month contribution after fees, taxes, support, Nova usage and payout administration. If the reward is uneconomic, North should adjust the membership price, reward or qualification rules openly rather than hide deductions from an advertised coach amount.

### Permission model

Permissions should be category-specific and understandable: training records, plans, progress measures, activities, recovery check-ins and health-platform summaries should not collapse into one broad “share everything” switch. Private Journey reflections, Nova conversations, credentials and raw health records are excluded by default.

Coach actions must carry actor, timestamp and outcome history. Assignments require a clear client-visible source, and edits must never silently replace completed records or a client's own changes.

### Why it could matter

For clients, North becomes the continuous record their coach can actually use. For coaches, preparation becomes faster and guidance can be based on what happened rather than memory or scattered messages. For North, the coach can become a trusted acquisition channel while the professional workspace creates recurring business revenue on top of the consumer membership.

### Why it waits

This should begin only after individual accounts, sync, privacy, workout recording and progress interpretation are reliable in real use. The cheapest validation is not a multi-tenant dashboard: it is testing coach-readable exports and structured workout imports with a small number of real coach-client pairs, then learning which recurring review actions deserve software.
