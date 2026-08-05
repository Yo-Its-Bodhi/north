import { guideProductArticles } from "./guideProductArticles";

export type GuideTopic = "Getting set up" | "Start here" | "Planning" | "Workouts" | "Your record" | "Health & privacy" | "Settings & access";

export type GuideDestination = "today" | "training" | "journey" | "nova" | "you" | "settings" | "account" | "nova-workout-builder" | "workout-library" | "programs";
export type GuideIntent = "open-today-anatomy" | "start-product-tour";
export type GuideAction = { label: string; destination: GuideDestination; intent?: GuideIntent };

export type GuideArticle = {
  id: string;
  topic: GuideTopic;
  title: string;
  summary: string;
  searchTerms: string[];
  introduction: string;
  steps: Array<{ title: string; body: string }>;
  remember: string;
  action?: GuideAction;
};

export const guideTopics: Array<"All" | GuideTopic> = ["All", "Getting set up", "Start here", "Planning", "Workouts", "Your record", "Health & privacy", "Settings & access"];

export const productTourGuideSteps: GuideArticle["steps"] = [
  { title: "Start with one clear direction.", body: "Today shows your planned workout, lets you check in with how you are feeling, and keeps the next useful action clear." },
  { title: "Progress becomes visible here.", body: "Journey brings your workouts, activities, milestones, and patterns together over time so you can inspect what actually happened." },
  { title: "Shape the week around real life.", body: "Training lets you plan the week, open or edit a session, choose a ready-made workout, or build your own." },
  { title: "Ask, inspect, then decide.", body: "Nova can answer from your saved North records and prepare useful changes, but meaningful plan changes wait for your approval." },
  { title: "You stay in control.", body: "You holds your direction, current signals, progress, and North memory, with account, device, privacy, and accessibility controls nearby." },
];

export const guideArticles: GuideArticle[] = [
  ...guideProductArticles,
  {
    id: "north-in-one-minute",
    topic: "Start here",
    title: "North in one minute",
    summary: "Plan what comes next, record what happened, then learn from the pattern.",
    searchTerms: ["begin", "new", "today", "what is north", "navigation"],
    introduction: "North gives your training one home. You do not need to understand every screen before you begin. Start with Today, follow the next useful action, and let your record grow from there.",
    steps: productTourGuideSteps,
    remember: "You are not behind. North is a direction, not a scorecard.",
    action: { label: "Open Today", destination: "today" },
  },
  {
    id: "sets-reps-and-rest",
    topic: "Start here",
    title: "Sets, reps, weight and rest",
    summary: "The basic gym words, without the gym-language fog.",
    searchTerms: ["set", "rep", "repetition", "weight", "load", "rest", "target", "beginner"],
    introduction: "A repetition, usually shortened to rep, is one complete movement. A set is one group of repetitions before you rest.",
    steps: [
      { title: "Read the target", body: "Three sets of ten means: do ten repetitions, rest, then repeat that two more times." },
      { title: "Choose a manageable weight", body: "Use a weight you can control through the intended movement. The last repetitions may feel challenging, but the target should not require you to abandon the movement." },
      { title: "Record the work", body: "Enter the weight and repetitions you actually completed. North keeps each set separately because real sets are not always identical." },
      { title: "Take the rest", body: "The rest target is time between working sets. It is part of the session, not wasted time." },
    ],
    remember: "The target guides the set. Your honest result is the record.",
    action: { label: "See your Training plan", destination: "training" },
  },
  {
    id: "understand-today",
    topic: "Start here",
    title: "What Today is showing you",
    summary: "Your planned direction, current signals, week, and latest record in one place.",
    searchTerms: ["today", "direction", "check in", "week", "next milestone"],
    introduction: "Today is the shortest route into North. It combines the plan with the latest information you have chosen to record or connect.",
    steps: [
      { title: "Today’s direction", body: "This is the session currently planned for today. Opening it does not complete it; the record changes only when you save completed work." },
      { title: "How are you arriving?", body: "Sleep is the number of hours you choose to report; energy and soreness are your own 1–5 observations; body weight is optional; and the note holds context the numbers miss. North treats these entries as personal observations, not measurements or medical conclusions." },
      { title: "Your week", body: "The seven day strip shows which planned days are complete, skipped, resting, or still ahead." },
      { title: "The record", body: "Your latest completed session and the next planned direction keep the plan connected to what really happened." },
    ],
    remember: "Today helps you choose the next useful action. It does not demand a perfect day.",
    action: { label: "Open Today", destination: "today" },
  },
  {
    id: "today-muscle-map",
    topic: "Start here",
    title: "Read today’s muscle map",
    summary: "Open the body map already on Today and understand what its highlights mean.",
    searchTerms: ["anatomy", "body", "muscle", "map", "front", "back", "primary", "supporting", "today"],
    introduction: "Today’s muscle map is a visual summary of the movements in today’s plan. It helps you connect exercise names to body areas without turning the plan into a medical assessment.",
    steps: [
      { title: "Open the existing map", body: "Use the expand button on Today to open North’s full-screen muscle explorer. The Guide sends you to that same explorer rather than keeping a separate anatomy view." },
      { title: "Switch sides", body: "Choose Front or Back to inspect the highlighted areas from either side of the body." },
      { title: "Choose a highlight", body: "Select a highlighted area or its name to read its plain-language purpose and role in today’s plan." },
      { title: "Check the source exercise", body: "When available, Used by today lists the exercise or activity that caused that area to be highlighted." },
    ],
    remember: "The map describes today’s planned movements. It does not diagnose pain, injury, or health conditions.",
    action: { label: "Open today’s muscle explorer", destination: "today", intent: "open-today-anatomy" },
  },
  {
    id: "plan-a-week-and-block",
    topic: "Planning",
    title: "Plan a week or a 12-week block",
    summary: "Shape one useful week, copy the rhythm forward, then adjust the exceptions.",
    searchTerms: ["plan", "calendar", "week", "12 week", "block", "schedule", "copy"],
    introduction: "North stores one historical week and a twelve-week planning block. You can edit one day at a time without needing to design all 84 future days at once.",
    steps: [
      { title: "Start with this week", body: "Choose a day in Training and set it as strength, biking, running, walking, recovery, or rest." },
      { title: "Open the 12-week block", body: "Use the week controls to open the block. Each week remains individually editable." },
      { title: "Copy a rhythm", body: "Copy the current week into the next week, or repeat it through Week 12. North asks before replacing future plans." },
      { title: "Adjust real-life changes", body: "Open any copied day and change it. Editing one future day does not rewrite the completed record behind you." },
      { title: "Move or skip a plan", body: "Moving changes where unfinished planned work appears. Skipping marks that planned session as skipped; it does not create a completed workout or claim that the work happened." },
      { title: "Add work later", body: "Choose a past calendar date to add a missed workout or activity. North uses the performed date in Journey and Training while separately preserving that the record was entered later." },
    ],
    remember: "A plan is allowed to change. Completed records remain the truth.",
    action: { label: "Open Training", destination: "training" },
  },
  {
    id: "build-a-strength-workout",
    topic: "Workouts",
    title: "Build a strength workout",
    summary: "Choose movements, shape the target, and save a workout you can reuse.",
    searchTerms: ["build", "workout", "strength", "exercise", "routine", "sets", "custom"],
    introduction: "A strength workout is a saved group of exercises. Each exercise can have its own number of sets, target, and rest time.",
    steps: [
      { title: "Name the workout", body: "Use a name you will recognize later. The description, focus, goal, level, duration, and location help you find it again." },
      { title: "Find movements", body: "Search by exercise name, body area, or equipment. Refine by body area, equipment, movement, difficulty, type, position, place, or target muscle; quick filters include no equipment, low impact, beginner, timed holds, cardio, and left/right work. Filters update immediately and Clear removes them." },
      { title: "Read an exercise profile", body: "The profile separates setup and technique, common mistakes, safety notes, equipment, tracking method, catalogue difficulty, accessibility tags, personal history, and muscles by role. Difficulty describes North’s catalogue classification, not your worth or a guarantee that the movement suits you. Muscle and relationship labels are editorial training data, not a measurement of your body." },
      { title: "Keep a favourite exercise", body: "Use the heart in an exercise profile to add or remove its favourite marker. Favourite exercises return in Training under Favourite exercises and sync with your North account. Removing the heart removes only that shortcut; it does not delete workouts, plans, or completed history." },
      { title: "Shape each prescription", body: "Choose 1–10 planned sets, an optional planned load, a target written as repetitions, time, distance, or another clear instruction, and 0–600 seconds of rest in 15-second steps. The tracking method shows which results fit the exercise. Template values are editable starting points, not physiological recommendations; record actual results during the session." },
      { title: "Edit the saved order", body: "Adding places a movement in this personal template, removing takes it out of future uses of this template, and moving it changes the order shown when the workout is prepared. These edits do not rewrite completed sessions." },
      { title: "Save or schedule it", body: "Keep the workout in My Workouts, add it to a selected day, or prepare it immediately. Editing your private copy does not alter a completed workout." },
    ],
    remember: "Start simple. A short workout you understand is more useful than a complicated one you avoid.",
    action: { label: "Build a workout", destination: "nova-workout-builder" },
  },
  {
    id: "complete-a-workout",
    topic: "Workouts",
    title: "Record a workout honestly",
    summary: "Log sets, pause safely, pass a movement, and finish without losing the session.",
    searchTerms: ["record", "workout", "complete", "pause", "resume", "pass", "timer", "offline"],
    introduction: "The live workout screen records the work set by set. North saves the active session on the device so a refresh or weak connection does not silently erase it.",
    steps: [
      { title: "Start from preparation", body: "Review the exercises and targets before beginning. Starting claims that planned day but does not mark it complete yet." },
      { title: "Separate the target from history", body: "The target describes the work planned now. A previous result is a historical reference from an earlier completed session, not a requirement for today." },
      { title: "Complete each set", body: "Enter what you performed, then mark the set complete. Rest timing begins from the completed set when a rest target is present." },
      { title: "Control rest timing", body: "The timer starts from that exercise’s planned rest value. Pause or resume it, add or remove 15 seconds, or skip the remainder. These controls change the clock for this rest period; the planned value is a schedule you can adjust, not a recovery guarantee or medical recommendation." },
      { title: "Record a timed hold", body: "By default, enter the duration you actually held and mark the set done. Assisted hold timer is an optional, off-by-default account preference: when enabled, start and stop the timer to record duration automatically, or use its close control to return to manual entry for the current workout." },
      { title: "Adapt without pretending", body: "Add or remove sets, use an alternative, write a note, or pass an exercise and return later. Incomplete work remains incomplete." },
      { title: "Keep the session available", body: "North requests that a supported device keep the screen awake during an active workout and tries again after you return. Browser, battery, and device rules can still deny or release that request, so this is not a guarantee." },
      { title: "Review and save", body: "Finish the session, review energy, difficulty, and reflection, then save it. Only then does it become permanent history." },
    ],
    remember: "North records the session you did, not the session you hoped to do.",
    action: { label: "Open Training", destination: "training" },
  },
  {
    id: "record-an-activity",
    topic: "Workouts",
    title: "Record biking, walking, running or recovery",
    summary: "Movement outside a strength workout still belongs in your record.",
    searchTerms: ["bike", "cycle", "walk", "run", "recovery", "activity", "distance", "effort"],
    introduction: "North keeps purposeful activities alongside workouts. You can record them on the day they happened, including a past day.",
    steps: [
      { title: "Choose the activity", body: "Open Quick log or choose a date in the Training calendar, then select bike, walk, run, or recovery." },
      { title: "Add what you know", body: "Duration is useful. Distance, effort, and a note are optional context when they apply." },
      { title: "Save it to Journey", body: "The activity appears on its performed date and contributes to relevant time and distance summaries." },
      { title: "Correct it if needed", body: "Open the corresponding day in Journey or the Training calendar to inspect the record." },
    ],
    remember: "You do not need perfect data for movement to count. Record only what you know.",
    action: { label: "Open Training", destination: "training" },
  },
  {
    id: "journey-and-training-atlas",
    topic: "Your record",
    title: "Read Journey and Training Atlas",
    summary: "See sessions in order, then zoom out to the patterns they create.",
    searchTerms: ["journey", "timeline", "atlas", "chart", "progress", "milestone", "history"],
    introduction: "Journey is the chronological record. Training Atlas summarizes that record across a chosen period without changing it.",
    steps: [
      { title: "Use Timeline for detail", body: "Filter or choose a date to find workouts, activities, check-ins, reflections, and meaningful imported sessions." },
      { title: "Use Milestones for earned moments", body: "Milestones unlock from recorded evidence. North does not award them from an unfinished plan." },
      { title: "Use Training Atlas for direction", body: "Compare sessions, time, sets, volume, or distance across supported periods. A chart describes your records; it does not diagnose your health." },
      { title: "Open the evidence", body: "Select a date or record when you need the session behind a total or trend." },
    ],
    remember: "A trend is a description of your record, not a verdict on your effort.",
    action: { label: "Open Journey", destination: "journey" },
  },
  {
    id: "samsung-health-and-health-connect",
    topic: "Health & privacy",
    title: "Samsung Health and Health Connect",
    summary: "Understand what is imported, where it appears, and what remains under your control.",
    searchTerms: ["samsung", "health connect", "watch", "sync", "steps", "sleep", "permissions", "import"],
    introduction: "On supported Android devices, North receives permitted records through Health Connect. Samsung Health remains the source app; North does not read your Samsung account directly.",
    steps: [
      { title: "Choose categories", body: "You control separate permissions for purposeful workouts, daily movement, sleep and recovery, and optional body measurements." },
      { title: "Sync through North Health", body: "The Android companion sends permitted Health Connect records to your private North account. Imports are designed to be idempotent, so the same source record is not intentionally added twice." },
      { title: "Know where records appear", body: "Purposeful rides, walks, runs, and workouts can appear as sessions. Daily totals such as steps remain contextual summaries rather than separate Journey activities." },
      { title: "Pause or revoke access", body: "Change North’s category preferences or revoke Health Connect permission. Existing imported account records are handled separately from future access." },
    ],
    remember: "Nothing connects silently. Source attribution matters when two apps show different totals.",
    action: { label: "Open privacy and services", destination: "settings" },
  },
  {
    id: "ask-nova",
    topic: "Your record",
    title: "Ask Nova without giving up control",
    summary: "Nova can explain, reflect and propose. You decide what changes.",
    searchTerms: ["nova", "ai", "coach", "memory", "suggestion", "proposal", "privacy"],
    introduction: "Nova is North’s conversational companion. It can use your approved records and memory to help you think through training, but it cannot silently apply a meaningful plan change.",
    steps: [
      { title: "Ask in ordinary language", body: "Ask about today, your week, recovery, an exercise, or a pattern. You do not need a special command." },
      { title: "Inspect evidence and limits", body: "When evidence is available, Nova shows what informed the response and how confident it is." },
      { title: "Review proposed changes", body: "Plan-changing suggestions show the before and after state. Confirm, correct, reject, or undo supported changes." },
      { title: "Keep goals explicit", body: "A Nova goal has a title, description, category, priority from 1 to 5, and an optional target date. Draft is not yet current; active means it can guide current context; paused preserves it without treating it as current; completed records that it was finished; abandoned records that you stopped pursuing it. Goal changes still require your approval." },
      { title: "Give only useful setup context", body: "Nova setup can save usual locations, home equipment, gym access, and preferred training time as coaching memory so suggestions can stay practical. Every field is optional. Review that saved memory later to pause its influence or erase it." },
      { title: "Control memory", body: "Review, pause, correct, reject, or delete what Nova may use. Private conversation is not a replacement for medical care." },
    ],
    remember: "Nova helps you think. It does not take ownership of your direction.",
    action: { label: "Open Nova", destination: "nova" },
  },
  {
    id: "account-sync-and-recovery",
    topic: "Health & privacy",
    title: "Account, sync and recovery",
    summary: "Keep access to your private record across devices and understand the recovery code.",
    searchTerms: ["account", "password", "recovery", "code", "sync", "device", "backup", "restore", "sign out"],
    introduction: "Your signed-in North account keeps private records scoped to you. A username uses 3–30 letters, numbers, underscores, or hyphens, and a password must contain at least 10 characters. The recovery code is the way back in if you cannot use that password; North does not use email recovery in this release.",
    steps: [
      { title: "Keep the recovery code somewhere safe", body: "North shows a high-entropy recovery code when the account is created, recovered, or rotated. It is shown once; North stores a protected fingerprint rather than a readable copy, so it cannot email the original code back to you." },
      { title: "Use recovery carefully", body: "Enter the username, current recovery code, and a new password of at least 10 characters. Successful recovery issues a new one-time recovery code and invalidates the old code." },
      { title: "Let sync finish", body: "North keeps a local working copy and synchronizes account documents. Offline changes wait in an outbox and retry when connection returns." },
      { title: "Review devices", body: "Account & devices shows signed-in devices. You can sign out another device without deleting your account records." },
      { title: "Keep an export when useful", body: "Settings can export a North backup for personal recovery. Restoring a file replaces the browser copy, so review the confirmation carefully." },
    ],
    remember: "Signing out removes access on that device. Deleting an account is a separate, explicit action.",
    action: { label: "Open Account & devices", destination: "account" },
  },
];