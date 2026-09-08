# North Guide claim sources

Last reviewed: 2026-08-04

This register supports factual claims published in the North Guide. It does not certify that an exercise is suitable for a particular person, diagnose a condition, or turn North's editable template values into prescriptions.

## External sources

### Skeletal-muscle roles

- **Source:** *Anatomy and Physiology 2e, 11.1 Interactions of Skeletal Muscles, Their Fascicle Arrangement, and Their Lever Systems*
- **Publisher:** OpenStax, Rice University
- **URL:** https://openstax.org/books/anatomy-and-physiology-2e/pages/11-1-interactions-of-skeletal-muscles-their-fascicle-arrangement-and-their-lever-systems
- **Accessed:** 2026-08-04
- **Supports:** The general distinction between a prime mover or agonist, an antagonist with the opposite action, a synergist that assists an action, and a fixator that stabilizes an attachment.
- **Guide claims:** `today-muscle-map`; the exercise-profile explanation in `build-a-strength-workout`.
- **Limit:** North's primary, secondary, supporting, and antagonist labels are editorial descriptions of an exercise action. They are not measurements of an individual body, and the source does not validate every exercise-specific assignment in the catalogue.

### Resistance-training variables and progression

- **Source:** *American College of Sports Medicine position stand. Progression models in resistance training for healthy adults*
- **Publisher:** American College of Sports Medicine; indexed by the U.S. National Library of Medicine
- **URL:** https://pubmed.ncbi.nlm.nih.gov/19204579/
- **DOI:** 10.1249/MSS.0b013e3181915670
- **Accessed:** 2026-08-04
- **Supports:** Sets, repetitions, load, exercise order, rest, training status, and goal are interacting program variables; guidance must be applied in the context of goals, capacity, and training status.
- **Guide claims:** `sets-reps-and-rest`; the prescription and rest explanations in `build-a-strength-workout` and `complete-a-workout`.
- **Limit:** North does not present one load, repetition range, set count, or rest period as universally correct. Template values are editable planning defaults, and completed records must contain what happened.

### General physical-activity guidance

- **Source:** *Physical Activity Guidelines for Americans, Second Edition - Current Guidelines*
- **Publisher:** Office of Disease Prevention and Health Promotion, U.S. Department of Health and Human Services
- **URL:** https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines/current-guidelines
- **Accessed:** 2026-08-04
- **Page updated:** 2025-11-19
- **Supports:** The current federal guidance is evidence-based population guidance for maintaining or improving health through physical activity.
- **Guide claims:** General context for strength and purposeful activity articles.
- **Limit:** Population guidance is not an individualized workout prescription and does not validate North's exercise-level suitability labels.

### Health Connect records and aggregates

- **Source:** *Health Connect data types*
- **Publisher:** Android Developers, Google
- **URL:** https://developer.android.com/health-and-fitness/health-connect/data-types
- **Accessed:** 2026-08-04
- **Page updated:** 2026-04-28 UTC
- **Supports:** Steps use `COUNT_TOTAL`; distance uses `DISTANCE_TOTAL`; exercise sessions are interval records with `EXERCISE_DURATION_TOTAL`; active calories use `ACTIVE_CALORIES_TOTAL`; total calories use `ENERGY_TOTAL`; sleep sessions are interval records; weight is an instantaneous body-measurement record.
- **Guide claims:** `samsung-health-and-health-connect` and connected-health metric explanations.
- **Limit:** Source apps may aggregate or display records differently. North preserves source attribution and does not promise dashboard totals will match another app.

## North editorial classification criteria

These are product taxonomy rules, not clinical or physiological rankings.

### Difficulty

- **Beginner:** The catalogue reviewer expects a comparatively simple setup, low coordination burden, and an ordinary stable variation. This does not mean suitable for every new member.
- **Intermediate:** The movement adds meaningful technical, balance, mobility, loading, or coordination demand and benefits from prior familiarity with its base pattern.
- **Advanced:** The movement has high technical, balance, mobility, speed, loading, or combined coordination demand and should not be treated as a default starting point.
- Where those factors disagree, the reviewer uses the more cautious label. Difficulty is searchable editorial metadata, not a promise of safety or a judgment of ability.

### Movement patterns

- Push and pull describe the dominant direction of force at the upper body.
- Squat, hinge, lunge, and step describe the dominant lower-body strategy.
- Carry describes locomotion while supporting an external load.
- Crawl describes locomotion using both upper and lower limbs for support.
- Rotation describes producing trunk rotation; anti-rotation describes resisting it.
- Isolation, mobility, stretch, balance, breathing, isometric, locomotion, jump, landing, throw, climb, acceleration, deceleration, and change of direction are operational discovery labels for the movement's dominant training intent.
- A movement can involve several actions. North's label identifies the primary catalogue route and is not a complete biomechanical analysis.

## Technique and safety boundary

Exercise setup, execution, mistake, and safety fields are editorial coaching prompts. The Guide explains where those fields appear but does not publish them as diagnosis, treatment, rehabilitation, or personalized clearance. Members are told to use a pain-free range, record honestly, and seek qualified individual help when suitability is uncertain.

Exercise-specific content remains subject to catalogue review and correction. Structural database validation proves required fields and references are internally consistent; it does not prove universal biomechanical suitability.

## Review rule

Recheck this register before publishing a release that changes member-facing anatomy terminology, exercise-classification meaning, default-prescription claims, rest guidance, or imported health semantics. Record a new review date and replace superseded official sources rather than silently broadening a claim.
