import { Fragment, type ChangeEvent, type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDownUp,
  BedDouble,
  Bike,
  Bug,
  CalendarDays,
  Award,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  ClipboardPaste,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Copy,
  Compass,
  Database,
  Download,
  Dumbbell,
  Footprints,
  History,
  HeartPulse,
  Heart,
  Image,
  ListFilter,
  CloudSun,
  Map as MapIcon,
  MessageCircle,
  Moon,
  NotebookPen,
  Pause,
  PersonStanding,
  Play,
  Plus,
  RotateCcw,
  Search,
  Save,
  Send,
  Share2,
  SlidersHorizontal,
  SkipForward,
  Sparkles,
  Sun,
  TimerReset,
  TrendingUp,
  Trophy,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { exerciseCategories, exerciseEquipment, exerciseLibrary, type ExerciseDefinition } from "./data/exercises";
import { estimatedWorkoutMinutes, workoutDisplayName, workoutFocuses, workoutGoals, workoutLevels, workoutTemplates, type WorkoutTemplate } from "./data/workouts";
import { programs, type ProgramDefinition } from "./data/programs";
import { milestoneCategories, milestoneDefinitions, type MilestoneMetric } from "./data/milestones";
import { deriveEarnedMoments } from "./data/celebrations";
import { combineMuscleActivations, getMuscleActivation as getLegacyMuscleActivation } from "./data/muscleActivations";
import type { VisualActivationMap, VisualRole } from "./components/anatomyVisualMap";
import { getExerciseGuidance } from "./data/exerciseGuidance";
import { deleteCurrentNorthDatabase, migrateLegacyStorage, northRepository, type SyncConflict } from "./data/northDb";
import { ensureNorthTimezone, logoutNorthAccount, NORTH_API_BASE, northDeviceHeaders, readNorthSession, withFreshAccess } from "./data/account";
import { pullNorth, resolveConflict, syncNorth, type SyncResult } from "./data/sync";
import Onboarding, { type OnboardingResult } from "./Onboarding";
import SyncCentre from "./SyncCentre";
import { getApprovedExerciseDemo, getExerciseMedia } from "./data/exerciseMedia";
import AnatomyMap from "./components/AnatomyMap";
import { BrandLoader, LoginBrandReveal } from "./components/BrandMotion";
import { DynamicSetLogger } from "./components/DynamicSetLogger";
import { ExercisePickerV2 } from "./components/ExercisePickerV2";
import { NormalizedExerciseDetails } from "./components/NormalizedExerciseDetails";
import { toLegacyExerciseDefinition } from "./exerciseDatabase/compatibility";
import { productionExerciseLibrary, normalizeExerciseKey } from "./exerciseDatabase/libraryExercises";
import { trackingTemplates } from "./exerciseDatabase/taxonomies";
import { createTrackingSet, defaultUnitPreferences, legacyCompatibleSet, summarizeTrackingSet, swapReasons, type LoggedTrackingSet } from "./exerciseDatabase/trackingEngine";
import type { Exercise as CanonicalExercise } from "./exerciseDatabase/types";
import { approveNovaProposal, archiveNovaConversation, createNovaGoal, createNovaMemory, deleteNovaMemory, getNovaBootstrap, getNovaStatus, loadNovaConversation, recordNovaProposalApplied, rejectNovaProposal, sendNovaMessage, updateNovaGoal, updateNovaMemory, type NovaApiProposal, type NovaApiStatus, type NovaGoal, type NovaMemory } from "./data/novaApi";
import "./components/AnatomyMap.css";

type Screen = "today" | "journey" | "training" | "week-plan" | "nova" | "nova-workout-builder" | "nova-routine-builder" | "you" | "account" | "settings" | "prepare" | "exercise-detail" | "workout" | "review" | "workout-library" | "workout-template" | "programs" | "program-detail" | "progression" | "workout-history" | "session-detail" | "activity-log" | "coach-import" | "check-in" | "weekly-review" | "test-log";
type ThemeName = "off-white" | "rosewater" | "cloud" | "sage" | "teal" | "carbon" | "midnight" | "plum" | "pine";

const themeOptions: Array<{ id: ThemeName; name: string; mode: "light" | "dark" }> = [
  { id: "off-white", name: "Off-white", mode: "light" }, { id: "rosewater", name: "Rosewater", mode: "light" }, { id: "cloud", name: "Cloud", mode: "light" }, { id: "sage", name: "Sage", mode: "light" },
  { id: "teal", name: "Teal", mode: "dark" }, { id: "carbon", name: "Carbon", mode: "dark" }, { id: "midnight", name: "Midnight", mode: "dark" }, { id: "plum", name: "Plum", mode: "dark" }, { id: "pine", name: "Pine", mode: "dark" },
];

const RELEASE_NOTES_ID = "north-0.4-nova-intelligence-hub";
const RELEASE_NOTES_DISMISSAL_KEY = "north-release-notes-dismissed";
type ReleaseNotesVersion = "0.4" | "0.3" | "0.2" | "0.1";
type ReleaseNote = { version: ReleaseNotesVersion; eyebrow: string; title: string; introLead: string; intro: string; items: Array<{ title: string; detail: string }>; thanksLead: string; thanks: string; action: string };

const releaseNotes: ReleaseNote[] = [
  { version: "0.4", eyebrow: "NORTH 0.4 · NOVA WAKES UP", title: "Your coach now knows your direction.", introLead: "North already knew how to record the work.", intro: "Now Nova can understand the story behind it, talk it through with you and prepare real changes without ever silently taking control.", items: [{ title: "Talk like a person. Get a real answer.", detail: "Ask about today’s plan, recovery, progress, exercises or what to do next. Nova answers from your saved North records, not a generic fitness script." }, { title: "Your goals have a home.", detail: "Create, pause, complete and refine your direction in a private goal ledger that belongs only to your account." }, { title: "You control what Nova remembers.", detail: "Review what Nova knows, confirm useful context, pause its influence or erase it completely." }, { title: "Changes come with a preview.", detail: "Goals, check-ins, reflections and workout decisions require your approval. Nothing meaningful moves behind your back." }, { title: "One conversation on every device.", detail: "Your Nova thread now follows your signed-in account from desktop to phone, just like your workouts and plans." }, { title: "Evidence, confidence and receipts.", detail: "See what informed a response, where the limits are and exactly what was saved after you approve an action." }], thanksLead: "This is Nova’s foundation, not the finish line.", thanks: "Bring the messy day, the big goal or the what now. North 0.4 is ready to think it through with you.", action: "Meet the new Nova" },
  { version: "0.3", eyebrow: "NORTH 0.3 · BUILT TO MOVE", title: "Your training system just got seriously stronger.", introLead: "0.2 gave you better builders, themes and cross-device control.", intro: "Now 0.3 powers up the engine underneath it all. More movements, better records and smarter muscle detail.", items: [{ title: "784 real exercises. One serious library.", detail: "Strength, cardio, mobility, calisthenics, machines, free weights, timed holds and more are searchable by muscle, equipment, movement, difficulty and training style." }, { title: "Muscles you can actually explore.", detail: "Every reviewed movement connects to North’s interactive front-and-back muscle system, with primary, secondary and supporting roles kept distinct." }, { title: "A recorder built for the gym floor.", detail: "Log weight and reps, left and right sides, timed holds, carries, distance, intervals and cardio using the right controls for the movement." }, { title: "Progress that understands the exercise.", detail: "Personal records and trends now respect the tracking style, so North does not judge a plank like a bench press." }, { title: "Swap without losing direction.", detail: "Progressions, regressions and equipment alternatives connect through stable exercise records." }], thanksLead: "The training engine got a serious upgrade.", thanks: "Pick something hard. Record it properly. Watch the story build.", action: "Keep exploring" },
  { version: "0.2", eyebrow: "NORTH 0.2 · BUILD YOUR WAY", title: "Make North fit the way you train.", introLead: "The foundation was in place.", intro: "0.2 made planning, building and personalising a workout feel closer to your actual week.", items: [{ title: "Build with Nova.", detail: "Set your goal, available time, equipment and location, then build a guided workout one movement at a time." }, { title: "A cleaner workout library.", detail: "Clearer names, honest time estimates including rest, useful sorting and focused filters." }, { title: "Plan the right day.", detail: "Choose an exact day before adding a workout without accidentally reshuffling the week." }, { title: "Preview before adding.", detail: "Open an exercise profile before committing it to your workout." }, { title: "Cross-device account control.", detail: "Your account copy became the source of truth when devices disagreed, with safer syncing and conflict handling." }, { title: "More personal North.", detail: "New themes, refined cards, clearer measurements, improved labels and better navigation." }], thanksLead: "Your plan became more yours.", thanks: "Build the week you can actually carry, then adjust it with intention.", action: "See what changed" },
  { version: "0.1", eyebrow: "NORTH 0.1 · FIRST USABLE LOOP", title: "The work finally had a home.", introLead: "North began with the useful loop.", intro: "Prepare a session, do the work, record it honestly and return to a plan that remembers what happened.", items: [{ title: "Today, Journey, Training, Nova and You.", detail: "A mobile-first home for the daily plan, history, training tools, reflection and personal direction." }, { title: "A complete workout loop.", detail: "Prepare, log sets, time rest, resume a session, review the work and preserve it in history." }, { title: "A real seven-day plan.", detail: "Move, replace, skip and complete planned days while keeping the week visible." }, { title: "Reflection and recovery belong in the record.", detail: "Check-ins, weekly reflection, activities and private photos add context beyond the numbers." }, { title: "Local-first and private by design.", detail: "Backup, restore, deletion, evidence-backed observations and privacy boundaries were part of the product from the beginning." }], thanksLead: "This was the starting line.", thanks: "The point was never just to count sets. It was to keep a useful record of the person doing them.", action: "Back to North" },
];

function readThemeName(): ThemeName {
  const saved = localStorage.getItem("north-theme");
  if (saved === "night") return "teal";
  return themeOptions.some((theme) => theme.id === saved) ? saved as ThemeName : "off-white";
}

type ActivityKind = "strength" | "bike" | "walk" | "run" | "recovery" | "rest";
type SessionRole = "warm-up" | "secondary" | "recovery" | "optional";
type PlannedSession = { id: string; kind: Exclude<ActivityKind, "rest">; title: string; role: SessionRole; duration: string; distance: string; note: string; status: "planned" | "completed" | "skipped" };
type PlanDay = { id: string; date: string; label: string; kind: ActivityKind; title: string; note: string; status: "planned" | "completed" | "skipped"; workout?: Exercise[]; sessions?: PlannedSession[] };
type NovaWorkoutDraft = { name: string; focus: string; goal: WorkoutTemplate["goal"]; duration: number; equipment: string; location: WorkoutTemplate["location"] };
type NovaExerciseDraft = { definition: ExerciseDefinition | null; sets: number; target: string; rest: number };
type WorkoutLibrarySort = "recommended" | "shortest" | "longest" | "name";

const workoutFocusAccents: Record<string, string> = {
  "Full body": "#26b88a", "Upper body": "#4b91ff", "Lower body": "#21c7c2", Push: "#ef8652", Pull: "#9272f5", Legs: "#1eba9a",
  Chest: "#ed719a", Back: "#668ee8", "V-taper": "#8e72e8", Shoulders: "#d681ef", Arms: "#d86eaa", Glutes: "#ed806f",
  Core: "#e5aa45", Calisthenics: "#46afd7", Mobility: "#8caf7a",
};

function workoutFocusAccent(focus: string) {
  return workoutFocusAccents[focus] ?? "var(--blue)";
}
type ActivityEntry = { id: string; date: string; kind: Exclude<ActivityKind, "strength" | "rest">; duration: string; distance: string; effort: number; note: string };
type CheckInEntry = { id: string; date: string; weight: string; sleep: string; energy: number; soreness: number; note: string };
type WeeklyReview = { id: string; weekStart: string; proud: string; learned: string; next: string; createdAt: string };
type TestNote = { id: string; createdAt: string; source: string; category: "confusing" | "slow" | "missing" | "bug"; text: string; resolved: boolean };
type ActiveProgram = { programId: string; startedAt: string; currentWeek: number; daysPerWeek: number; duration: number; level: string; equipment: string; priority: string; trainingDayIndexes: number[]; generatedWeekStart: string; weekHistory: Array<{ week: number; completed: number; planned: number; weekStart: string }>; changes: Array<{ createdAt: string; week: number; kind: string; from: string; to: string }> };
type ProgressionSuggestion = { id: string; exerciseName: string; kind: "load" | "reps" | "rest" | "recovery" | "substitution"; title: string; recommendation: string; evidence: string; nextWeight?: string; nextTarget?: string; nextRest?: number; substitution?: string };
type ProgressionTransaction = { id: string; suggestion: ProgressionSuggestion; planDayId: string; beforeDay: PlanDay; afterDay: PlanDay; beforeProgram: ActiveProgram | null; afterProgram: ActiveProgram | null; createdAt: string; appliedAt?: string; undoneAt?: string; dismissedAt?: string };
type JourneyPhoto = { id: string; createdAt: string; date: string; dataUrl: string; caption: string };
type WeatherContext = { temperature: number; apparent: number; precipitation: number; weatherCode: number };
type CachedWeather = WeatherContext & { savedAt: number };
type NovaAction = "open-today" | "open-week" | "check-in" | "progression" | "weekly-review";
type NovaPlanProposal = { id: string; planDayId: string; kind: "shorter" | "lower-stress" | "recovery"; summary: string; before: PlanDay; after: PlanDay };
type NovaProgramProposal = { id: string; summary: string; beforeProgram: ActiveProgram; afterProgram: ActiveProgram; beforePlan: PlanDay[]; afterPlan: PlanDay[] };
type NovaMessage = { id: string; role: "user" | "nova"; text: string; createdAt: string; evidence?: string[]; confidence?: "High" | "Moderate" | "Limited"; action?: NovaAction; actionLabel?: string; proposal?: NovaPlanProposal; programProposal?: NovaProgramProposal; apiProposal?: NovaApiProposal; appliedAt?: string; undoneAt?: string };
type ProfileSettings = { name: string; direction: string; targetDate: string; trainingDays: number; height: string; units: "imperial" | "metric"; bodyWeightUnit: "lb" | "kg"; distanceUnit: "mi" | "km"; language: string; tone: string; notifications: boolean; memoryEnabled: boolean; reducedMotion: boolean; largeText: boolean; highContrast: boolean; connectedServices: string[]; dismissedInsights: string[]; memoryCorrections: Record<string, string> };
type AccountDevice = { id: string; name: string; user_agent?: string; last_ip?: string; last_seen_at: string; created_at: string; revoked_at?: string; active_sessions: number };
type HealthConnection = { provider: "health_connect" | "apple_health"; status: string; scopes: string[]; source_apps: string[]; last_sync_at?: string; last_error?: string };
type HealthSummary = { days: number; types: Array<{ record_type: string; records: number; first_record: string; latest_record: string }> };
type HealthActivity = { id: string; started_at: string; ended_at: string; title?: string; kind: "bike" | "run" | "walk" | "workout"; exercise_type: number; distance_metres: number; duration_minutes: number; source_app: string };
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type SetResult = LoggedTrackingSet & { weight: string; reps: string; complete: boolean };
type Exercise = {
  id: string;
  name: string;
  target: string;
  rest: number;
  previous: string;
  cue: string;
  sets: SetResult[];
  note: string;
  passed: boolean;
  canonicalExerciseId?: string;
  trackingTemplateId?: string;
};
type Session = {
  planDayId?: string;
  performedAt?: string;
  recordedAt?: string;
  addedLater?: boolean;
  sourceTitle?: string;
  durationMinutes?: number;
  startedAt: string | null;
  finishedAt: string | null;
  currentId: string;
  exercises: Exercise[];
  energy: number;
  difficulty: number;
  reflection: string;
};

function DeferredUnitInput({ storedValue, formatValue, storeValue, onCommit, label, placeholder }: { storedValue: string; formatValue: (value: string) => number; storeValue: (value: string) => string; onCommit: (value: string) => void; label: string; placeholder?: string }) {
  const formatted = storedValue ? formatValue(storedValue).toFixed(1).replace(/\.0$/, "") : "";
  return <input key={formatted} type="number" inputMode="decimal" min="0" step="any" defaultValue={formatted} placeholder={placeholder} aria-label={label} onBlur={(event) => { const draft = event.currentTarget.value; const parsed = Number.parseFloat(draft); if (!draft.trim() || !Number.isFinite(parsed)) { event.currentTarget.value = ""; onCommit(""); return; } onCommit(storeValue(draft)); }} />;
}

function DeferredIntegerInput({ value, onCommit, min, max, step, label }: { value: number; onCommit: (value: number) => void; min: number; max: number; step?: number; label: string }) {
  const formatted = String(value);
  return <input key={formatted} type="number" inputMode="numeric" min={min} max={max} step={step} defaultValue={formatted} aria-label={label} onBlur={(event) => { const parsed = Number.parseInt(event.currentTarget.value, 10); const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min; event.currentTarget.value = String(next); onCommit(next); }} />;
}

const STORAGE_KEY = "north-active-session-v1";
const HISTORY_KEY = "north-session-history-v1";
const PLAN_KEY = "north-week-plan-v1";
const ACTIVITIES_KEY = "north-activities-v1";
const ACTIVITY_DRAFT_KEY = "north-activity-draft-v1";
const CHECK_INS_KEY = "north-check-ins-v1";
const REVIEWS_KEY = "north-weekly-reviews-v1";
const TEST_NOTES_KEY = "north-test-notes-v1";
const PERSONAL_TEMPLATES_KEY = "north-personal-workouts-v1";
const ACTIVE_PROGRAM_KEY = "north-active-program-v1";
const JOURNEY_PHOTOS_KEY = "north-journey-photos-v1";
const PROFILE_KEY = "north-profile-v1";
const NOVA_MESSAGES_KEY = "north-nova-conversation-v1";
const PROGRESSION_TRANSACTION_KEY = "north-progression-transaction-v1";
const LAST_PULL_KEY = "north-last-account-pull-v1";
const SYNC_BOOTSTRAP_VERSION = "north-account-hydrated-v3";

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

async function persistAccountJson(storageKey: string, collection: string, data: unknown, force = false) {
  const serialized = JSON.stringify(data);
  const stored = localStorage.getItem(storageKey);
  if (stored !== serialized) localStorage.setItem(storageKey, serialized);
  const document = await northRepository.get(collection, "primary");
  if (!force && stored === serialized && document && canonicalJson(document.data) === canonicalJson(data)) return false;
  await northRepository.put(collection, "primary", data);
  return true;
}
const PRODUCT_TOUR_KEY = "north-product-tour-v1";
const WEATHER_CACHE_KEY = "north-local-weather-v1";

function readWeatherCache(): WeatherContext | null {
  try {
    const cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) ?? "null") as CachedWeather | null;
    if (!cached || !Number.isFinite(cached.savedAt) || !Number.isFinite(cached.temperature) || !Number.isFinite(cached.weatherCode)) return null;
    return cached;
  } catch { return null; }
}

function WeatherMark({ code, size = 18 }: { code: number; size?: number }) {
  if (code === 0) return <Sun size={size} />;
  if ([1, 2].includes(code)) return <CloudSun size={size} />;
  if (code === 3) return <Cloud size={size} />;
  if ([45, 48].includes(code)) return <CloudFog size={size} />;
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <CloudRain size={size} />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow size={size} />;
  if (code >= 95) return <CloudLightning size={size} />;
  return <CloudSun size={size} />;
}
const productTourStorageKey = () => `${PRODUCT_TOUR_KEY}:${readNorthSession()?.user.id ?? "local"}`;
const productTourSteps: Array<{ screen: Screen; eyebrow: string; title: string; body: string; action: string }> = [
  { screen: "today", eyebrow: "YOUR DAY", title: "Start with one clear direction.", body: "Today brings your plan, recovery context, quick movement logs, and the most useful next action into one place.", action: "Show me Training" },
  { screen: "training", eyebrow: "YOUR PLAN", title: "Shape the week around real life.", body: "Select any day, change its session, edit every exercise, find a premade workout, or start logging from the gym floor.", action: "Meet Nova" },
  { screen: "nova", eyebrow: "YOUR COMPANION", title: "Ask, inspect, then decide.", body: "Nova uses saved North records, shows its evidence and limitations, and previews plan changes before you confirm them.", action: "See your Journey" },
  { screen: "journey", eyebrow: "YOUR STORY", title: "Progress becomes visible here.", body: "Journey connects workouts, activities, check-ins, milestones, reflections, and evidence-backed trends without inventing missing data.", action: "Open You" },
  { screen: "you", eyebrow: "YOUR NORTH", title: "You stay in control.", body: "Manage your direction, devices, memory, accessibility, privacy, backups, and account preferences. You can replay this tour anytime.", action: "Start using North" },
];

const starterExercises: Exercise[] = [
  {
    id: "incline-press",
    name: "Incline dumbbell press",
    target: "3 sets · 8–10 reps",
    rest: 90,
    previous: "45 lb · 10, 9, 8",
    cue: "Keep your shoulder blades anchored. Stop one clean rep before form changes.",
    sets: Array.from({ length: 3 }, () => ({ weight: "45", reps: "", complete: false })),
    note: "",
    passed: false,
  },
  {
    id: "lat-pulldown",
    name: "Lat pulldown",
    target: "3 sets · 8–12 reps",
    rest: 75,
    previous: "125 lb · 10, 10, 9",
    cue: "Drive elbows toward your back pockets. Let the lats lengthen at the top.",
    sets: Array.from({ length: 3 }, () => ({ weight: "125", reps: "", complete: false })),
    note: "",
    passed: false,
  },
  {
    id: "shoulder-press",
    name: "Seated shoulder press",
    target: "3 sets · 8–10 reps",
    rest: 90,
    previous: "35 lb · 10, 9, 8",
    cue: "Ribs down, wrists stacked, and finish without shrugging.",
    sets: Array.from({ length: 3 }, () => ({ weight: "35", reps: "", complete: false })),
    note: "",
    passed: false,
  },
  {
    id: "row",
    name: "Chest-supported row",
    target: "3 sets · 10–12 reps",
    rest: 75,
    previous: "60 lb · 12, 11, 10",
    cue: "Keep your chest heavy on the pad and pause briefly at the top.",
    sets: Array.from({ length: 3 }, () => ({ weight: "60", reps: "", complete: false })),
    note: "",
    passed: false,
  },
];

const canonicalExerciseLookup = new Map(productionExerciseLibrary.flatMap((exercise) => [exercise.canonicalName, exercise.displayName, ...exercise.aliases].map((name) => [normalizeExerciseKey(name), exercise] as const)));
function canonicalExerciseFor(exerciseOrName: Pick<Exercise,"name"|"canonicalExerciseId">|string):CanonicalExercise|undefined {const id=typeof exerciseOrName==="string"?undefined:exerciseOrName.canonicalExerciseId;return(id?productionExerciseLibrary.find((item)=>item.id===id):undefined)??canonicalExerciseLookup.get(normalizeExerciseKey(typeof exerciseOrName==="string"?exerciseOrName:exerciseOrName.name));}
function getMuscleActivation(exercise?:Pick<ExerciseDefinition,"name"|"category">|null){const legacy=getLegacyMuscleActivation(exercise);const canonical=exercise?canonicalExerciseFor(exercise.name):undefined;if(!canonical)return legacy;const activation=Object.fromEntries(canonical.muscles.map((mapping)=>[mapping.muscleId,{role:(mapping.role==="dynamic_stabilizer"?"stabilizer":mapping.role==="synergist"?"synergist":mapping.role==="antagonist"?"antagonist":mapping.role==="stabilizer"?"stabilizer":mapping.role==="primary"?"primary":mapping.role==="secondary"?"secondary":"supporting") as VisualRole,contribution:mapping.contributionLevel}])) as VisualActivationMap;return{...legacy,activation};}

function buildExercise(template: ExerciseDefinition, id = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`): Exercise {
  const setCount = Number(template.target.match(/^\d+/)?.[0] ?? 1);
  const canonical=canonicalExerciseFor(template.name),trackingTemplate=trackingTemplates.find((item)=>item.id===canonical?.trackingTemplateId);
  return {
    id,
    name: template.name,
    target: template.target,
    rest: template.rest,
    previous: template.previous,
    cue: template.cue,
    sets: Array.from({ length: setCount }, () => canonical&&trackingTemplate?{...createTrackingSet(canonical,trackingTemplate),weight:template.weight,reps:"",values:{...createTrackingSet(canonical,trackingTemplate).values,weight:template.weight}}:{ weight: template.weight, reps: "", complete: false }),
    note: "",
    passed: false,
    canonicalExerciseId:canonical?.id,
    trackingTemplateId:canonical?.trackingTemplateId,
  };
}

function exercisesFromTemplate(template: WorkoutTemplate): Exercise[] {
  return template.exercises.map((planned, index) => {
    const definition = exerciseLibrary.find((exercise) => exercise.name === planned.exerciseName) ?? exerciseLibrary[0];
    const exercise = buildExercise(definition, `${template.id}-${index}-${planned.exerciseName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
    return {
      ...exercise,
      target: `${planned.sets} sets · ${planned.reps}${planned.reps.includes("sec") ? "" : " reps"}`,
      rest: planned.rest,
      sets: Array.from({ length: planned.sets }, () => ({ weight: definition.weight, reps: "", complete: false })),
    };
  });
}

function prescribedResult(target: string) {
  const result = target.match(/(?:·|sets?)\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*(?:reps?|sec(?:onds?)?|min(?:utes?)?)/i);
  return result ? (result[2] ?? result[1]) : "";
}

const resetExercises = (exercises: Exercise[]) => structuredClone(exercises).map((exercise) => ({
  ...exercise,
  passed: false,
  note: "",
  sets: exercise.sets.map((set) => ({ ...set, reps: prescribedResult(exercise.target) || set.reps, complete: false })),
}));

const initialSession = (exercises: Exercise[] = starterExercises, planDayId?: string): Session => ({
  planDayId,
  startedAt: null,
  finishedAt: null,
  currentId: exercises[0]?.id ?? "",
  exercises: resetExercises(exercises),
  energy: 3,
  difficulty: 3,
  reflection: "",
});

function readSession(): Session {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialSession();
    const parsed = JSON.parse(saved) as Session;
    if (!parsed || !Array.isArray(parsed.exercises) || parsed.exercises.length === 0) return initialSession();
    if (parsed.finishedAt) return initialSession();
    return { ...parsed, exercises: parsed.exercises.map((exercise) => ({ ...exercise, sets: Array.isArray(exercise.sets) ? exercise.sets.map((set) => ({ ...set, reps: set.reps || prescribedResult(exercise.target) })) : [] })) };
  } catch {
    return initialSession();
  }
}

function readHistory(): Session[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && Array.isArray(item.exercises)) : [];
  } catch {
    return [];
  }
}

function formatSessionDate(value: string | null | undefined) {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function sessionMinutes(session: Session) {
  if (session.durationMinutes && session.durationMinutes > 0) return session.durationMinutes;
  if (!session.startedAt || !session.finishedAt) return null;
  return Math.max(1, Math.round((new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 60_000));
}

function workoutRecordDate(session: Session | undefined) {
  return session?.performedAt ?? session?.finishedAt ?? session?.startedAt ?? "";
}

function sessionSetCount(session: Session) {
  return session.exercises.flatMap((item) => item.sets).filter((set) => set.complete).length;
}

function sessionTonnage(session: Session) {
  return Math.round(session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.complete).reduce((total, set) => total + (Number.parseFloat(set.weight) || 0) * (Number.parseFloat(set.reps) || 0), 0));
}

function plannedMinutes(exercises: Exercise[]) {
  const seconds = exercises.reduce((total, exercise) => total + exercise.sets.length * (45 + exercise.rest), 0);
  return Math.max(10, Math.round(seconds / 60 + 5));
}

function plannedIntensity(exercises: Exercise[]) {
  const sets = exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const averageRest = exercises.length ? exercises.reduce((total, exercise) => total + exercise.rest, 0) / exercises.length : 0;
  return sets >= 20 || averageRest >= 110 ? "High" : sets >= 12 ? "Moderate" : "Light";
}

function isoDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: readNorthSession()?.user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function dateAtNoon(date: string) {
  return new Date(`${date}T12:00:00`);
}

function addIsoDays(date: string, days: number) {
  const next = dateAtNoon(date);
  next.setDate(next.getDate() + days);
  return isoDate(next);
}

function weekStartFor(date: string) {
  const value = dateAtNoon(date);
  value.setDate(value.getDate() - ((value.getDay() + 6) % 7));
  return isoDate(value);
}

function formatNovaText(text: string) {
  return text.replace(/\s+(?=\*\*[^*\n]{2,80}:\*\*)/g, "\n\n").replace(/\s+-\s+(?=[A-Z0-9])/g, "\n• ").replace(/\*\*/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function createWeekPlan(mondayDate: string): PlanDay[] {
  const monday = dateAtNoon(mondayDate);
  const defaults: Array<[ActivityKind, string]> = [
    ["strength", "Upper body strength"], ["bike", "Zone 2 bike"], ["strength", "Lower body strength"],
    ["recovery", "Recovery and mobility"], ["strength", "Full body strength"], ["walk", "Easy outdoor movement"], ["rest", "Rest"],
  ];
  const strengthTemplates = [
    starterExercises,
    ["Back squat", "Romanian deadlift", "Leg press", "Seated leg curl", "Standing calf raise"].map((name) => buildExercise(exerciseLibrary.find((item) => item.name === name)!)),
    ["Goblet squat", "Flat dumbbell press", "Seated cable row", "Dumbbell Romanian deadlift", "Dumbbell lateral raise", "Pallof press"].map((name) => buildExercise(exerciseLibrary.find((item) => item.name === name)!)),
  ];
  let strengthIndex = 0;
  return defaults.map(([kind, title], index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { id: isoDate(date), date: isoDate(date), label: new Intl.DateTimeFormat("en-CA", { weekday: "short" }).format(date), kind, title, note: "", status: "planned", sessions: [], workout: kind === "strength" ? resetExercises(strengthTemplates[strengthIndex++]) : undefined };
  });
}

function initialWeekPlan(): PlanDay[] {
  const thisMonday = weekStartFor(isoDate(new Date()));
  return [...createWeekPlan(thisMonday), ...createWeekPlan(addIsoDays(thisMonday, 7))];
}

function readPlan(): PlanDay[] {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAN_KEY) ?? "null") as PlanDay[] | null;
    if (!saved?.length || (saved.length !== 7 && saved.length !== 14)) return initialWeekPlan();
    const defaults = initialWeekPlan();
    return defaults.map((fallback) => {
      const item = saved.find((candidate) => candidate.date === fallback.date);
      if (!item) return fallback;
      const savedWorkoutIsUsable = item.workout?.length && item.workout.every((exercise) => Array.isArray(exercise.sets));
      return { ...item, title: workoutDisplayName(item.title), status: item.status ?? "planned", sessions: Array.isArray(item.sessions) ? item.sessions : [], workout: item.kind === "strength" ? (savedWorkoutIsUsable ? item.workout : fallback.workout ?? resetExercises(starterExercises)) : undefined };
    });
  } catch { return initialWeekPlan(); }
}

function readActivities(): ActivityEntry[] {
  try { const parsed = JSON.parse(localStorage.getItem(ACTIVITIES_KEY) ?? "[]"); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function readCheckIns(): CheckInEntry[] {
  try { const parsed = JSON.parse(localStorage.getItem(CHECK_INS_KEY) ?? "[]"); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function readWeeklyReviews(): WeeklyReview[] {
  try { const parsed = JSON.parse(localStorage.getItem(REVIEWS_KEY) ?? "[]"); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function readTestNotes(): TestNote[] {
  try { const parsed = JSON.parse(localStorage.getItem(TEST_NOTES_KEY) ?? "[]"); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function readPersonalTemplates(): WorkoutTemplate[] {
  try {
    const value = JSON.parse(localStorage.getItem(PERSONAL_TEMPLATES_KEY) ?? "[]");
    const parsed = Array.isArray(value) ? value as WorkoutTemplate[] : [];
    return parsed.filter((template) => template.id && template.name && Array.isArray(template.exercises)).map((template) => ({ ...template, source: "personal" }));
  } catch { return []; }
}

function readActiveProgram(): ActiveProgram | null {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTIVE_PROGRAM_KEY) ?? "null") as ActiveProgram | null;
    return saved && typeof saved === "object" && !Array.isArray(saved) ? { ...saved, trainingDayIndexes: Array.isArray(saved.trainingDayIndexes) ? saved.trainingDayIndexes : [], weekHistory: Array.isArray(saved.weekHistory) ? saved.weekHistory : [], changes: Array.isArray(saved.changes) ? saved.changes : [] } : null;
  }
  catch { return null; }
}

function readJourneyPhotos(): JourneyPhoto[] {
  try { const parsed = JSON.parse(localStorage.getItem(JOURNEY_PHOTOS_KEY) ?? "[]"); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function readProfile(): ProfileSettings {
  const defaults: ProfileSettings = { name: "", direction: "Build strength, consistency, and enough balance to enjoy the week.", targetDate: "", trainingDays: 3, height: "", units: "imperial", bodyWeightUnit: "lb", distanceUnit: "mi", language: "English", tone: "Encouraging and direct", notifications: false, memoryEnabled: true, reducedMotion: false, largeText: false, highContrast: false, connectedServices: [], dismissedInsights: [], memoryCorrections: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}");
    const merged = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? { ...defaults, ...parsed, bodyWeightUnit: parsed.bodyWeightUnit ?? (parsed.units === "metric" ? "kg" : "lb"), distanceUnit: parsed.distanceUnit ?? (parsed.units === "metric" ? "km" : "mi") } : defaults;
    return { ...merged, connectedServices: Array.isArray(merged.connectedServices) ? merged.connectedServices : [], dismissedInsights: Array.isArray(merged.dismissedInsights) ? merged.dismissedInsights : [], memoryCorrections: merged.memoryCorrections && typeof merged.memoryCorrections === "object" && !Array.isArray(merged.memoryCorrections) ? merged.memoryCorrections : {} };
  }
  catch { return defaults; }
}

function readNovaMessages(): NovaMessage[] {
  try {
    const messages = JSON.parse(localStorage.getItem(NOVA_MESSAGES_KEY) ?? "[]") as NovaMessage[];
    return Array.isArray(messages) ? messages.filter((message) => message?.id && message?.role && message?.text).slice(-80) : [];
  } catch { return []; }
}

function readProgressionTransaction(): ProgressionTransaction | null {
  try { return JSON.parse(localStorage.getItem(PROGRESSION_TRANSACTION_KEY) ?? "null") as ProgressionTransaction | null; }
  catch { return null; }
}

function App() {
  const [entryComplete, setEntryComplete] = useState(() => {
    const account = readNorthSession();
    return Boolean(account && localStorage.getItem(`north-onboarding-complete:${account.user.id}`));
  });
  const [loginReveal, setLoginReveal] = useState(false);
  const releaseNotesOpen = false;
  const [releaseNotesV4Open, setReleaseNotesOpen] = useState(() => localStorage.getItem(RELEASE_NOTES_DISMISSAL_KEY) !== RELEASE_NOTES_ID);
  const [dismissReleaseNotes, setDismissReleaseNotes] = useState(false);
  const [releaseNotesVersion, setReleaseNotesVersion] = useState<ReleaseNotesVersion>("0.4");
  const [tourStep, setTourStep] = useState(() => readNorthSession() && !localStorage.getItem(productTourStorageKey()) ? 0 : -1);
  const [screen, setScreen] = useState<Screen>(() => new URLSearchParams(location.search).get("open") === "training" ? "training" : "today");
  const [trainingDetailsOpen, setTrainingDetailsOpen] = useState(false);
  const [exerciseDetailReturn, setExerciseDetailReturn] = useState<"prepare" | "workout" | "workout-template">("prepare");
  const [exerciseDetailPreview, setExerciseDetailPreview] = useState<Exercise | null>(null);
  const [session, setSession] = useState<Session>(readSession);
  const [themeName, setThemeName] = useState<ThemeName>(readThemeName);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerControlsOpen, setTimerControlsOpen] = useState(false);
  const [workoutSubmitOpen, setWorkoutSubmitOpen] = useState(false);
  const [workoutClock, setWorkoutClock] = useState(() => Date.now());
  const [recorderStatus, setRecorderStatus] = useState("");
  const sessionRef = useRef(session);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [plannedPickerOpen, setPlannedPickerOpen] = useState(false);
  const [builderPickerOpen, setBuilderPickerOpen] = useState(false);
  const [builderStatus, setBuilderStatus] = useState("");
  const [novaWorkoutDraft, setNovaWorkoutDraft] = useState<NovaWorkoutDraft>({ name: "", focus: "Full body", goal: "General fitness", duration: 30, equipment: "Any equipment", location: "Gym" });
  const [novaExerciseSearch, setNovaExerciseSearch] = useState("");
  const [novaExerciseDraft, setNovaExerciseDraft] = useState<NovaExerciseDraft>({ definition: null, sets: 3, target: "8–12", rest: 75 });
  const [novaSuggestedExercises, setNovaSuggestedExercises] = useState<WorkoutTemplate["exercises"]>([]);
  const [novaSuggestionIndex, setNovaSuggestionIndex] = useState(0);
  const [novaRoutineStatus, setNovaRoutineStatus] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [exerciseCategory, setExerciseCategory] = useState("All");
  const [exerciseEquipmentFilter, setExerciseEquipmentFilter] = useState("All");
  const [novaInput, setNovaInput] = useState("");
  const [novaMessages, setNovaMessages] = useState<NovaMessage[]>(readNovaMessages);
  const [novaThinking, setNovaThinking] = useState(false);
  const [novaError, setNovaError] = useState("");
  const [novaAtBottom, setNovaAtBottom] = useState(true);
  const novaTranscriptRef = useRef<HTMLElement | null>(null);
  const [novaStatus, setNovaStatus] = useState<NovaApiStatus | null>(null);
  const [novaGoals, setNovaGoals] = useState<NovaGoal[]>([]);
  const [novaMemories, setNovaMemories] = useState<NovaMemory[]>([]);
  const [novaHubOpen, setNovaHubOpen] = useState(false);
  const [novaSetupOpen, setNovaSetupOpen] = useState(false);
  const [novaSetupDraft, setNovaSetupDraft] = useState({ locations: [] as string[], homeEquipment: [] as string[], gymAccess: "", preferredTime: "" });
  const [novaSetupSaving, setNovaSetupSaving] = useState(false);
  const [progressionTransaction, setProgressionTransaction] = useState<ProgressionTransaction | null>(readProgressionTransaction);
  const [history, setHistory] = useState<Session[]>(readHistory);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [historyReturnScreen, setHistoryReturnScreen] = useState<"training" | "journey">("training");
  const [historyEditing, setHistoryEditing] = useState(false);
  const [historyCalendarMonth, setHistoryCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const [historyCalendarDate, setHistoryCalendarDate] = useState(() => isoDate(new Date()));
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateFocus, setTemplateFocus] = useState("All");
  const [templateGoal, setTemplateGoal] = useState("All");
  const [templateLevel, setTemplateLevel] = useState("All");
  const [templateDuration, setTemplateDuration] = useState("All");
  const [templateSource, setTemplateSource] = useState("All");
  const [libraryFiltersOpen, setLibraryFiltersOpen] = useState(false);
  const [workoutLibrarySort, setWorkoutLibrarySort] = useState<WorkoutLibrarySort>("recommended");
  const [selectedTemplateId, setSelectedTemplateId] = useState(workoutTemplates[0].id);
  const [scheduleTemplate, setScheduleTemplate] = useState<WorkoutTemplate | null>(null);
  const [personalTemplates, setPersonalTemplates] = useState<WorkoutTemplate[]>(readPersonalTemplates);
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>(() => {
    try { const parsed = JSON.parse(localStorage.getItem("north-favorite-workouts-v1") ?? "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  });
  const [favoriteExerciseNames, setFavoriteExerciseNames] = useState<string[]>(() => { try { const parsed = JSON.parse(localStorage.getItem("north-favorite-exercises-v1") ?? "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } });
  const [recentTemplateIds, setRecentTemplateIds] = useState<string[]>(() => {
    try { const parsed = JSON.parse(localStorage.getItem("north-recent-workouts-v1") ?? "[]"); return Array.isArray(parsed) ? parsed.slice(0, 8) : []; } catch { return []; }
  });
  const [templateEditing, setTemplateEditing] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState(programs[0].id);
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(readActiveProgram);
  const [programDays, setProgramDays] = useState(programs[0].defaultDays);
  const [programDuration, setProgramDuration] = useState(45);
  const [programLevel, setProgramLevel] = useState("Beginner");
  const [programEquipment, setProgramEquipment] = useState<string[]>(["Any equipment"]);
  const [programPriority, setProgramPriority] = useState("Balanced");
  const [calorieEstimates, setCalorieEstimates] = useState(() => localStorage.getItem("north-calorie-estimates") === "on");
  const [journeyTab, setJourneyTab] = useState<"timeline" | "milestones" | "insights" | "this-day">("timeline");
  const [timelineFilter, setTimelineFilter] = useState("All");
  const [timelineDate, setTimelineDate] = useState("");
  const [timelineSort, setTimelineSort] = useState<"newest" | "oldest">("newest");
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [backfillSearch, setBackfillSearch] = useState("");
  const [journeyPhotos, setJourneyPhotos] = useState<JourneyPhoto[]>(readJourneyPhotos);
  const [photoCaption, setPhotoCaption] = useState("");
  const [milestoneFilter, setMilestoneFilter] = useState("All");
  const [selectedMilestoneChapter, setSelectedMilestoneChapter] = useState(1);
  const [weather, setWeather] = useState<WeatherContext | null>(readWeatherCache);
  const [weatherStatus, setWeatherStatus] = useState("");
  const [profile, setProfile] = useState<ProfileSettings>(readProfile);
  const [profileEditing, setProfileEditing] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [weeklyPlan, setWeeklyPlan] = useState<PlanDay[]>(readPlan);
  const [planSaveStatus, setPlanSaveStatus] = useState("Saved on this device");
  const [selectedPlanDayId, setSelectedPlanDayId] = useState(() => readPlan().find((item) => item.date === isoDate(new Date()))?.id ?? readPlan()[0].id);
  const [planningWeekOffset, setPlanningWeekOffset] = useState(0);
  const [stackComposerOpen, setStackComposerOpen] = useState(false);
  const [draftPlannedSession, setDraftPlannedSession] = useState<Omit<PlannedSession, "id" | "status">>({ kind: "bike", title: "Zone 2 bike ride", role: "warm-up", duration: "", distance: "", note: "" });
  const [activities, setActivities] = useState<ActivityEntry[]>(readActivities);
  const [draftActivity, setDraftActivity] = useState<ActivityEntry>(() => { try { return JSON.parse(localStorage.getItem(ACTIVITY_DRAFT_KEY) ?? "null") ?? { id: "", date: isoDate(new Date()), kind: "bike", duration: "", distance: "", effort: 3, note: "" }; } catch { return { id: "", date: isoDate(new Date()), kind: "bike", duration: "", distance: "", effort: 3, note: "" }; } });
  const [coachText, setCoachText] = useState("");
  const [importError, setImportError] = useState("");
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>(readCheckIns);
  const [draftCheckIn, setDraftCheckIn] = useState<CheckInEntry>({ id: "", date: isoDate(new Date()), weight: "", sleep: "", energy: 3, soreness: 2, note: "" });
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>(readWeeklyReviews);
  const [draftReview, setDraftReview] = useState({ proud: "", learned: "", next: "" });
  const [dataStatus, setDataStatus] = useState("");
  const [accountDevices, setAccountDevices] = useState<AccountDevice[]>([]);
  const [healthConnections, setHealthConnections] = useState<HealthConnection[]>([]);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [healthActivities, setHealthActivities] = useState<HealthActivity[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [muscleView] = useState<"primary" | "all">("all");
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installStatus, setInstallStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncVisible, setSyncVisible] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(localStorage.getItem("north-last-sync-at") || "");
  const [syncError, setSyncError] = useState("");
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);
  const [accountDataReady, setAccountDataReady] = useState(() => !entryComplete || !readNorthSession());
  const syncLock = useRef(false);
  const syncRequested = useRef(false);
  const syncTimer = useRef<number | null>(null);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [testNotes, setTestNotes] = useState<TestNote[]>(readTestNotes);
  const [testReturnScreen, setTestReturnScreen] = useState<Screen>("workout");
  const [draftTestNote, setDraftTestNote] = useState<{ category: TestNote["category"]; text: string }>({ category: "confusing", text: "" });

  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    const preserve = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionRef.current));
    window.addEventListener("pagehide", preserve);
    document.addEventListener("visibilitychange", preserve);
    return () => { window.removeEventListener("pagehide", preserve); document.removeEventListener("visibilitychange", preserve); };
  }, []);

  useEffect(() => {
    if (!entryComplete || !readNorthSession()) return;
    let cancelled = false;
    void (async () => {
      try {
        await migrateLegacyStorage();
        await ensureNorthTimezone();
        const account = readNorthSession();
        if (!account) return;
        const bootstrapKey = `${SYNC_BOOTSTRAP_VERSION}:${account.user.id}`;
        const repairHydration = !localStorage.getItem(bootstrapKey);
        const restored = await withFreshAccess((token) => pullNorth(NORTH_API_BASE, token, "1970-01-01T00:00:00.000Z", repairHydration));
        localStorage.setItem(`${LAST_PULL_KEY}:${account.user.id}`, restored.serverTime);
        localStorage.setItem(bootstrapKey, new Date().toISOString());
        if (!cancelled) reloadSyncedAccountState();
      } catch (reason) {
        if (!cancelled) setSyncError(reason instanceof Error ? reason.message : "Your account could not be restored yet.");
      } finally {
        if (!cancelled) setAccountDataReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [entryComplete]);

  useEffect(() => {
    const theme = themeOptions.find((option) => option.id === themeName) ?? themeOptions[0];
    document.documentElement.dataset.theme = theme.mode === "dark" ? "night" : "morning";
    document.documentElement.dataset.palette = theme.id;
    if (localStorage.getItem("north-theme") !== theme.id) { localStorage.setItem("north-theme", theme.id); void northRepository.put("settings", "theme", theme.id); }
  }, [themeName]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const heading = document.querySelector<HTMLElement>(".screen h1");
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [screen, journeyTab]);

  useEffect(() => { if (accountDataReady) void persistAccountJson(STORAGE_KEY, "active-session", session); }, [session, accountDataReady]);
  useEffect(() => { if (accountDataReady) void persistAccountJson(HISTORY_KEY, "workouts", history); }, [history, accountDataReady]);
  useEffect(() => { if (accountDataReady) void persistAccountJson(PLAN_KEY, "week-plan", weeklyPlan).then((changed) => { if (changed) setPlanSaveStatus(navigator.onLine ? "Saved on this device · syncing" : "Saved offline · syncs when connected"); }); }, [weeklyPlan, accountDataReady]);
  useEffect(() => { if (accountDataReady) void persistAccountJson(ACTIVITIES_KEY, "activities", activities); }, [activities, accountDataReady]);
  useEffect(() => { localStorage.setItem(ACTIVITY_DRAFT_KEY, JSON.stringify(draftActivity)); }, [draftActivity]);
  useEffect(() => { if (accountDataReady) void persistAccountJson(CHECK_INS_KEY, "check-ins", checkIns); }, [checkIns, accountDataReady]);
  useEffect(() => { if (accountDataReady) void persistAccountJson(REVIEWS_KEY, "reviews", weeklyReviews); }, [weeklyReviews, accountDataReady]);
  useEffect(() => { if (accountDataReady) void persistAccountJson(TEST_NOTES_KEY, "test-notes", testNotes); }, [testNotes, accountDataReady]);
  useEffect(() => { if (accountDataReady) void persistAccountJson(PERSONAL_TEMPLATES_KEY, "personal-workouts", personalTemplates); }, [personalTemplates, accountDataReady]);
  useEffect(() => { if (accountDataReady) void persistAccountJson("north-favorite-workouts-v1", "favorite-workouts", favoriteTemplateIds); }, [favoriteTemplateIds, accountDataReady]);
  useEffect(() => { if (accountDataReady) void persistAccountJson("north-favorite-exercises-v1", "favorite-exercises", favoriteExerciseNames); }, [favoriteExerciseNames, accountDataReady]);
  useEffect(() => { localStorage.setItem("north-recent-workouts-v1", JSON.stringify(recentTemplateIds)); }, [recentTemplateIds]);
  useEffect(() => { if (!accountDataReady) return; if (activeProgram) void persistAccountJson(ACTIVE_PROGRAM_KEY, "active-program", activeProgram); else if (localStorage.getItem(ACTIVE_PROGRAM_KEY) !== null) { localStorage.removeItem(ACTIVE_PROGRAM_KEY); void northRepository.remove("active-program", "primary"); } }, [activeProgram, accountDataReady]);
  useEffect(() => { localStorage.setItem("north-calorie-estimates", calorieEstimates ? "on" : "off"); void northRepository.put("settings", "calorie-estimates", calorieEstimates); }, [calorieEstimates]);
  useEffect(() => { if (accountDataReady) void persistAccountJson(JOURNEY_PHOTOS_KEY, "journey-photos", journeyPhotos); }, [journeyPhotos, accountDataReady]);
  useEffect(() => { if (accountDataReady) void persistAccountJson(NOVA_MESSAGES_KEY, "nova-conversations", novaMessages); }, [novaMessages, accountDataReady]);
  useEffect(() => {
    if (screen !== "nova" || !readNorthSession() || !navigator.onLine) return;
    let cancelled = false;
    void Promise.all([getNovaStatus(), getNovaBootstrap(), loadNovaConversation()]).then(([status, bootstrap, messages]) => {
      if (cancelled) return;
      setNovaStatus(status);
      setNovaGoals(bootstrap.goals);
      setNovaMemories(bootstrap.memories);
      if (messages.length) setNovaMessages(messages.map<NovaMessage>((message) => ({ id: message.id, role: message.role === "assistant" ? "nova" : "user", text: formatNovaText(message.content), createdAt: message.created_at, evidence: message.evidence, confidence: message.confidence === "high" ? "High" : message.confidence === "limited" ? "Limited" : "Moderate", apiProposal: bootstrap.pendingProposals.find((proposal) => proposal.source_message_id === message.id) })).slice(-80));
    }).catch((error) => {
      if (!cancelled) setNovaError(error instanceof Error ? error.message : "Nova's intelligence hub is not available yet.");
    });
    return () => { cancelled = true; };
  }, [screen]);
  useEffect(() => { if (!accountDataReady) return; if (progressionTransaction) void persistAccountJson(PROGRESSION_TRANSACTION_KEY, "progression-transaction", progressionTransaction); else if (localStorage.getItem(PROGRESSION_TRANSACTION_KEY) !== null) { localStorage.removeItem(PROGRESSION_TRANSACTION_KEY); void northRepository.remove("progression-transaction", "primary"); } }, [progressionTransaction, accountDataReady]);
  useEffect(() => {
    if (accountDataReady) void persistAccountJson(PROFILE_KEY, "profile", profile);
    document.documentElement.dataset.motion = profile.reducedMotion ? "reduced" : "full";
    document.documentElement.dataset.text = profile.largeText ? "large" : "standard";
    document.documentElement.dataset.contrast = profile.highContrast ? "high" : "standard";
  }, [profile, accountDataReady]);

  useEffect(() => {
    if (!entryComplete || !accountDataReady || !readNorthSession()) return;
    const scheduleSync = () => {
      if (!navigator.onLine) return;
      if (syncTimer.current !== null) window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => { syncTimer.current = null; void runAccountSync(); }, 1500);
    };
    const initial = window.setTimeout(() => { void runAccountSync(); }, 1500);
    const handleOnline = () => { setOnline(true); scheduleSync(); };
    const handleOffline = () => { setOnline(false); void refreshLocalSyncState(); };
    const handleVisibility = () => { if (document.visibilityState === "visible" && navigator.onLine) void runAccountSync(); };
    window.addEventListener("north:account-change", scheduleSync); window.addEventListener("online", handleOnline); window.addEventListener("offline", handleOffline); document.addEventListener("visibilitychange", handleVisibility);
    void refreshLocalSyncState();
    return () => { if (syncTimer.current !== null) window.clearTimeout(syncTimer.current); window.clearTimeout(initial); window.removeEventListener("north:account-change", scheduleSync); window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [entryComplete, accountDataReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (screen !== "nova") return;
    const transcript = novaTranscriptRef.current;
    if (!transcript) return;
    const updatePosition = () => setNovaAtBottom(transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 48);
    transcript.scrollTo({ top: transcript.scrollHeight, behavior: "auto" });
    setNovaAtBottom(true);
    transcript.addEventListener("scroll", updatePosition, { passive: true });
    return () => transcript.removeEventListener("scroll", updatePosition);
  }, [screen]);

  useEffect(() => {
    if (screen !== "nova" || !novaAtBottom) return;
    const transcript = novaTranscriptRef.current;
    transcript?.scrollTo({ top: transcript.scrollHeight, behavior: "auto" });
  }, [screen, novaMessages, novaThinking, novaAtBottom]);

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const installed = () => { setInstallPrompt(null); setInstallStatus("North is installed on this phone."); };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", installed); };
  }, []);

  useEffect(() => {
    if (!["you", "account"].includes(screen) || !readNorthSession()) return;
    void withFreshAccess(async (token) => {
      const response = await fetch(`${NORTH_API_BASE}/v1/me/devices`, { headers: { Authorization: `Bearer ${token}`, ...northDeviceHeaders() } });
      if (!response.ok) throw new Error("Devices could not load");
      const result = await response.json() as { devices: AccountDevice[]; currentDeviceId: string };
      setAccountDevices(result.devices); setCurrentDeviceId(result.currentDeviceId);
    }).catch(() => setAccountStatus("Device list could not be loaded."));
  }, [screen]);

  useEffect(() => {
    if (!entryComplete || !readNorthSession()) return;
    void withFreshAccess(async (token) => {
      const response = await fetch(`${NORTH_API_BASE}/v1/health/activities?days=30`, { headers: { Authorization: `Bearer ${token}`, ...northDeviceHeaders() } });
      if (!response.ok) throw new Error("Health activities could not load");
      const result = await response.json() as { activities?: HealthActivity[] };
      setHealthActivities(Array.isArray(result.activities) ? result.activities : []);
    }).catch(() => setHealthActivities([]));
  }, [entryComplete]);

  useEffect(() => {
    if (!["you", "account"].includes(screen) || !readNorthSession()) return;
    void withFreshAccess(async (token) => {
      const headers = { Authorization: `Bearer ${token}`, ...northDeviceHeaders() };
      const [connectionResponse, summaryResponse] = await Promise.all([fetch(`${NORTH_API_BASE}/v1/health/connections`, { headers }), fetch(`${NORTH_API_BASE}/v1/health/summary?days=30`, { headers })]);
      if (!connectionResponse.ok || !summaryResponse.ok) throw new Error("Health information could not load");
      const connectionResult = await connectionResponse.json() as { connections?: HealthConnection[] };
      const summaryResult = await summaryResponse.json() as Partial<HealthSummary>;
      setHealthConnections(Array.isArray(connectionResult.connections) ? connectionResult.connections : []);
      setHealthSummary(Array.isArray(summaryResult.types) ? { days: Number(summaryResult.days) || 30, types: summaryResult.types } : null);
    }).catch(() => { setHealthConnections([]); setHealthSummary(null); });
  }, [screen]);

  useEffect(() => {
    if (!timerRunning || timer <= 0) return;
    const id = window.setInterval(() => setTimer((value) => {
      if (value > 1) return value - 1;
      setTimerRunning(false);
      setRecorderStatus("Rest complete. Your next set is ready.");
      navigator.vibrate?.([80, 50, 80]);
      return 0;
    }), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timer]);

  useEffect(() => {
    if (screen !== "workout") return;
    const clock = window.setInterval(() => setWorkoutClock(Date.now()), 1000);
    let lock: { release: () => Promise<void> } | null = null;
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    if (wakeLock) void wakeLock.request("screen").then((value) => { lock = value; }).catch(() => undefined);
    return () => { window.clearInterval(clock); if (lock) void lock.release(); };
  }, [screen]);

  const currentIndex = Math.max(0, session.exercises.findIndex((item) => item.id === session.currentId));
  const current = session.exercises[currentIndex];
  const completedCount = session.exercises.filter((item) => item.sets.every((set) => set.complete)).length;
  const progress = Math.round((completedCount / session.exercises.length) * 100);
  const hasProgress = session.startedAt && !session.finishedAt;
  const hasPreparedDraft = !session.finishedAt && Boolean(session.planDayId) && session.exercises.length > 0;
  const elapsedWorkoutSeconds = session.startedAt ? Math.max(0, Math.floor((workoutClock - new Date(session.startedAt).getTime()) / 1000)) : 0;

  const available = useMemo(
    () => session.exercises.filter((item) => !item.passed && !item.sets.every((set) => set.complete)),
    [session.exercises],
  );
  const returnQueue = session.exercises.filter((item) => item.passed && !item.sets.every((set) => set.complete));
  const filteredLibrary = exerciseLibrary.filter((item) => {
    const query = exerciseSearch.trim().toLowerCase();
    const matchesQuery = !query || `${item.name} ${item.category} ${item.equipment} ${item.aliases.join(" ")}`.toLowerCase().includes(query);
    return matchesQuery && (exerciseCategory === "All" || item.category === exerciseCategory) && (exerciseEquipmentFilter === "All" || item.equipment === exerciseEquipmentFilter);
  });
  const novaExerciseMatches = novaExerciseSearch.trim() ? exerciseLibrary.filter((item) => `${item.name} ${item.category} ${item.equipment} ${item.aliases.join(" ")}`.toLowerCase().includes(novaExerciseSearch.trim().toLowerCase())).slice(0, 12) : [];
  const selectedHistory = history.find((item) => item.finishedAt === selectedHistoryId) ?? null;
  const selectedPlanDay = weeklyPlan.find((item) => item.id === selectedPlanDayId) ?? weeklyPlan[0];
  const currentWeekStart = weekStartFor(isoDate(new Date()));
  const currentWeekPlan = weeklyPlan.filter((day) => day.date >= currentWeekStart && day.date < addIsoDays(currentWeekStart, 7));
  const viewedWeekStart = addIsoDays(currentWeekStart, planningWeekOffset * 7);
  const viewedWeekPlan = weeklyPlan.filter((day) => day.date >= viewedWeekStart && day.date < addIsoDays(viewedWeekStart, 7));
  const selectPlanDay = (day: PlanDay) => {
    setSelectedPlanDayId(day.id);
    setPlanningWeekOffset(day.date >= addIsoDays(currentWeekStart, 7) ? 1 : 0);
  };
  const showPlanningWeek = (offset: 0 | 1) => {
    const start = addIsoDays(currentWeekStart, offset * 7);
    const days = weeklyPlan.filter((day) => day.date >= start && day.date < addIsoDays(start, 7));
    const weekdayIndex = (dateAtNoon(selectedPlanDay.date).getDay() + 6) % 7;
    setPlanningWeekOffset(offset);
    setSelectedPlanDayId(days[weekdayIndex]?.id ?? days[0]?.id ?? selectedPlanDayId);
  };
  const weightUnit = profile.units === "metric" ? "kg" : "lb";
  const bodyWeightUnit = profile.bodyWeightUnit;
  const distanceUnit = profile.distanceUnit;
  const displayWeight = (pounds: number | string) => { const value = Number.parseFloat(String(pounds)); return Number.isFinite(value) ? (profile.units === "metric" ? value * 0.453592 : value) : 0; };
  const displayBodyWeight = (pounds: number | string) => { const value = Number.parseFloat(String(pounds)); return Number.isFinite(value) ? (bodyWeightUnit === "kg" ? value * 0.453592 : value) : 0; };
  const displayDistance = (kilometres: number | string) => { const value = Number.parseFloat(String(kilometres)); return Number.isFinite(value) ? (distanceUnit === "km" ? value : value * 0.621371) : 0; };
  const storeWeight = (value: string) => value === "" ? "" : String(profile.units === "metric" ? Math.round((Number.parseFloat(value) / 0.453592) * 100) / 100 : Number.parseFloat(value));
  const storeBodyWeight = (value: string) => value === "" ? "" : String(bodyWeightUnit === "kg" ? Math.round((Number.parseFloat(value) / 0.453592) * 100) / 100 : Number.parseFloat(value));
  const storeDistance = (value: string) => value === "" ? "" : String(distanceUnit === "km" ? Number.parseFloat(value) : Math.round((Number.parseFloat(value) / 0.621371) * 100) / 100);
  const bodyWeightCheckIns = [...checkIns].filter((entry) => Number.parseFloat(entry.weight) > 0).sort((left, right) => right.date.localeCompare(left.date));
  const latestBodyWeight = bodyWeightCheckIns[0] ? displayBodyWeight(bodyWeightCheckIns[0].weight) : null;
  const bodyWeightChange = bodyWeightCheckIns.length > 1 && latestBodyWeight !== null ? latestBodyWeight - displayBodyWeight(bodyWeightCheckIns.at(-1)!.weight) : null;
  const recordedSets = history.reduce((total, workout) => total + sessionSetCount(workout), 0);
  const recordedVolume = history.reduce((total, workout) => total + sessionTonnage(workout), 0);
  const todayPlan = weeklyPlan.find((item) => item.date === isoDate(new Date())) ?? weeklyPlan[0];
  const todayActivities = activities.filter((item) => item.date === todayPlan.date);
  const todayCompletedWorkout = history.find((item) => isoDate(new Date(workoutRecordDate(item) || 0)) === todayPlan.date);
  const todayPlanCompleted = todayPlan.status === "completed";
  const upNextPlan = [...weeklyPlan].filter((day) => day.date > todayPlan.date && day.status !== "completed" && day.status !== "skipped").sort((left, right) => left.date.localeCompare(right.date))[0];
  const latestWorkout = [...history].sort((left, right) => new Date(workoutRecordDate(right)).getTime() - new Date(workoutRecordDate(left)).getTime())[0];
  const latestWorkoutTitle = latestWorkout?.sourceTitle ?? (latestWorkout?.planDayId ? weeklyPlan.find((day) => day.id === latestWorkout.planDayId)?.title : undefined) ?? (latestWorkout && isoDate(new Date(workoutRecordDate(latestWorkout))) === todayPlan.date ? todayPlan.title : undefined);
  const plannedWeekDays = currentWeekPlan.filter((day) => day.kind !== "rest" && day.kind !== "recovery");
  const completedWeekDays = plannedWeekDays.filter((day) => day.status === "completed").length;
  const weeklyPulseProgress = plannedWeekDays.length ? Math.round(completedWeekDays / plannedWeekDays.length * 100) : 0;
  const greetingHour = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hourCycle: "h23", timeZone: readNorthSession()?.user.timezone }).format(new Date()));
  const todayGreeting = greetingHour < 12 ? "Good morning," : greetingHour < 18 ? "Good afternoon," : greetingHour < 23 ? "Good evening," : "Still up?";
  const todayIntro = hasProgress && session.planDayId === todayPlan.id
    ? "You’re already underway."
    : todayPlan.status === "completed" || todayActivities.length
      ? "Today’s work is recorded."
      : todayPlan.kind === "rest"
        ? "A quieter day still counts."
        : todayPlan.kind === "recovery"
          ? "A lighter day can still move you forward."
          : todayPlan.sessions?.length
            ? `${todayPlan.title} and ${todayPlan.sessions.length} supporting ${todayPlan.sessions.length === 1 ? "session" : "sessions"} are ready when you are.`
            : `${todayPlan.title} is ready when you are.`;
  const selectedWorkout = useMemo(() => selectedPlanDay.kind === "strength" ? (selectedPlanDay.workout?.length ? selectedPlanDay.workout : starterExercises) : [], [selectedPlanDay.kind, selectedPlanDay.workout]);
  const selectedMuscleActivation = useMemo(() => combineMuscleActivations(selectedWorkout.map((exercise) => getMuscleActivation(exerciseLibrary.find((definition) => definition.name === exercise.name) ?? { name: exercise.name, category: "Full body" }))), [selectedWorkout]);
  const historyChronological = useMemo(() => [...history].sort((left, right) => new Date(workoutRecordDate(left)).getTime() - new Date(workoutRecordDate(right)).getTime()), [history]);
  const sessionNewRecords = session.exercises.flatMap((exercise) => {
    const currentBest = Math.max(0, ...exercise.sets.filter((set) => set.complete).map((set) => Number.parseFloat(set.weight) || 0));
    const performedTime = new Date(session.performedAt ?? session.startedAt ?? new Date()).getTime();
    const previousBest = Math.max(0, ...history.filter((workout) => new Date(workoutRecordDate(workout)).getTime() < performedTime).flatMap((workout) => workout.exercises.filter((item) => item.name.toLowerCase() === exercise.name.toLowerCase()).flatMap((item) => item.sets.filter((set) => set.complete).map((set) => Number.parseFloat(set.weight) || 0))));
    return currentBest > previousBest && previousBest > 0 ? [{ exercise: exercise.name, current: currentBest, previous: previousBest }] : [];
  });
  const historyByDate = history.reduce<Record<string, Session[]>>((map, item) => { const key = isoDate(new Date(workoutRecordDate(item) || 0)); (map[key] ??= []).push(item); return map; }, {});
  const historyMonthStart = new Date(historyCalendarMonth.getFullYear(), historyCalendarMonth.getMonth(), 1, 12);
  const historyGridStart = new Date(historyMonthStart);
  historyGridStart.setDate(1 - ((historyMonthStart.getDay() + 6) % 7));
  const historyCalendarDays = Array.from({ length: 42 }, (_, index) => { const date = new Date(historyGridStart); date.setDate(historyGridStart.getDate() + index); return date; });
  const historyCalendarSessions = historyByDate[historyCalendarDate] ?? [];
  const allTemplates = [...personalTemplates, ...workoutTemplates];
  const myWorkoutCount = new Set([...personalTemplates.map((template) => template.id), ...favoriteTemplateIds]).size;
  const filteredTemplates = allTemplates.filter((template) => {
    const query = templateSearch.trim().toLowerCase();
    const matchesSearch = !query || `${template.name} ${template.focus} ${template.goal} ${template.level} ${template.equipment.join(" ")} ${template.exercises.map((exercise) => exercise.exerciseName).join(" ")}`.toLowerCase().includes(query);
    const matchesSource = templateSource === "All" || templateSource === "personal" && (template.source === "personal" || favoriteTemplateIds.includes(template.id)) || templateSource === "recent" && recentTemplateIds.includes(template.id) || template.source === templateSource;
    return matchesSearch && matchesSource && (templateFocus === "All" || template.focus === templateFocus) && (templateGoal === "All" || template.goal === templateGoal) && (templateLevel === "All" || template.level === templateLevel) && (templateDuration === "All" || template.duration === Number(templateDuration));
  });
  const activeLibraryFilterCount = [templateFocus, templateGoal, templateLevel, templateDuration].filter((filter) => filter !== "All").length;
  const sortedTemplates = [...filteredTemplates].sort((left, right) => workoutLibrarySort === "shortest" ? estimatedWorkoutMinutes(left) - estimatedWorkoutMinutes(right) : workoutLibrarySort === "longest" ? estimatedWorkoutMinutes(right) - estimatedWorkoutMinutes(left) : workoutLibrarySort === "name" ? workoutDisplayName(left.name).localeCompare(workoutDisplayName(right.name)) : 0);
  const selectedTemplate = allTemplates.find((template) => template.id === selectedTemplateId) ?? workoutTemplates[0];
  const selectedTemplateIssues = [
    ...(!selectedTemplate.name.trim() ? ["Give this workout a name."] : []),
    ...(!selectedTemplate.exercises.length ? ["Add at least one exercise."] : []),
    ...(selectedTemplate.exercises.some((exercise) => !exerciseLibrary.some((definition) => definition.name === exercise.exerciseName)) ? ["Choose every movement from North's exercise library."] : []),
    ...(selectedTemplate.exercises.some((exercise) => exercise.sets < 1 || !exercise.reps.trim() || exercise.rest < 0) ? ["Check the sets, reps and rest prescriptions."] : []),
  ];
  const selectedProgram = programs.find((program) => program.id === selectedProgramId) ?? programs[0];
  const currentProgram = activeProgram ? programs.find((program) => program.id === activeProgram.programId) ?? null : null;
  const programCompletedThisWeek = activeProgram ? activeProgram.trainingDayIndexes.filter((index) => weeklyPlan[index]?.status === "completed").length : 0;
  const programAdherence = activeProgram ? Math.round((activeProgram.weekHistory.reduce((sum, week) => sum + week.completed, 0) + programCompletedThisWeek) / Math.max(1, activeProgram.weekHistory.reduce((sum, week) => sum + week.planned, 0) + activeProgram.daysPerWeek) * 100) : 0;
  const previousCelebrationHistory = session.finishedAt ? history.filter((workout) => workout.finishedAt !== session.finishedAt) : history;
  const prospectiveProgramCompleted = activeProgram && session.planDayId
    ? programCompletedThisWeek + (weeklyPlan.some((day, index) => day.id === session.planDayId && activeProgram.trainingDayIndexes.includes(index) && day.status !== "completed") ? 1 : 0)
    : programCompletedThisWeek;
  const sessionEarnedMoments = deriveEarnedMoments(
    previousCelebrationHistory,
    session.performedAt ?? session.finishedAt ?? new Date().toISOString(),
    Boolean(activeProgram && prospectiveProgramCompleted >= activeProgram.daysPerWeek),
  );
  const weekSessions = history.filter((workout) => {
    const date = isoDate(new Date(workoutRecordDate(workout) || 0));
    return date >= weeklyPlan[0].date && date <= weeklyPlan[6].date;
  });
  const weekActivities = activities.filter((activity) => activity.date >= weeklyPlan[0].date && activity.date <= weeklyPlan[6].date);
  const weekTrainingMinutes = weekSessions.reduce((total, workout) => total + (sessionMinutes(workout) ?? 0), 0) + weekActivities.reduce((total, activity) => total + (Number.parseFloat(activity.duration) || 0), 0);
  const lifetimeTrainingMinutes = history.reduce((total, workout) => total + (sessionMinutes(workout) ?? 0), 0) + activities.reduce((total, activity) => total + (Number.parseFloat(activity.duration) || 0), 0);
  const activityTotals = (kind: ActivityEntry["kind"]) => activities.filter((activity) => activity.kind === kind).reduce((total, activity) => ({ sessions: total.sessions + 1, distance: total.distance + (Number.parseFloat(activity.distance) || 0) }), { sessions: 0, distance: 0 });
  const bikeTotals = activityTotals("bike");
  const walkTotals = activityTotals("walk");
  const runTotals = activityTotals("run");
  const recoveryTotals = activityTotals("recovery");
  const weekTonnage = weekSessions.reduce((total, workout) => total + sessionTonnage(workout), 0);
  const weekReps = weekSessions.reduce((total, workout) => total + workout.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.complete).reduce((sum, set) => sum + (Number.parseFloat(set.reps) || 0), 0), 0);
  const weekDistance = weekActivities.reduce((total, activity) => total + (Number.parseFloat(activity.distance) || 0), 0);
  const muscleDistribution = (() => {
    const totals = new Map<string, number>();
    weekSessions.forEach((workout) => workout.exercises.forEach((exercise) => {
      const category = exerciseLibrary.find((item) => item.name.toLowerCase() === exercise.name.toLowerCase())?.category ?? "Other";
      totals.set(category, (totals.get(category) ?? 0) + exercise.sets.filter((set) => set.complete).length);
    }));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const weekDayMinutes = currentWeekPlan.map((day) => weekSessions.filter((workout) => isoDate(new Date(workoutRecordDate(workout) || 0)) === day.date).reduce((total, workout) => total + (sessionMinutes(workout) ?? 0), 0) + weekActivities.filter((activity) => activity.date === day.date).reduce((total, activity) => total + (Number.parseFloat(activity.duration) || 0), 0));
  const latestBodyweightKg = (Number.parseFloat(checkIns.find((entry) => Number.parseFloat(entry.weight) > 0)?.weight ?? "") || 0) * 0.453592;
  const estimatedWeekCalories = latestBodyweightKg ? Math.round(weekSessions.reduce((total, workout) => total + 6 * latestBodyweightKg * ((sessionMinutes(workout) ?? 0) / 60), 0) + weekActivities.reduce((total, activity) => {
    const met = activity.kind === "run" ? 8 : activity.kind === "bike" ? 6.8 : activity.kind === "walk" ? 3.5 : 2.5;
    return total + met * latestBodyweightKg * ((Number.parseFloat(activity.duration) || 0) / 60);
  }, 0)) : null;
  const meaningfulHealthActivities = healthActivities.filter((activity) => activity.kind === "workout" || activity.kind === "bike" || activity.kind === "run" ? activity.duration_minutes >= 10 : activity.kind === "walk" ? activity.duration_minutes >= 20 || activity.distance_metres >= 1500 : false);
  const timelineItems = [
    ...history.map((workout) => ({ id: `workout-${workout.finishedAt}`, type: "Workouts", date: workoutRecordDate(workout), title: workout.sourceTitle || workout.exercises.filter((exercise) => exercise.sets.some((set) => set.complete)).map((exercise) => exercise.name).slice(0, 3).join(" · ") || "Training session", summary: `${sessionSetCount(workout)} sets${sessionMinutes(workout) ? ` · ${sessionMinutes(workout)} minutes` : ""}${sessionTonnage(workout) ? ` · ${Math.round(displayWeight(sessionTonnage(workout))).toLocaleString()} ${weightUnit} volume` : ""}.${workout.addedLater && workout.recordedAt ? ` Added later on ${formatSessionDate(workout.recordedAt)}.` : ""} ${workout.reflection || "A completed workout preserved in North."}`, workout })),
    ...activities.map((activity) => ({ id: `activity-${activity.id}`, type: "Activities", date: `${activity.date}T12:00:00`, title: activity.kind === "bike" ? "Bike ride" : activity.kind === "walk" ? "Walk" : activity.kind === "run" ? "Run" : "Recovery", summary: `${activity.duration ? `${activity.duration} minutes` : "Duration not recorded"}${activity.distance ? ` · ${displayDistance(activity.distance).toFixed(1)} ${distanceUnit}` : ""} · Effort ${activity.effort}/5. ${activity.note}`, activity })),
    ...checkIns.map((entry) => ({ id: `checkin-${entry.id}`, type: "Check-ins", date: `${entry.date}T08:00:00`, title: "Daily check-in", summary: `Energy ${entry.energy}/5 · soreness ${entry.soreness}/5${entry.sleep ? ` · ${entry.sleep} hours sleep` : ""}${entry.weight ? ` · ${displayBodyWeight(entry.weight).toFixed(1)} ${bodyWeightUnit}` : ""}. ${entry.note}`, checkIn: entry })),
    ...weeklyReviews.map((review) => ({ id: `review-${review.id}`, type: "Reflections", date: review.createdAt, title: "Weekly reflection", summary: `${review.proud || "A week reviewed."}${review.learned ? ` Learned: ${review.learned}` : ""}${review.next ? ` Next: ${review.next}` : ""}`, review })),
    ...journeyPhotos.map((photo) => ({ id: `photo-${photo.id}`, type: "Photos", date: photo.createdAt, title: photo.caption || "Journey photo", summary: "Stored privately in this browser.", photo })),
    ...meaningfulHealthActivities.map((activity) => ({ id: `health-${activity.id}`, type: "Activities", date: activity.started_at, title: activity.title || (activity.kind === "bike" ? "Bike ride" : activity.kind === "run" ? "Run" : activity.kind === "walk" ? "Purposeful walk" : "Samsung Health workout"), summary: `${activity.duration_minutes} minutes${activity.distance_metres > 0 ? ` · ${displayDistance(activity.distance_metres / 1000).toFixed(1)} ${distanceUnit}` : ""} · Imported from Samsung Health.`, healthActivity: activity })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const journeyMomentIcon = (item: (typeof timelineItems)[number]) => {
    const activityKind = "activity" in item && item.activity ? item.activity.kind : "healthActivity" in item && item.healthActivity ? item.healthActivity.kind : null;
    if (activityKind === "bike") return <Bike size={16} />;
    if (activityKind === "walk" || activityKind === "run") return <Footprints size={16} />;
    if (activityKind === "recovery") return <HeartPulse size={16} />;
    if (activityKind === "workout" || item.type === "Workouts") return <Dumbbell size={16} />;
    if (item.type === "Check-ins") return <HeartPulse size={16} />;
    if (item.type === "Reflections") return <NotebookPen size={16} />;
    if (item.type === "Photos") return <Image size={16} />;
    return <Compass size={16} />;
  };
  const journeyMomentTone = (item: (typeof timelineItems)[number]) => {
    const activityKind = "activity" in item && item.activity ? item.activity.kind : "healthActivity" in item && item.healthActivity ? item.healthActivity.kind : null;
    if (activityKind === "bike") return "moment-bike";
    if (activityKind === "walk") return "moment-walk";
    if (activityKind === "run") return "moment-run";
    if (activityKind === "recovery") return "moment-recovery";
    if (activityKind === "workout" || item.type === "Workouts") return "moment-workout";
    return "moment-default";
  };
  const filteredTimeline = timelineItems
    .filter((item) => (timelineFilter === "All" || item.type === timelineFilter) && (!timelineDate || isoDate(new Date(item.date)) === timelineDate))
    .sort((left, right) => timelineSort === "newest" ? new Date(right.date).getTime() - new Date(left.date).getTime() : new Date(left.date).getTime() - new Date(right.date).getTime());
  const today = new Date();
  const thisDayMemoryIntervals = [
    { label: "ONE WEEK AGO", date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7) },
    { label: "ONE MONTH AGO", date: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()) },
    { label: "SIX MONTHS AGO", date: new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()) },
    { label: "ONE YEAR AGO", date: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()) },
  ];
  const thisDayItems = thisDayMemoryIntervals.flatMap((interval) => timelineItems.filter((item) => isoDate(new Date(item.date)) === isoDate(interval.date)).map((item) => ({ ...item, interval: interval.label })));
  const milestonePersonalRecordDates = (() => {
    const best = new Map<string, number>();
    const dates: string[] = [];
    historyChronological.forEach((workout) => workout.exercises.forEach((exercise) => exercise.sets.filter((set) => set.complete).forEach((set) => {
      const weight = Number.parseFloat(set.weight) || 0;
      const previous = best.get(exercise.name.toLowerCase()) ?? 0;
      if (weight > previous && previous > 0 && workoutRecordDate(workout)) dates.push(workoutRecordDate(workout));
      if (weight > previous) best.set(exercise.name.toLowerCase(), weight);
    })));
    return dates;
  })();
  const milestoneResults = (() => {
    const activeDates = [...new Set([...history.map((item) => isoDate(new Date(workoutRecordDate(item) || 0))), ...activities.map((item) => item.date), ...checkIns.map((item) => item.date)])].sort();
    const values: Record<MilestoneMetric, number> = {
      workouts: history.length,
      sets: history.reduce((total, workout) => total + sessionSetCount(workout), 0),
      volume: history.reduce((total, workout) => total + sessionTonnage(workout), 0),
      activities: activities.length,
      distance: activities.reduce((total, activity) => total + (Number.parseFloat(activity.distance) || 0), 0),
      checkIns: checkIns.length,
      reviews: weeklyReviews.length,
      personalRecords: milestonePersonalRecordDates.length,
      programWeeks: activeProgram?.weekHistory.filter((week) => week.completed >= week.planned).length ?? 0,
      activeDays: activeDates.length,
    };
    function cumulativeDate(metric: MilestoneMetric, target: number) {
      if (metric === "activeDays") return activeDates[target - 1] ? `${activeDates[target - 1]}T12:00:00` : null;
      if (metric === "workouts") return workoutRecordDate(historyChronological[target - 1]) || null;
      if (metric === "activities") return [...activities].reverse()[target - 1]?.date ? `${[...activities].reverse()[target - 1].date}T12:00:00` : null;
      if (metric === "checkIns") return [...checkIns].reverse()[target - 1]?.date ? `${[...checkIns].reverse()[target - 1].date}T08:00:00` : null;
      if (metric === "reviews") return [...weeklyReviews].reverse()[target - 1]?.createdAt ?? null;
      if (metric === "personalRecords") return milestonePersonalRecordDates[target - 1] ?? null;
      let total = 0;
      if (["sets", "volume"].includes(metric)) for (const workout of historyChronological) { total += metric === "sets" ? sessionSetCount(workout) : sessionTonnage(workout); if (total >= target) return workoutRecordDate(workout); }
      if (metric === "distance") for (const activity of [...activities].reverse()) { total += Number.parseFloat(activity.distance) || 0; if (total >= target) return `${activity.date}T12:00:00`; }
      return values[metric] >= target ? new Date().toISOString() : null;
    }
    return milestoneDefinitions.map((definition) => ({ ...definition, value: values[definition.metric], progress: Math.min(100, Math.round(values[definition.metric] / definition.target * 100)), unlocked: values[definition.metric] >= definition.target, achievedAt: values[definition.metric] >= definition.target ? cumulativeDate(definition.metric, definition.target) : null }));
  })();
  const unlockedMilestones = milestoneResults.filter((milestone) => milestone.unlocked).sort((a, b) => new Date(b.achievedAt ?? 0).getTime() - new Date(a.achievedAt ?? 0).getTime());
  const upcomingMilestones = milestoneResults.filter((milestone) => !milestone.unlocked).sort((a, b) => b.progress - a.progress);
  const chapterProgress = Array.from({ length: 10 }, (_, index) => {
    const chapter = index + 1;
    const milestones = milestoneResults.filter((milestone) => milestone.chapter === chapter);
    return { chapter, unlocked: milestones.filter((milestone) => milestone.unlocked).length, total: milestones.length };
  });
  const currentChapter = chapterProgress.find((chapter) => chapter.unlocked < chapter.total)?.chapter ?? 10;
  const selectedChapterMilestones = milestoneResults.filter((milestone) => milestone.chapter === selectedMilestoneChapter);
  const filteredChapterMilestones = selectedChapterMilestones.filter((milestone) => milestoneFilter === "All" || (milestoneFilter === "Completed" ? milestone.unlocked : milestone.category === milestoneFilter));
  const earnedIdentities = unlockedMilestones.filter((milestone) => milestone.identity).map((milestone) => milestone.identity as string);
  const exerciseProgress = useMemo(() => {
    const progress = new Map<string, { name: string; bestWeight: number; sets: number; sessions: Set<string> }>();
    history.forEach((workout) => workout.exercises.forEach((exercise) => {
      const canonical = canonicalExerciseFor(exercise);
      if (canonical && !canonical.trackingTemplateId.includes("weight")) return;
      const key = exercise.name.toLowerCase();
      const existing = progress.get(key) ?? { name: exercise.name, bestWeight: 0, sets: 0, sessions: new Set<string>() };
      exercise.sets.filter((set) => set.complete).forEach((set) => {
        existing.bestWeight = Math.max(existing.bestWeight, Number.parseFloat(set.weight) || 0);
        existing.sets += 1;
      });
      if (exercise.sets.some((set) => set.complete)) existing.sessions.add(workout.finishedAt ?? workout.startedAt ?? key);
      progress.set(key, existing);
    }));
    return [...progress.values()].sort((a, b) => b.sets - a.sets).slice(0, 5);
  }, [history]);
  const personalRecords = useMemo(() => {
    const best = new Map<string, number>();
    const records: Array<{ id: string; exerciseName: string; weight: number; previous: number; date: string }> = [];
    historyChronological.forEach((workout) => workout.exercises.forEach((exercise) => {
      const canonical = canonicalExerciseFor(exercise);
      if (canonical && !canonical.trackingTemplateId.includes("weight")) return;
      const key = exercise.name.toLowerCase();
      exercise.sets.filter((set) => set.complete).forEach((set) => {
        const weight = Number.parseFloat(set.weight) || 0;
        const previous = best.get(key) ?? 0;
        if (weight > previous && previous > 0) records.push({ id: `${workout.finishedAt}-${key}-${weight}`, exerciseName: exercise.name, weight, previous, date: workoutRecordDate(workout) });
        if (weight > previous) best.set(key, weight);
      });
    }));
    return records.reverse().slice(0, 30);
  }, [historyChronological]);
  const progressionSuggestions = useMemo<ProgressionSuggestion[]>(() => {
    const suggestions: ProgressionSuggestion[] = [];
    const latest = historyChronological.at(-1);
    if (latest) latest.exercises.forEach((exercise) => {
      const complete = exercise.sets.filter((set) => set.complete);
      const numericReps = complete.map((set) => Number.parseInt(set.reps, 10)).filter(Number.isFinite);
      const definition = exerciseLibrary.find((item) => item.name.toLowerCase() === exercise.name.toLowerCase());
      const maxWeight = Math.max(0, ...complete.map((set) => Number.parseFloat(set.weight) || 0));
      const priorWorkout = [...historyChronological].reverse().slice(1).find((workout) => workout.exercises.some((item) => item.name.toLowerCase() === exercise.name.toLowerCase()));
      const prior = priorWorkout?.exercises.find((item) => item.name.toLowerCase() === exercise.name.toLowerCase());
      const priorMax = Math.max(0, ...(prior?.sets.filter((set) => set.complete).map((set) => Number.parseFloat(set.weight) || 0) ?? [0]));
      if (complete.length === exercise.sets.length && numericReps.length === complete.length && priorMax > 0 && maxWeight >= priorMax && numericReps.every((reps) => reps >= 10)) {
        const lowerBody = ["Quads", "Hamstrings", "Glutes", "Calves", "Full body"].includes(definition?.category ?? "");
        const increment = lowerBody ? 5 : 2.5;
        const shownNext = profile.units === "metric" ? ((maxWeight + increment) * .453592).toFixed(1) : String(maxWeight + increment);
        const shownCurrent = profile.units === "metric" ? (maxWeight * .453592).toFixed(1) : String(maxWeight);
        const shownPrior = profile.units === "metric" ? (priorMax * .453592).toFixed(1) : String(priorMax);
        suggestions.push({ id: `load-${exercise.name}`, exerciseName: exercise.name, kind: "load", title: `A small ${exercise.name} progression may be ready`, recommendation: `Try ${shownNext} ${profile.units === "metric" ? "kg" : "lb"} on the first working set, then keep it only if technique and effort remain controlled.`, evidence: `The latest session completed every planned set at ${shownCurrent} ${profile.units === "metric" ? "kg" : "lb"} with at least 10 recorded reps per set. The prior recorded maximum was ${shownPrior} ${profile.units === "metric" ? "kg" : "lb"}.`, nextWeight: String(maxWeight + increment) });
      } else if (complete.length === exercise.sets.length && numericReps.length === complete.length && priorMax > 0) {
        const currentLow = Number.parseInt(exercise.target.match(/(\d+)\s*[–-]/)?.[1] ?? "8", 10);
        const nextLow = Math.min(currentLow + 1, 20);
        const nextTarget = exercise.target.replace(/\d+\s*([–-])/, `${nextLow}$1`);
        suggestions.push({ id: `reps-${exercise.name}`, exerciseName: exercise.name, kind: "reps", title: `Build repetitions before load on ${exercise.name}`, recommendation: `Keep ${profile.units === "metric" ? ((maxWeight || priorMax) * .453592).toFixed(1) : maxWeight || priorMax} ${profile.units === "metric" ? "kg" : "lb"} and aim for one additional controlled repetition on the first set.`, evidence: `Every planned set was completed, but the saved repetitions do not yet support a load increase under North's conservative rule.`, nextTarget });
      } else if (complete.length < exercise.sets.length && definition?.substitutions[0]) {
        suggestions.push({ id: `sub-${exercise.name}`, exerciseName: exercise.name, kind: "substitution", title: `Keep a substitute ready for ${exercise.name}`, recommendation: `${definition.substitutions[0]} uses a similar ${definition.movementPattern.toLowerCase()} pattern. Use it only if equipment or comfort blocked the original movement.`, evidence: `${complete.length} of ${exercise.sets.length} sets were completed in the latest record. North cannot tell whether equipment, time, discomfort, or another reason caused that.`, substitution: definition.substitutions[0] });
      }
      if (latest.difficulty >= 4 && exercise.rest < 180 && complete.length > 0) suggestions.push({ id: `rest-${exercise.name}`, exerciseName: exercise.name, kind: "rest", title: `More rest may protect ${exercise.name} quality`, recommendation: `Try ${exercise.rest + 15} seconds between working sets and judge whether technique becomes more repeatable.`, evidence: `The latest workout was rated ${latest.difficulty}/5 difficulty. North is suggesting a small rest change, not assuming the exercise itself caused the rating.`, nextRest: exercise.rest + 15 });
    });
    const recent = [...historyChronological].reverse().slice(0, 3);
    const lowEnergy = checkIns.slice(0, 3).filter((entry) => entry.energy <= 2).length;
    if (recent.length === 3 && recent.reduce((sum, workout) => sum + workout.difficulty, 0) / 3 >= 4 && lowEnergy >= 2) suggestions.unshift({ id: "recovery", exerciseName: "Whole program", kind: "recovery", title: "Consider a lower-stress week", recommendation: "Reduce working sets by roughly one third or keep loads steady without pushing repetitions. Reassess after several easier days.", evidence: `The last three workouts average ${(recent.reduce((sum, workout) => sum + workout.difficulty, 0) / 3).toFixed(1)}/5 difficulty, and ${lowEnergy} of the latest three check-ins report energy at 2/5 or lower.` });
    return suggestions.slice(0, 12);
  }, [checkIns, historyChronological, profile.units]);
  const fourWeekTrends = (() => {
    const anchor = new Date(`${weeklyPlan[0].date}T00:00:00`);
    return [3, 2, 1, 0].map((weeksAgo) => {
      const start = new Date(anchor); start.setDate(anchor.getDate() - weeksAgo * 7);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      const startDate = isoDate(start); const endDate = isoDate(end);
      const workouts = history.filter((item) => { const date = isoDate(new Date(workoutRecordDate(item) || 0)); return date >= startDate && date <= endDate; });
      const movement = activities.filter((item) => item.date >= startDate && item.date <= endDate);
      return { label: new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }).format(start), startDate, workouts: workouts.length, sets: workouts.reduce((sum, item) => sum + sessionSetCount(item), 0), minutes: workouts.reduce((sum, item) => sum + (sessionMinutes(item) ?? 0), 0) + movement.reduce((sum, item) => sum + (Number.parseFloat(item.duration) || 0), 0), volume: workouts.reduce((sum, item) => sum + sessionTonnage(item), 0), distance: movement.reduce((sum, item) => sum + (Number.parseFloat(item.distance) || 0), 0) };
    });
  })();
  const fourWeekMuscleDistribution = (() => {
    const totals = new Map<string, number>();
    history.filter((workout) => isoDate(new Date(workoutRecordDate(workout) || 0)) >= fourWeekTrends[0].startDate).forEach((workout) => workout.exercises.forEach((exercise) => {
      const category = exerciseLibrary.find((item) => item.name.toLowerCase() === exercise.name.toLowerCase())?.category ?? "Other";
      totals.set(category, (totals.get(category) ?? 0) + exercise.sets.filter((set) => set.complete).length);
    }));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const exerciseTrends = (() => {
    const movements = new Map<string, { name: string; points: Array<{ date: string; volume: number; estimatedMax: number }> }>();
    [...history].reverse().forEach((workout) => workout.exercises.forEach((exercise) => {
      const canonical = canonicalExerciseFor(exercise);
      if (canonical && !canonical.trackingTemplateId.includes("weight")) return;
      const complete = exercise.sets.filter((set) => set.complete);
      if (!complete.length) return;
      const key = exercise.name.toLowerCase();
      const item = movements.get(key) ?? { name: exercise.name, points: [] };
      item.points.push({ date: workoutRecordDate(workout), volume: complete.reduce((sum, set) => sum + (Number.parseFloat(set.weight) || 0) * (Number.parseFloat(set.reps) || 0), 0), estimatedMax: Math.max(...complete.map((set) => { const weight = Number.parseFloat(set.weight) || 0; const reps = Number.parseFloat(set.reps) || 0; return Math.round(weight * (1 + reps / 30)); })) });
      movements.set(key, item);
    }));
    return [...movements.values()].filter((item) => item.points.length >= 2).map((item) => ({ ...item, change: item.points[item.points.length - 1].estimatedMax - item.points[0].estimatedMax, volumeChange: item.points[item.points.length - 1].volume - item.points[0].volume })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 6);
  })();
  const activityTrends = activities.filter((item) => Number.parseFloat(item.duration) > 0 && Number.parseFloat(item.distance) > 0).slice(0, 8).map((item) => ({ ...item, pace: item.kind === "bike" ? Number.parseFloat(item.distance) / (Number.parseFloat(item.duration) / 60) : Number.parseFloat(item.duration) / Number.parseFloat(item.distance) }));
  const recoveryPairs = checkIns.flatMap((entry) => history.filter((workout) => isoDate(new Date(workoutRecordDate(workout) || 0)) === entry.date).map((workout) => ({ energy: entry.energy, soreness: entry.soreness, difficulty: workout.difficulty })));
  const recoveryComparison = recoveryPairs.length >= 3 ? (() => {
    const lowerEnergy = recoveryPairs.filter((pair) => pair.energy <= 2);
    const higherEnergy = recoveryPairs.filter((pair) => pair.energy >= 4);
    return { count: recoveryPairs.length, lowDifficulty: lowerEnergy.length ? lowerEnergy.reduce((sum, pair) => sum + pair.difficulty, 0) / lowerEnergy.length : null, highDifficulty: higherEnergy.length ? higherEnergy.reduce((sum, pair) => sum + pair.difficulty, 0) / higherEnergy.length : null };
  })() : null;
  const learnedInsights = useMemo(() => {
    const insights: Array<{ id: string; icon: string; title: string; summary: string; evidence: string; novaPrompt: string }> = [];
    const rides = activities.filter((item) => item.kind === "bike");
    if (rides.length >= 2) {
      const distance = rides.reduce((total, item) => total + (Number.parseFloat(item.distance) || 0), 0);
      const shownDistance = profile.units === "metric" ? distance : distance * .621371;
      const shownDistanceUnit = profile.units === "metric" ? "km" : "mi";
      const averageEffort = rides.reduce((total, item) => total + item.effort, 0) / rides.length;
      insights.push({ id: "cycling", icon: "🚴", title: "Cycling is part of your rhythm", summary: `${rides.length} rides · ${shownDistance.toFixed(1)} ${shownDistanceUnit} recorded`, evidence: `North has ${rides.length} cycling entries totalling ${shownDistance.toFixed(1)} ${shownDistanceUnit}. Their average reported effort is ${averageEffort.toFixed(1)}/5. That is enough to recognize a pattern, but not yet enough to judge its effect on recovery.`, novaPrompt: `You’ve logged ${rides.length} rides so far. How are your legs feeling after the latest one?` });
    }
    if (history.length >= 2) {
      const days = new Map<string, number>();
      history.forEach((item) => {
        if (!workoutRecordDate(item)) return;
        const day = new Intl.DateTimeFormat("en-CA", { weekday: "long" }).format(new Date(workoutRecordDate(item)));
        days.set(day, (days.get(day) ?? 0) + 1);
      });
      const commonDay = [...days.entries()].sort((a, b) => b[1] - a[1])[0];
      insights.push({ id: "showing-up", icon: "🧭", title: "You are building a record of showing up", summary: `${history.length} workouts · ${history.reduce((total, item) => total + sessionSetCount(item), 0)} completed sets`, evidence: `This comes from ${history.length} saved workouts, not a streak or attendance score.${commonDay ? ` ${commonDay[0]} is currently your most frequently recorded training day, with ${commonDay[1]} sessions.` : ""}`, novaPrompt: `You’ve now preserved ${history.length} workouts in North. What feels different compared with keeping them in Notes?` });
    }
    if (exerciseProgress.length && exerciseProgress[0].sessions.size >= 2) {
      const movement = exerciseProgress[0];
      insights.push({ id: "movement", icon: "💪", title: `${movement.name} keeps returning`, summary: `${movement.sets} sets across ${movement.sessions.size} sessions`, evidence: `North sees ${movement.name} in ${movement.sessions.size} completed sessions. The best recorded load is ${movement.bestWeight ? `${profile.units === "metric" ? (movement.bestWeight * .453592).toFixed(1) : movement.bestWeight} ${profile.units === "metric" ? "kg" : "lb"}` : "not available yet"}. This describes frequency and load only—not technique or readiness.`, novaPrompt: `${movement.name} is your most frequently logged movement so far. Does that match what you want to prioritize?` });
    }
    if (checkIns.length >= 3) {
      const averageEnergy = checkIns.reduce((total, item) => total + item.energy, 0) / checkIns.length;
      const averageSoreness = checkIns.reduce((total, item) => total + item.soreness, 0) / checkIns.length;
      insights.push({ id: "recovery", icon: "🌙", title: "You are giving recovery a voice", summary: `${checkIns.length} check-ins · energy averaging ${averageEnergy.toFixed(1)}/5`, evidence: `Across ${checkIns.length} check-ins, energy averages ${averageEnergy.toFixed(1)}/5 and soreness ${averageSoreness.toFixed(1)}/5. North will not infer a cause from those values without more context.`, novaPrompt: `Your recent check-ins average ${averageEnergy.toFixed(1)}/5 for energy. Is there anything outside training affecting that?` });
    }
    const completedDays = weeklyPlan.filter((item) => item.status === "completed").length;
    if (completedDays >= 2) insights.push({ id: "plan", icon: "📍", title: "The plan is becoming real", summary: `${completedDays} planned days completed this week`, evidence: `${completedDays} days in the current seven-day plan have matching completed records. Skipped and rest days are not treated as failures.`, novaPrompt: `${completedDays} planned days are complete this week. Does the rhythm feel sustainable?` });
    if (!insights.length) insights.push({ id: "learning", icon: "🧭", title: "North is still learning", summary: "Complete and reflect before patterns become claims", evidence: "North needs repeated observations before it describes a pattern. A single workout, ride, or difficult morning should not become an identity.", novaPrompt: "We’re still building context together. What would be useful for North to understand first?" });
    return insights;
  }, [activities, checkIns, exerciseProgress, history, profile.units, weeklyPlan]);
  const visibleLearnedInsights = profile.memoryEnabled ? learnedInsights.filter((insight) => !profile.dismissedInsights.includes(insight.id)) : [];

  function previousCompletedSets(exercise: Exercise, before = session.performedAt ?? new Date().toISOString()) {
    const beforeTime = new Date(before).getTime();
    for (const workout of [...historyChronological].reverse()) {
      if (new Date(workoutRecordDate(workout)).getTime() >= beforeTime) continue;
      const match = workout.exercises.find((item) => item.name.toLowerCase() === exercise.name.toLowerCase());
      const completed = match?.sets.filter((set) => set.complete) ?? [];
      if (completed.length) return completed;
    }
    return [];
  }

  function prefillFromPreviousPerformance(exercise: Exercise): Exercise {
    const previousSets = previousCompletedSets(exercise);
    if (!previousSets.length) return exercise;
    return {
      ...exercise,
      sets: exercise.sets.map((set, index) => {
        const previous = previousSets[index] ?? previousSets.at(-1);
        if (!previous) return set;
        return {
          ...set,
          weight: previous.weight || set.weight,
          reps: previous.reps || set.reps,
          values: { ...(set.values ?? {}), ...(previous.values ?? {}), weight: previous.values?.weight ?? previous.weight ?? set.values?.weight ?? set.weight, reps: previous.values?.reps ?? previous.reps ?? set.values?.reps ?? set.reps },
          units: { ...(set.units ?? {}), ...(previous.units ?? {}) },
          complete: false,
        };
      }),
    };
  }

  function previousSetDelta(exercise: Exercise, set: SetResult, setIndex: number, before?: string) {
    const previous = previousCompletedSets(exercise, before)[setIndex];
    if (!previous) return "First recorded set";
    const currentWeight = Number.parseFloat(String(set.values?.weight ?? set.weight));
    const priorWeight = Number.parseFloat(String(previous.values?.weight ?? previous.weight));
    const currentReps = Number.parseFloat(String(set.values?.reps ?? set.reps));
    const priorReps = Number.parseFloat(String(previous.values?.reps ?? previous.reps));
    const changes: string[] = [];
    if (Number.isFinite(currentWeight) && Number.isFinite(priorWeight) && currentWeight !== priorWeight) {
      const difference = displayWeight(currentWeight - priorWeight);
      changes.push(`${difference > 0 ? "+" : ""}${difference.toFixed(1).replace(/\.0$/, "")} ${weightUnit}`);
    }
    if (Number.isFinite(currentReps) && Number.isFinite(priorReps) && currentReps !== priorReps) {
      const difference = currentReps - priorReps;
      changes.push(`${difference > 0 ? "+" : ""}${difference} reps`);
    }
    return changes.length ? changes.join(" · ") : "Matched last time";
  }

  function previousPerformance(exercise: Exercise) {
    const before = new Date(session.performedAt ?? new Date()).getTime();
    for (const workout of [...historyChronological].reverse().filter((item) => new Date(workoutRecordDate(item)).getTime() < before)) {
      const match = workout.exercises.find((item) => item.name.toLowerCase() === exercise.name.toLowerCase());
      if (!match) continue;
      const canonical = canonicalExerciseFor(match);
      if (canonical) {
        const normalizedResults = match.sets.filter((set) => set.complete).map((set) => summarizeTrackingSet(canonical, set, defaultUnitPreferences(profile.units === "metric")));
        if (normalizedResults.length) return normalizedResults.join(" · ");
      }
      const results = match.sets.filter((set) => set.complete).map((set) => `${set.weight ? displayWeight(set.weight).toFixed(1) : "—"} ${weightUnit} × ${set.reps || "—"}`);
      if (results.length) return results.join(" · ");
    }
    return exercise.previous.replace(/([\d.]+) lb/g, (_, value: string) => `${displayWeight(value).toFixed(1)} ${weightUnit}`);
  }

  function previousSetPerformance(exercise: Exercise, setIndex: number) {
    const before = new Date(session.performedAt ?? new Date()).getTime();
    for (const workout of [...historyChronological].reverse().filter((item) => new Date(workoutRecordDate(item)).getTime() < before)) {
      const match = workout.exercises.find((item) => item.name.toLowerCase() === exercise.name.toLowerCase());
      const set = match?.sets.filter((item) => item.complete)[setIndex];
      const canonical = match ? canonicalExerciseFor(match) : undefined;
      if (set && canonical) return summarizeTrackingSet(canonical, set, defaultUnitPreferences(profile.units === "metric"));
      if (set) return `${set.weight ? `${displayWeight(set.weight).toFixed(1)} ${weightUnit}` : "—"} × ${set.reps || "—"}`;
    }
    return "No previous set";
  }

  function patchExercise(id: string, patch: Partial<Exercise>) {
    setSession((value) => ({
      ...value,
      exercises: value.exercises.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function beginWorkout() {
    if (!session.exercises.length) { setRecorderStatus("Add at least one exercise before starting this workout."); return; }
    const exercises = session.exercises.map(prefillFromPreviousPerformance);
    if (session.planDayId) setWeeklyPlan((days) => days.map((day) => day.id === session.planDayId ? { ...day, workout: resetExercises(exercises) } : day));
    setSession((value) => ({ ...value, exercises, startedAt: value.startedAt ?? new Date().toISOString() }));
    setRecorderStatus("Workout started. Every entry saves automatically.");
    setScreen("workout");
  }

  function leavePreparation() {
    if (session.planDayId) {
      const nextPlan = weeklyPlan.map((day) => day.id === session.planDayId ? { ...day, workout: resetExercises(session.exercises) } : day);
      setWeeklyPlan(nextPlan);
      setPlanSaveStatus(navigator.onLine ? "Saving to your North account…" : "Saved offline · syncs when connected");
      void persistAccountJson(PLAN_KEY, "week-plan", nextPlan).then(() => { if (navigator.onLine && readNorthSession()) void runAccountSync(); });
    }
    setScreen(session.addedLater ? "journey" : "training");
  }

  async function savePreparedWorkout() {
    setRecorderStatus(navigator.onLine ? "Saving this workout to your North account…" : "Workout saved offline. It will sync when connected.");
    await persistAccountJson(STORAGE_KEY, "active-session", session, true);
    if (session.planDayId) {
      const nextPlan = weeklyPlan.map((day) => day.id === session.planDayId ? { ...day, workout: resetExercises(session.exercises) } : day);
      setWeeklyPlan(nextPlan);
      await persistAccountJson(PLAN_KEY, "week-plan", nextPlan, true);
    }
    if (navigator.onLine && readNorthSession()) { await runAccountSync(); setRecorderStatus("Workout saved to your North account. You can continue on another device."); }
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= session.exercises.length) return;
    setSession((value) => {
      const exercises = [...value.exercises];
      [exercises[index], exercises[next]] = [exercises[next], exercises[index]];
      return { ...value, exercises };
    });
  }

  function addExercise(template: ExerciseDefinition) {
    setSession((value) => ({ ...value, exercises: [...value.exercises, buildExercise(template)] }));
    setExerciseSearch("");
  }

  function addCustomExercise() {
    const name = customName.trim();
    if (!name) return;
    addExercise({
      name,
      category: "Custom",
      equipment: "Other",
      aliases: [],
      weight: "",
      target: "3 sets · 8–12 reps",
      rest: 75,
      previous: "First time",
      cue: "Move with control and leave a clean rep in reserve while you learn the movement.",
      locations: ["Anywhere"],
      difficulty: "Beginner",
      movementPattern: "Custom",
      substitutions: [],
      safetyNote: "Use a controlled range you can own and stop for sharp pain or a sudden loss of control.",
    });
    setCustomName("");
  }

  function removeExercise(id: string) {
    if (session.exercises.length === 1) return;
    setSession((value) => {
      const exercises = value.exercises.filter((item) => item.id !== id);
      return { ...value, exercises, currentId: value.currentId === id ? exercises[0].id : value.currentId };
    });
  }

  function substituteExercise(id: string, replacementName: string) {
    const cleanReplacementName = replacementName.split(" — ")[0];
    const canonicalReplacement = canonicalExerciseFor(cleanReplacementName);
    const definition = exerciseLibrary.find((item) => item.name === cleanReplacementName) ?? (canonicalReplacement ? toLegacyExerciseDefinition(canonicalReplacement) : undefined);
    if (!definition) return;
    setSession((value) => ({
      ...value,
      exercises: value.exercises.map((item) => item.id === id ? { ...buildExercise(definition, id), note: item.note } : item),
      currentId: value.currentId === id ? id : value.currentId,
    }));
  }

  function substitutionsFor(name: string) {
    const canonical = canonicalExerciseFor(name);
    if (canonical) {
      const structured = canonical.relationships.filter((item) => item.type === "substitution").sort((a, b) => a.priority - b.priority).map((item) => { const name = productionExerciseLibrary.find((candidate) => candidate.id === item.toExerciseId)?.displayName; return name ? `${name} — ${item.reason}` : undefined; }).filter((item): item is string => Boolean(item));
      if (structured.length) return structured;
      const inferred = productionExerciseLibrary.map((candidate) => ({ candidate, reasons: swapReasons(canonical, candidate) })).filter((item) => item.candidate.id !== canonical.id && item.reasons.length >= 2).sort((a, b) => b.reasons.length - a.reasons.length).slice(0, 6).map((item) => `${item.candidate.displayName} — ${item.reasons.join(", ")}`);
      if (inferred.length) return inferred;
    }
    return exerciseLibrary.find((item) => item.name === name)?.substitutions ?? [];
  }

  function resizeExerciseSets(id: string, requestedCount: number) {
    const count = Math.min(10, Math.max(1, requestedCount || 1));
    setSession((value) => ({
      ...value,
      exercises: value.exercises.map((item) => {
        if (item.id !== id) return item;
        const fallbackWeight = item.sets[0]?.weight ?? "";
        const sets = Array.from({ length: count }, (_, index) =>
          item.sets[index] ?? { weight: fallbackWeight, reps: prescribedResult(item.target), complete: false },
        );
        return { ...item, sets };
      }),
    }));
  }

  function updatePlannedLoad(id: string, weight: string) {
    setSession((value) => ({
      ...value,
      exercises: value.exercises.map((item) =>
        item.id === id
          ? { ...item, sets: item.sets.map((set) => (set.complete ? set : { ...set, weight })) }
          : item,
      ),
    }));
  }

  function chooseNext(afterId: string) {
    const remaining = session.exercises.filter(
      (item) => item.id !== afterId && !item.passed && !item.sets.every((set) => set.complete),
    );
    const queued = session.exercises.filter(
      (item) => item.id !== afterId && item.passed && !item.sets.every((set) => set.complete),
    );
    const next = remaining[0] ?? queued[0];
    if (next) setSession((value) => ({ ...value, currentId: next.id }));
    else setScreen("review");
  }

  function passCurrent() {
    patchExercise(current.id, { passed: true });
    chooseNext(current.id);
  }

  function returnTo(id: string) {
    patchExercise(id, { passed: false });
    setSession((value) => ({ ...value, currentId: id }));
  }

  function updateSet(setIndex: number, patch: Partial<SetResult>) {
    const sets = current.sets.map((set, index) => {
      if (index !== setIndex) return set;
      const values = { ...(set.values ?? {}), ...(patch.values ?? {}) };
      if (patch.weight !== undefined) values.weight = patch.weight;
      if (patch.reps !== undefined) values.reps = patch.reps;
      return { ...set, ...patch, ...(Object.keys(values).length ? { values } : {}) };
    });
    patchExercise(current.id, { sets });
    if (patch.complete) {
      setTimer(current.rest);
      setTimerRunning(true);
      setRecorderStatus(`Set ${setIndex + 1} saved. Rest timer started.`);
      navigator.vibrate?.(45);
    }
  }

  function addWorkingSet() {
    const previous = current.sets.at(-1) ?? { weight: "", reps: prescribedResult(current.target), complete: false };
    patchExercise(current.id, { sets: [...current.sets, { weight: previous.weight, reps: previous.reps || prescribedResult(current.target), complete: false }] });
  }

  function removeLastWorkingSet() {
    if (current.sets.length <= 1) return;
    patchExercise(current.id, { sets: current.sets.slice(0, -1) });
  }

  function adjustWorkingSet(setIndex: number, field: "weight" | "reps", direction: -1 | 1) {
    const set = current.sets[setIndex];
    if (field === "weight") {
      const step = profile.units === "metric" ? 2.5 : 5;
      updateSet(setIndex, { weight: storeWeight(String(Math.max(0, displayWeight(set.weight) + step * direction))) });
    } else {
      const shown = Number.parseInt(set.reps, 10) || 0;
      updateSet(setIndex, { reps: String(Math.max(0, shown + direction)) });
    }
  }

  function completeNextSet() {
    const index = current.sets.findIndex((set) => !set.complete);
    if (index >= 0) updateSet(index, { complete: true });
  }

  function finishExercise() {
    patchExercise(current.id, { passed: false });
    setRecorderStatus(`${current.name} saved with ${current.sets.filter((set) => set.complete).length} completed sets.`);
    chooseNext(current.id);
  }

  function saveReview() {
    const savedAt = new Date().toISOString();
    const finishedAt = session.addedLater && session.performedAt ? session.performedAt : savedAt;
    const finished = { ...session, finishedAt, recordedAt: session.recordedAt ?? savedAt };
    if (!profile.reducedMotion && "vibrate" in navigator) navigator.vibrate(sessionNewRecords.length || sessionEarnedMoments.length ? [55, 45, 90] : 55);
    const nextHistory = [finished, ...history];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    setHistory(nextHistory);
    setSession(finished);
    setNovaMessages((messages) => [...messages, { id: crypto.randomUUID(), role: "nova" as const, text: `${finished.addedLater ? `Backfilled workout preserved: performed ${formatSessionDate(finished.performedAt)}, entered ${formatSessionDate(finished.recordedAt)}. ` : "Workout submitted to North Records: "}${finished.exercises.filter((exercise) => exercise.sets.some((set) => set.complete)).length} exercises and ${sessionSetCount(finished)} completed sets. I can reference the performed date separately from the entry date when reviewing progress.`, createdAt: savedAt, evidence: finished.addedLater ? ["Performed date", "Record entry date", "Completed workout record"] : ["Completed workout record"] }].slice(-80));
    const workoutDate = isoDate(new Date(workoutRecordDate(finished) || savedAt));
    setWeeklyPlan((value) => value.map((day) => day.id === finished.planDayId || (!finished.planDayId && day.date === workoutDate && day.kind === "strength") ? { ...day, status: "completed" } : day));
  }

  function startFresh() {
    const fresh = initialSession();
    setSession(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setScreen("today");
  }

  async function changeNovaMemory(memory: NovaMemory, input: { status?: NovaMemory["status"]; influenceEnabled?: boolean }) {
    try { const updated = await updateNovaMemory(memory.id, input); setNovaMemories((items) => items.map((item) => item.id === updated.id ? updated : item)); }
    catch (error) { setNovaError(error instanceof Error ? error.message : "That memory could not be updated."); }
  }

  async function rejectApiProposal(message: NovaMessage) {
    if (!message.apiProposal) return;
    try { await rejectNovaProposal(message.apiProposal.id); setNovaMessages((items) => items.map((item) => item.id === message.id ? { ...item, apiProposal: undefined } : item)); }
    catch (error) { setNovaError(error instanceof Error ? error.message : "The proposal could not be rejected."); }
  }

  async function applyApiProposal(message: NovaMessage) {
    const proposal = message.apiProposal;if (!proposal) return;setNovaError("");
    try {
      const approved = await approveNovaProposal(proposal.id);const payload = approved.payload;let targetCollection = "";let targetKey = "";
      if (approved.action_type === "create_goal") {
        const goal = await createNovaGoal({ title: String(payload.title ?? approved.summary), description: String(payload.description ?? approved.reason), category: String(payload.category ?? "direction"), priority: Number(payload.priority ?? 3), targetDate: payload.targetDate ? String(payload.targetDate) : null, sourceProposalId: proposal.id });
        setNovaGoals((items) => [goal, ...items]);targetCollection = "nova-goals";targetKey = goal.id;
      } else if (approved.action_type === "update_goal") {
        const existing = novaGoals.find((goal) => goal.id === String(payload.goalId));if (!existing) throw new Error("That goal is no longer available.");
        const goal = await updateNovaGoal(existing.id, { title: String(payload.title), description: String(payload.description ?? existing.description), category: String(payload.category ?? existing.category), priority: Number(payload.priority ?? existing.priority), status: (payload.status as NovaGoal["status"]) ?? existing.status, targetDate: payload.targetDate ? String(payload.targetDate) : existing.target_date });
        setNovaGoals((items) => items.map((item) => item.id === goal.id ? goal : item));targetCollection = "nova-goals";targetKey = goal.id;
      } else if (approved.action_type === "remember_context") {
        const memory = await createNovaMemory({ kind: String(payload.kind), label: String(payload.label), value: payload.value ?? null, status: "active", sourceType: "user_statement", confidence: 1, sourceProposalId: proposal.id });
        setNovaMemories((items) => [memory, ...items]);targetCollection = "nova-memory";targetKey = memory.id;
      } else if (approved.action_type === "add_check_in") {
        const entry: CheckInEntry = { id: `nova-${proposal.id}`, date: String(payload.date), weight: String(payload.weight ?? ""), sleep: String(payload.sleep ?? ""), energy: Number(payload.energy), soreness: Number(payload.soreness), note: String(payload.note ?? "Added with Nova") };
        setCheckIns((items) => [entry, ...items.filter((item) => item.id !== entry.id)]);targetCollection = "check-ins";targetKey = entry.id;
      } else if (approved.action_type === "add_reflection") {
        const entry: WeeklyReview = { id: `nova-${proposal.id}`, weekStart: String(payload.date), proud: String(payload.text), learned: String(payload.learned ?? ""), next: String(payload.next ?? ""), createdAt: new Date().toISOString() };
        setWeeklyReviews((items) => [entry, ...items.filter((item) => item.id !== entry.id)]);targetCollection = "reviews";targetKey = entry.id;
      } else {
        const date = approved.action_type === "adjust_plan_day" && /\btoday\b/i.test(approved.summary) ? todayPlan.date : String(payload.date);const exerciseIds = Array.isArray(payload.exerciseIds) ? payload.exerciseIds.map(String) : [];
        const idWorkout = exerciseIds.map((id) => productionExerciseLibrary.find((item) => item.id === id)).filter((item): item is CanonicalExercise => Boolean(item)).slice(0,12).map((item) => buildExercise(toLegacyExerciseDefinition(item)));
        const proposedExercises = payload.workout && typeof payload.workout === "object" && Array.isArray((payload.workout as { exercises?: unknown[] }).exercises) ? (payload.workout as { exercises: Array<{ name?: unknown; target?: unknown; rest?: unknown; sets?: unknown[] }> }).exercises : [];
        const detailedWorkout = proposedExercises.slice(0,12).map((planned, index) => {
          const name = String(planned.name ?? "");const canonical = canonicalExerciseFor(name);const definition = exerciseLibrary.find((item) => normalizeExerciseKey(item.name) === normalizeExerciseKey(name)) ?? (canonical ? toLegacyExerciseDefinition(canonical) : undefined);
          if (!definition) return null;
          const exercise = buildExercise(definition, `nova-${proposal.id}-${index}-${normalizeExerciseKey(name).replaceAll(" ", "-")}`);
          const plannedSets = Array.isArray(planned.sets) ? planned.sets.slice(0,20) : [];
          return { ...exercise, target: String(planned.target ?? exercise.target), rest: Number(planned.rest) || exercise.rest, sets: plannedSets.length ? plannedSets.map((set) => ({ ...exercise.sets[0], ...(set && typeof set === "object" ? set : {}), weight: String((set as { weight?: unknown })?.weight ?? ""), reps: String((set as { reps?: unknown })?.reps ?? ""), complete: false })) : exercise.sets };
        }).filter((item): item is Exercise => Boolean(item));
        const workout = detailedWorkout.length ? detailedWorkout : idWorkout;
        const sessions: PlannedSession[] = Array.isArray(payload.sessions) ? payload.sessions.slice(0, 4).map((session, index) => ({ id: `nova-${proposal.id}-${index}`, kind: session?.kind === "run" || session?.kind === "walk" || session?.kind === "recovery" ? session.kind : "bike", title: String(session?.title ?? "Planned activity"), role: session?.role === "warm-up" || session?.role === "recovery" || session?.role === "optional" ? session.role : "secondary", duration: String(session?.duration ?? ""), distance: String(session?.distance ?? ""), note: String(session?.note ?? "Planned with Nova"), status: "planned" })) : [];
        setWeeklyPlan((days) => days.map((day) => day.date === date ? { ...day, kind: "strength", title: String(payload.title), note: String(payload.note ?? day.note ?? "Planned with Nova"), status: "planned", workout: workout.length ? workout : day.workout ?? resetExercises(starterExercises), sessions: sessions.length ? [...(day.sessions ?? []), ...sessions] : day.sessions } : day));setSelectedPlanDayId(date);targetCollection = "week-plan";targetKey = date;
        const saveToMyWorkouts = payload.saveToMyWorkouts === true || /\bmy workouts\b|\bsaved and scheduled\b|\bsave(?:d)?\b.{0,40}\bworkout\b/i.test(`${approved.summary} ${approved.reason}`);
        if (saveToMyWorkouts) {
          const templateId = `personal-nova-${proposal.id}`;
          const template: WorkoutTemplate = {
            id: templateId,
            name: String(payload.title),
            description: String(payload.note ?? "Created with Nova."),
            focus: String(payload.focus ?? "Full body"),
            goal: ["Strength", "Muscle", "General fitness", "Conditioning", "Mobility"].includes(String(payload.goal)) ? String(payload.goal) as WorkoutTemplate["goal"] : "General fitness",
            level: ["Beginner", "Intermediate", "Advanced"].includes(String(payload.level)) ? String(payload.level) as WorkoutTemplate["level"] : "Intermediate",
            duration: Number(payload.duration) || plannedMinutes(workout),
            equipment: [...new Set(workout.map((exercise) => exerciseLibrary.find((definition) => definition.name === exercise.name)?.equipment).filter((item): item is string => Boolean(item) && item !== "None"))],
            location: payload.location === "Home" || payload.location === "Anywhere" ? payload.location : "Gym",
            exercises: workout.map((exercise) => ({ exerciseName: exercise.name, sets: exercise.sets.length, reps: exercise.target.replace(/^\d+\s+sets?\s+[^\p{L}\p{N}]*/iu, "").replace(/\s+reps?$/i, ""), rest: exercise.rest })),
            source: "personal",
          };
          if (!template.equipment.length) template.equipment = ["Any equipment"];
          const nextTemplates = [template, ...personalTemplates.filter((item) => item.id !== templateId)];
          setPersonalTemplates(nextTemplates);
          await persistAccountJson(PERSONAL_TEMPLATES_KEY, "personal-workouts", nextTemplates, true);
          targetCollection = "personal-workouts";targetKey = templateId;
        }
      }
      await recordNovaProposalApplied(proposal.id, { targetCollection, targetKey, receipt: { appliedAt: new Date().toISOString(), summary: approved.summary } });
      setNovaMessages((items) => items.map((item) => item.id === message.id ? { ...item, apiProposal: undefined, appliedAt: new Date().toISOString() } : item));
    } catch (error) { setNovaError(error instanceof Error ? error.message : "That change could not be applied."); }
  }

  async function forgetNovaMemory(memory: NovaMemory) {
    try { await deleteNovaMemory(memory.id); setNovaMemories((items) => items.filter((item) => item.id !== memory.id)); }
    catch (error) { setNovaError(error instanceof Error ? error.message : "That memory could not be removed."); }
  }

  function openNovaSetup() {
    setNovaSetupDraft({ locations: [], homeEquipment: [], gymAccess: "", preferredTime: "" });
    setNovaSetupOpen(true);
  }

  async function saveNovaSetup() {
    const { locations, homeEquipment, gymAccess, preferredTime } = novaSetupDraft;
    if (!locations.length && !homeEquipment.length && !gymAccess && !preferredTime) { setNovaSetupOpen(false); return; }
    setNovaSetupSaving(true); setNovaError("");
    try {
      const details = [locations.length ? `Trains at ${locations.join(" and ")}` : "", homeEquipment.length ? `Home equipment: ${homeEquipment.join(", ")}` : "", gymAccess ? `Gym access: ${gymAccess}` : "", preferredTime ? `Usually trains: ${preferredTime}` : ""].filter(Boolean);
      const memory = await createNovaMemory({ kind: "coaching", label: "Nova coaching setup", value: { locations, homeEquipment, gymAccess, preferredTime }, status: "active", sourceType: "user_statement", confidence: 1 });
      setNovaMemories((items) => [memory, ...items]); setNovaSetupOpen(false);
      const confirmation: NovaMessage = { id: crypto.randomUUID(), role: "nova", text: `Got it. I’ll use this to keep suggestions practical: ${details.join(" · ")}.`, createdAt: new Date().toISOString(), confidence: "High", evidence: ["Saved directly from your Nova setup."] };
      setNovaMessages((items) => [...items, confirmation].slice(-80));
    } catch (error) { setNovaError(error instanceof Error ? error.message : "Nova setup could not be saved."); }
    finally { setNovaSetupSaving(false); }
  }

  async function sendToNova(prompt?: string) {
    const text = (prompt ?? novaInput).trim();
    if (!text || novaThinking) return;
    const userMessage: NovaMessage = { id: crypto.randomUUID(), role: "user", text, createdAt: new Date().toISOString() };
    setNovaMessages((messages) => [...messages, userMessage].slice(-80));
    setNovaInput(""); setNovaError(""); setNovaThinking(true);
    try {
      if(readNorthSession()&&navigator.onLine){
        const response=await sendNovaMessage(text);
        const assistant=response.assistant;
        const novaMessage:NovaMessage={id:assistant.id,role:"nova",text:formatNovaText(assistant.content),createdAt:assistant.created_at,evidence:assistant.evidence,confidence:assistant.confidence==="high"?"High":assistant.confidence==="limited"?"Limited":"Moderate",apiProposal:response.proposal??undefined};
        setNovaMessages((messages)=>[...messages,novaMessage].slice(-80));
      }else{
        if(!profile.reducedMotion)await new Promise((resolve)=>window.setTimeout(resolve,450));
        const localReply = novaReply(text);
        const localMessage: NovaMessage = {
          ...localReply,
          id: crypto.randomUUID(),
          role: "nova",
          createdAt: new Date().toISOString(),
        };
        setNovaMessages((messages) => [...messages, localMessage].slice(-80));
      }
    }catch(error){
      const message=error instanceof Error?error.message:"Nova couldn’t form a response.";
      if((error as {code?:string}).code==="NOVA_PROVIDER_NOT_CONFIGURED")setNovaError("Nova’s local AI connection needs an API key. Your message is saved; no plan was changed.");
      else setNovaError(`${message} Your message is still saved; no plan was changed.`);
    }finally{setNovaThinking(false);}
  }

  function novaReply(message: string): Omit<NovaMessage, "id" | "role" | "createdAt"> {
    const lower = message.toLowerCase();
    if (["chest pain", "faint", "fainted", "can't breathe", "cannot breathe", "severe pain", "dizzy"].some((term) => lower.includes(term))) return { text: "Stop training now. North cannot assess urgent symptoms. Seek urgent medical help or contact local emergency services—especially for chest pain, severe trouble breathing, fainting, or sudden severe symptoms. Do not use Nova as a substitute for medical care.", confidence: "High", evidence: ["Your message contains language that may describe an urgent symptom."] };
    if ((lower.includes("program") || lower.includes("days a week") || lower.includes("sessions a week")) && activeProgram && currentProgram) {
      const requestedDays = Number(lower.match(/\b([2-6])\s*(?:days?|sessions?)/)?.[1] ?? activeProgram.daysPerWeek);
      const requestedDuration = Number(lower.match(/\b(20|30|45|60|75)\s*(?:minutes?|mins?)/)?.[1] ?? activeProgram.duration);
      if (!currentProgram.dayOptions.includes(requestedDays)) return { text: `${currentProgram.name} supports ${currentProgram.dayOptions.join(", ")} training days per week. I won’t silently force it into ${requestedDays}. Choose a supported rhythm or open Programs to select a different path.`, confidence: "High", evidence: [`${currentProgram.name} supports ${currentProgram.dayOptions.join(" · ")} days per week.`], action: "open-week", actionLabel: "Review the current week" };
      const indexes = trainingIndexes(requestedDays);
      const strengthPool = weeklyPlan.filter((day) => day.kind === "strength" && day.workout?.length);
      const afterPlan = weeklyPlan.map((day, index) => {
        if (!indexes.includes(index)) return { ...structuredClone(day), kind: index === 6 ? "rest" as const : "recovery" as const, title: index === 6 ? "Rest" : "Recovery and mobility", workout: undefined, status: "planned" as const, note: `${currentProgram.name} · Week ${activeProgram.currentWeek} · adjusted with Nova` };
        const source = strengthPool[indexes.indexOf(index) % Math.max(1, strengthPool.length)];
        return source ? { ...structuredClone(day), kind: "strength" as const, title: source.title, workout: resetExercises(source.workout!), status: "planned" as const, note: `${currentProgram.name} · Week ${activeProgram.currentWeek} · ${activeProgram.priority}` } : { ...structuredClone(day), kind: "strength" as const, title: "Program strength session", workout: resetExercises(starterExercises), status: "planned" as const };
      });
      const afterProgram: ActiveProgram = { ...structuredClone(activeProgram), daysPerWeek: requestedDays, duration: requestedDuration, trainingDayIndexes: indexes, changes: [...activeProgram.changes, { createdAt: new Date().toISOString(), week: activeProgram.currentWeek, kind: "program schedule", from: `${activeProgram.daysPerWeek} days · ${activeProgram.duration} min`, to: `${requestedDays} days · ${requestedDuration} min` }] };
      return { text: `I can adjust ${currentProgram.name} from ${activeProgram.daysPerWeek} to ${requestedDays} days per week${requestedDuration !== activeProgram.duration ? ` and from ${activeProgram.duration} to ${requestedDuration} minutes per session` : ""}. The current week will be rebuilt around ${indexes.map((index) => weeklyPlan[index].label).join(", ")}; completed history is never changed.`, confidence: "High", evidence: [`Active program: ${currentProgram.name} · week ${activeProgram.currentWeek}`, `Current rhythm: ${activeProgram.daysPerWeek} days · proposed: ${requestedDays} days`, `Training days after change: ${indexes.map((index) => weeklyPlan[index].label).join(" · ")}`], programProposal: { id: crypto.randomUUID(), summary: `${requestedDays} program days per week · ${requestedDuration} minutes per session`, beforeProgram: structuredClone(activeProgram), afterProgram, beforePlan: structuredClone(weeklyPlan), afterPlan } };
    }
    if (lower.includes("reflect") || lower.includes("review my week") || lower.includes("weekly review")) return { text: `This week records ${weekSessions.length + weekActivities.length} movement sessions and ${weekTrainingMinutes} active minutes. I can open a guided reflection for what felt good, what you learned, and what should change next week.`, confidence: "High", evidence: [`${weekSessions.length} completed workouts`, `${weekActivities.length} logged activities`, `${weekTrainingMinutes} recorded minutes`], action: "weekly-review", actionLabel: "Reflect on this week" };
    if (["short on time", "less time", "shorter", "quick workout", "only have"].some((term) => lower.includes(term)) && todayPlan.kind === "strength" && todayPlan.workout?.length) {
      const before = structuredClone(todayPlan);
      const kept = Math.max(1, Math.ceil(todayPlan.workout.length * .65));
      const after = { ...structuredClone(todayPlan), workout: structuredClone(todayPlan.workout.slice(0, kept)), note: `${todayPlan.note ? `${todayPlan.note} · ` : ""}Shortened with Nova after confirmation.` };
      return { text: `I can shorten ${todayPlan.title} from ${todayPlan.workout.length} to ${kept} exercises, reducing the estimate from about ${plannedMinutes(todayPlan.workout)} to ${plannedMinutes(after.workout!)} minutes. Nothing changes until you confirm below.`, confidence: "High", evidence: [`Current workout: ${todayPlan.workout.length} exercises · about ${plannedMinutes(todayPlan.workout)} minutes`, `Proposed workout: ${kept} exercises · about ${plannedMinutes(after.workout!)} minutes`], proposal: { id: crypto.randomUUID(), planDayId: todayPlan.id, kind: "shorter", summary: `Keep the first ${kept} exercises and remove ${todayPlan.workout.length - kept} from today.`, before, after } };
    }
    if (["lower stress", "easier", "too sore", "very sore", "reduce volume", "low energy"].some((term) => lower.includes(term)) && todayPlan.kind === "strength" && todayPlan.workout?.length) {
      const before = structuredClone(todayPlan);
      const workout = todayPlan.workout.map((exercise) => ({ ...structuredClone(exercise), sets: exercise.sets.length > 1 ? structuredClone(exercise.sets.slice(0, -1)) : structuredClone(exercise.sets), rest: Math.min(240, exercise.rest + 15) }));
      const after = { ...structuredClone(todayPlan), workout, note: `${todayPlan.note ? `${todayPlan.note} · ` : ""}Lower-stress version confirmed with Nova.` };
      const removedSets = todayPlan.workout.reduce((sum, exercise) => sum + exercise.sets.length, 0) - workout.reduce((sum, exercise) => sum + exercise.sets.length, 0);
      return { text: `I can make today lower stress by removing ${removedSets} working sets and adding 15 seconds of rest between sets. The exercise order and movements stay the same. This is a training adjustment, not medical advice.`, confidence: checkIns[0]?.date === isoDate(new Date()) ? "Moderate" : "Limited", evidence: checkIns[0]?.date === isoDate(new Date()) ? [`Energy ${checkIns[0].energy}/5 and soreness ${checkIns[0].soreness}/5 in today’s check-in`, `${removedSets} of ${todayPlan.workout.reduce((sum, exercise) => sum + exercise.sets.length, 0)} working sets would be removed`] : ["No check-in is saved today; this proposal uses only your request.", `${removedSets} working sets would be removed`], proposal: { id: crypto.randomUUID(), planDayId: todayPlan.id, kind: "lower-stress", summary: `Remove one set where possible and add 15 seconds rest to every exercise.`, before, after } };
    }
    if (["recovery day", "make it recovery", "skip workout", "need rest"].some((term) => lower.includes(term))) {
      const before = structuredClone(todayPlan);
      const after: PlanDay = { ...structuredClone(todayPlan), kind: "recovery", title: "Recovery and mobility", workout: undefined, status: "planned", note: `${todayPlan.note ? `${todayPlan.note} · ` : ""}Changed to recovery with Nova after confirmation.` };
      return { text: `I can replace ${todayPlan.title} with Recovery and mobility. The original workout will be preserved in this proposal so Undo can restore it after confirmation.`, confidence: "Moderate", evidence: [checkIns[0]?.date === isoDate(new Date()) ? `Today’s check-in: energy ${checkIns[0].energy}/5 · soreness ${checkIns[0].soreness}/5` : "No same-day check-in is available.", `Current day: ${todayPlan.kind} · proposed day: recovery`], proposal: { id: crypto.randomUUID(), planDayId: todayPlan.id, kind: "recovery", summary: `Replace today’s ${todayPlan.kind} plan with Recovery and mobility.`, before, after } };
    }
    if (lower.includes("today") || lower.includes("workout") || lower.includes("train")) return { text: `Today is ${todayPlan.title}. It is planned as ${todayPlan.kind}${todayPlan.workout ? ` with ${todayPlan.workout.length} exercises and about ${plannedMinutes(todayPlan.workout)} minutes` : ""}. Open it to prepare, or tell me “short on time,” “low energy,” or “too sore” and I’ll show an exact proposed adjustment before anything changes.`, confidence: "High", evidence: [`Current plan: ${todayPlan.title}`, todayPlan.workout ? `${todayPlan.workout.length} exercises · ${plannedMinutes(todayPlan.workout)} estimated minutes` : `${todayPlan.kind} day`], action: "open-today", actionLabel: "Open today’s plan" };
    if (lower.includes("sore") || lower.includes("tired") || lower.includes("recovery") || lower.includes("energy")) return checkIns[0]?.date === isoDate(new Date()) ? { text: `Your check-in records energy ${checkIns[0].energy}/5 and soreness ${checkIns[0].soreness}/5. That is useful context, not a diagnosis. Keep the plan adjustable and use the first working set as another signal.`, confidence: "Moderate", evidence: [`Today’s check-in: energy ${checkIns[0].energy}/5`, `Today’s check-in: soreness ${checkIns[0].soreness}/5`], action: "open-today", actionLabel: "Review today’s plan" } : { text: "I don’t have a check-in for today, so I shouldn’t guess about readiness. Add energy, soreness, sleep, and a note; then I can compare that context with the planned session.", confidence: "Limited", evidence: ["No check-in is saved for today."], action: "check-in", actionLabel: "Check in now" };
    if (lower.includes("progress") || lower.includes("strong") || lower.includes("weight")) return history.length >= 2 ? { text: `North has ${history.length} completed workouts and ${personalRecords.length} detected personal records. Review Progression to see the exact saved sets behind each suggestion before changing load, reps, or rest.`, confidence: personalRecords.length ? "Moderate" : "Limited", evidence: [`${history.length} completed workouts`, `${personalRecords.length} detected personal records`], action: "progression", actionLabel: "Review progression" } : { text: "There isn’t enough repeated workout history for a responsible progression recommendation yet. Complete the same movements at least twice and record every working set.", confidence: "Limited", evidence: [`Only ${history.length} completed workout${history.length === 1 ? "" : "s"} available.`], action: "progression", actionLabel: "See what evidence is needed" };
    if (lower.includes("week") || lower.includes("plan")) return { text: `This week contains ${weeklyPlan.filter((day) => day.kind === "strength").length} strength days and ${weeklyPlan.filter((day) => day.kind === "rest" || day.kind === "recovery").length} recovery/rest days. ${weeklyPlan.filter((day) => day.status === "completed").length} days are complete.`, confidence: "High", evidence: [`${weeklyPlan.filter((day) => day.status === "completed").length} of 7 days complete`, `${weeklyPlan.filter((day) => day.kind === "strength").length} strength days planned`], action: "open-week", actionLabel: "Open the full week" };
    return { text: "I can help with today’s workout, recovery context, weekly planning, or progression. I only use records North actually has, explain the evidence and limitations, and ask before changing your plan.", confidence: "Limited", evidence: ["No specific North record matched this question."], action: "open-today", actionLabel: "Start with today" };
  }

  function followNovaAction(action?: NovaAction) {
    if (action === "open-week") setScreen("week-plan");
    else if (action === "check-in") { setDraftCheckIn({ id: "", date: isoDate(new Date()), weight: checkIns[0]?.weight ? displayBodyWeight(checkIns[0].weight).toFixed(1).replace(/\.0$/, "") : "", sleep: "", energy: 3, soreness: 2, note: "" }); setScreen("check-in"); }
    else if (action === "progression") setScreen("progression");
    else if (action === "weekly-review") { const existing = weeklyReviews.find((item) => item.weekStart === weeklyPlan[0].date); setDraftReview(existing ? { proud: existing.proud, learned: existing.learned, next: existing.next } : { proud: "", learned: "", next: "" }); setScreen("weekly-review"); }
    else if (action === "open-today") { setSelectedPlanDayId(todayPlan.id); setScreen("training"); }
  }

  async function clearNovaConversation() {
    if (novaMessages.length && !window.confirm("Clear this Nova conversation? Your workout and Journey records will not be changed.")) return;
    try { if (readNorthSession() && navigator.onLine) await archiveNovaConversation(); setNovaMessages([]); }
    catch (error) { setNovaError(error instanceof Error ? error.message : "The conversation could not be cleared."); }
  }

  function applyNovaProposal(message: NovaMessage) {
    if (!message.proposal || message.appliedAt && !message.undoneAt) return;
    const current = weeklyPlan.find((day) => day.id === message.proposal!.planDayId);
    if (!current || JSON.stringify(current) !== JSON.stringify(message.proposal.before)) {
      setNovaError("That day changed after Nova created this proposal. Ask again so the preview reflects the current plan.");
      return;
    }
    setWeeklyPlan((days) => days.map((day) => day.id === message.proposal!.planDayId ? structuredClone(message.proposal!.after) : day));
    setNovaMessages((messages) => messages.map((item) => item.id === message.id ? { ...item, appliedAt: new Date().toISOString(), undoneAt: undefined } : item));
    setNovaError("");
  }

  function undoNovaProposal(message: NovaMessage) {
    if (!message.proposal || !message.appliedAt || message.undoneAt) return;
    const current = weeklyPlan.find((day) => day.id === message.proposal!.planDayId);
    if (!current || JSON.stringify(current) !== JSON.stringify(message.proposal.after)) {
      setNovaError("The plan changed again after this proposal. North won’t overwrite those newer edits. Restore the day manually from Training.");
      return;
    }
    setWeeklyPlan((days) => days.map((day) => day.id === message.proposal!.planDayId ? structuredClone(message.proposal!.before) : day));
    setNovaMessages((messages) => messages.map((item) => item.id === message.id ? { ...item, undoneAt: new Date().toISOString() } : item));
    setNovaError("");
  }

  function correctNovaProposal(message: NovaMessage) {
    const context = message.programProposal ? "Adjust my program, but " : message.proposal?.kind === "shorter" ? "Make it shorter, but " : message.proposal?.kind === "lower-stress" ? "Make it lower stress, but " : "Change today, but ";
    setNovaInput(context);
    window.setTimeout(() => document.querySelector<HTMLInputElement>(".nova-input input")?.focus(), 0);
  }

  function applyNovaProgramProposal(message: NovaMessage) {
    const proposal = message.programProposal;
    if (!proposal || message.appliedAt && !message.undoneAt) return;
    if (JSON.stringify(activeProgram) !== JSON.stringify(proposal.beforeProgram) || JSON.stringify(weeklyPlan) !== JSON.stringify(proposal.beforePlan)) { setNovaError("The program or week changed after this proposal. Ask Nova again for a current preview."); return; }
    setActiveProgram(structuredClone(proposal.afterProgram)); setWeeklyPlan(structuredClone(proposal.afterPlan));
    setNovaMessages((messages) => messages.map((item) => item.id === message.id ? { ...item, appliedAt: new Date().toISOString(), undoneAt: undefined } : item)); setNovaError("");
  }

  function undoNovaProgramProposal(message: NovaMessage) {
    const proposal = message.programProposal;
    if (!proposal || !message.appliedAt || message.undoneAt) return;
    if (JSON.stringify(activeProgram) !== JSON.stringify(proposal.afterProgram) || JSON.stringify(weeklyPlan) !== JSON.stringify(proposal.afterPlan)) { setNovaError("The program changed again after this adjustment. North won’t overwrite newer work."); return; }
    setActiveProgram(structuredClone(proposal.beforeProgram)); setWeeklyPlan(structuredClone(proposal.beforePlan));
    setNovaMessages((messages) => messages.map((item) => item.id === message.id ? { ...item, undoneAt: new Date().toISOString() } : item)); setNovaError("");
  }

  function openHistory(session: Session, from: "training" | "journey") {
    setSelectedHistoryId(session.finishedAt);
    setHistoryReturnScreen(from);
    setHistoryEditing(false);
    setCopyStatus("");
    setScreen("session-detail");
  }

  function updateHistorySession(updated: Session) {
    const next = history.map((item) => item.finishedAt === updated.finishedAt ? updated : item);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }

  function removeHistorySession() {
    if (!selectedHistory || !window.confirm("Delete this completed workout from North? This cannot be undone.")) return;
    const next = history.filter((item) => item.finishedAt !== selectedHistory.finishedAt);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setSelectedHistoryId(null);
    setScreen(historyReturnScreen);
  }

  function coachReport(item: Session) {
    const lines = [
      "NORTH — WORKOUT FOR COACH",
      formatSessionDate(item.finishedAt),
      sessionMinutes(item) ? `${sessionMinutes(item)} minutes` : "Duration not recorded",
      `Energy ${item.energy}/5 · Difficulty ${item.difficulty}/5`,
      "",
    ];
    item.exercises.forEach((exercise) => {
      lines.push(exercise.name.toUpperCase());
      exercise.sets.forEach((set, index) => {
        const result = set.complete ? `${set.weight ? displayWeight(set.weight).toFixed(1) : "—"} ${weightUnit} × ${set.reps || "—"}` : "Not completed";
        lines.push(`Set ${index + 1}: ${result}`);
      });
      if (exercise.note) lines.push(`Note: ${exercise.note}`);
      lines.push("");
    });
    if (item.reflection) lines.push(`Session reflection: ${item.reflection}`);
    lines.push("", "Logged with North");
    return lines.join("\n");
  }

  async function copyCoachReport() {
    if (!selectedHistory) return;
    await navigator.clipboard.writeText(coachReport(selectedHistory));
    setCopyStatus("Copied for coach");
    window.setTimeout(() => setCopyStatus(""), 1800);
  }

  function patchPlanDay(patch: Partial<PlanDay>) {
    setPlanSaveStatus("Unsaved changes");
    setWeeklyPlan((value) => value.map((item) => item.id === selectedPlanDay.id ? { ...item, ...patch } : item));
  }

  function patchPlannedExercise(exerciseId: string, patch: Partial<Exercise>) {
    patchPlanDay({ workout: selectedWorkout.map((exercise) => exercise.id === exerciseId ? { ...exercise, ...patch } : exercise) });
  }

  function addPlannedExercise(definition: ExerciseDefinition) {
    patchPlanDay({ workout: [...selectedWorkout, buildExercise(definition)] });
    setExerciseSearch("");
  }

  function removePlannedExercise(exerciseId: string) {
    patchPlanDay({ workout: selectedWorkout.filter((exercise) => exercise.id !== exerciseId) });
  }

  function resizePlannedExercise(exercise: Exercise, count: number) {
    const sets = Array.from({ length: Math.max(1, Math.min(10, count)) }, (_, index) => exercise.sets[index] ?? { weight: exercise.sets[0]?.weight ?? "", reps: "", complete: false });
    const target = exercise.target.replace(/^\d+\s*sets?\s*·?\s*/i, `${sets.length} sets · `);
    patchPlannedExercise(exercise.id, { sets, target });
  }

  async function saveSelectedWorkout() {
    setPlanSaveStatus(navigator.onLine ? "Saving to your North account…" : "Saving offline…");
    await persistAccountJson(PLAN_KEY, "week-plan", weeklyPlan, true);
    if (navigator.onLine && readNorthSession()) await runAccountSync();
    else setPlanSaveStatus("Saved offline · syncs when connected");
  }

  function addPlannedSession() {
    if (!draftPlannedSession.title.trim()) return;
    const addition: PlannedSession = { ...draftPlannedSession, title: draftPlannedSession.title.trim(), id: crypto.randomUUID(), status: "planned" };
    patchPlanDay({ sessions: [...(selectedPlanDay.sessions ?? []), addition] });
    setDraftPlannedSession({ kind: "bike", title: "Zone 2 bike ride", role: "warm-up", duration: "", distance: "", note: "" });
    setStackComposerOpen(false);
  }

  function patchPlannedSession(id: string, patch: Partial<PlannedSession>) {
    patchPlanDay({ sessions: (selectedPlanDay.sessions ?? []).map((item) => item.id === id ? { ...item, ...patch } : item) });
  }

  function removePlannedSession(id: string) {
    patchPlanDay({ sessions: (selectedPlanDay.sessions ?? []).filter((item) => item.id !== id) });
  }

  function openPlannedSession(item: PlannedSession) {
    if (item.kind === "strength") {
      setSession(initialSession(resetExercises(starterExercises)));
      setPickerOpen(false);
      setScreen("prepare");
      return;
    }
    setDraftActivity({ id: item.id, date: selectedPlanDay.date, kind: item.kind, duration: item.duration, distance: item.distance, effort: 3, note: item.note || `${item.role}: ${item.title}` });
    setScreen("activity-log");
  }

  function movePlanDay(direction: -1 | 1) {
    const index = weeklyPlan.findIndex((item) => item.id === selectedPlanDay.id);
    const target = index + direction;
    if (target < 0 || target >= weeklyPlan.length) return;
    setWeeklyPlan((value) => {
      const next = value.map((item) => ({ ...item }));
      const sourceContent = { kind: next[index].kind, title: next[index].title, note: next[index].note, status: next[index].status, workout: next[index].workout, sessions: next[index].sessions };
      const targetContent = { kind: next[target].kind, title: next[target].title, note: next[target].note, status: next[target].status, workout: next[target].workout, sessions: next[target].sessions };
      Object.assign(next[index], targetContent);
      Object.assign(next[target], sourceContent);
      return next;
    });
    selectPlanDay(weeklyPlan[target]);
  }

  function beginPlannedDay() {
    if (selectedPlanDay.kind === "strength") {
      if (hasPreparedDraft && session.planDayId === selectedPlanDay.id) {
        setScreen(session.startedAt ? "workout" : "prepare");
      } else {
        setSession(initialSession(selectedWorkout, selectedPlanDay.id));
        setPickerOpen(false);
        setScreen("prepare");
      }
      return;
    }
    if (selectedPlanDay.kind === "rest") return;
    setDraftActivity({ id: "", date: selectedPlanDay.date, kind: selectedPlanDay.kind, duration: "", distance: "", effort: 3, note: selectedPlanDay.note });
    setScreen("activity-log");
  }

  function openWorkoutTemplate(template: WorkoutTemplate) {
    setRecentTemplateIds((ids) => [template.id, ...ids.filter((id) => id !== template.id)].slice(0, 8));
    setSelectedTemplateId(template.id);
    setTemplateEditing(false);
    setScreen("workout-template");
  }

  function prepareBackfill(exercises: Exercise[], title: string, planDayId?: string) {
    if (!timelineDate || timelineDate > isoDate(new Date())) return;
    const performedAt = `${timelineDate}T12:00:00`;
    setSession({ ...initialSession(exercises, planDayId), performedAt, recordedAt: new Date().toISOString(), addedLater: timelineDate < isoDate(new Date()), sourceTitle: title, durationMinutes: exercises.length ? plannedMinutes(exercises) : undefined });
    setBackfillOpen(false);
    setRecorderStatus("");
    setScreen("prepare");
  }

  function copyToPersonal(template: WorkoutTemplate, suffix = "My workout") {
    let serial = personalTemplates.length + 1;
    while (personalTemplates.some((item) => item.id === `personal-${template.id}-${serial}`)) serial += 1;
    const copy: WorkoutTemplate = {
      ...structuredClone(template),
      id: `personal-${template.id}-${serial}`,
      name: template.source === "personal" ? `${template.name} copy` : `${suffix}: ${template.name}`,
      source: "personal",
    };
    setPersonalTemplates((templates) => [copy, ...templates]);
    setSelectedTemplateId(copy.id);
  }

  function createPersonalWorkout() {
    const workout: WorkoutTemplate = { id: `personal-custom-${crypto.randomUUID()}`, name: "My new workout", description: "Built by me in North.", focus: "Full body", goal: "General fitness", level: "Beginner", duration: 45, equipment: ["Any equipment"], location: "Anywhere", exercises: [{ exerciseName: exerciseLibrary[0].name, sets: 3, reps: "8–12", rest: 75 }], source: "personal" };
    setPersonalTemplates((templates) => [workout, ...templates]);
    setFavoriteTemplateIds((ids) => ids.includes(workout.id) ? ids : [...ids, workout.id]);
    setSelectedTemplateId(workout.id); setTemplateEditing(true); setBuilderPickerOpen(false); setBuilderStatus("Saved automatically to My Workouts."); setScreen("workout-template");
  }

  function setNovaExercise(definition: ExerciseDefinition | null, suggestion?: WorkoutTemplate["exercises"][number]) {
    const target = suggestion?.reps ?? definition?.target.match(/·\s*(.+?)\s*reps/i)?.[1] ?? definition?.target.match(/(\d+[–-]\d+)/)?.[1] ?? "8–12";
    setNovaExerciseDraft({ definition, sets: suggestion?.sets ?? 3, target, rest: suggestion?.rest ?? definition?.rest ?? 75 });
    setNovaExerciseSearch("");
  }

  function advanceNovaExercise(nextIndex: number) {
    const suggestion = novaSuggestedExercises[nextIndex];
    const definition = suggestion ? exerciseLibrary.find((exercise) => exercise.name === suggestion.exerciseName) ?? null : null;
    setNovaSuggestionIndex(nextIndex);
    setNovaExercise(definition, suggestion);
  }

  function commitNovaExercise(exitAfterSave = false) {
    if (!novaExerciseDraft.definition) {
      if (exitAfterSave && selectedTemplate.exercises.length) { setTemplateSource("personal"); setScreen("workout-library"); return; }
      setNovaRoutineStatus("Choose a movement before continuing.");
      return;
    }
    if (selectedTemplate.exercises.some((exercise) => exercise.exerciseName === novaExerciseDraft.definition?.name)) {
      setNovaRoutineStatus(`${novaExerciseDraft.definition.name} is already in this routine.`);
      return;
    }
    const exercise = { exerciseName: novaExerciseDraft.definition.name, sets: novaExerciseDraft.sets, reps: novaExerciseDraft.target.trim() || "8–12", rest: Math.max(0, novaExerciseDraft.rest) };
    const exercises = [...selectedTemplate.exercises, exercise];
    const equipment = [...new Set(exercises.map((item) => exerciseLibrary.find((definition) => definition.name === item.exerciseName)?.equipment).filter((item): item is string => Boolean(item) && item !== "None"))];
    patchPersonalTemplate({ exercises, equipment: equipment.length ? equipment : ["Any equipment"] });
    if (exitAfterSave) { setTemplateSource("personal"); setScreen("workout-library"); return; }
    setNovaRoutineStatus(`${exercise.exerciseName} added as exercise ${exercises.length}.`);
    advanceNovaExercise(novaSuggestionIndex + 1);
  }

  function createNovaWorkout(useSuggestion: boolean) {
    const match = workoutTemplates.find((template) => template.focus === novaWorkoutDraft.focus && template.goal === novaWorkoutDraft.goal && template.duration === novaWorkoutDraft.duration && (novaWorkoutDraft.equipment === "Any equipment" || template.equipment.includes(novaWorkoutDraft.equipment)))
      ?? workoutTemplates.find((template) => template.focus === novaWorkoutDraft.focus && template.goal === novaWorkoutDraft.goal && template.duration === novaWorkoutDraft.duration)
      ?? workoutTemplates[0];
    const workout: WorkoutTemplate = {
      id: `personal-nova-${crypto.randomUUID()}`,
      name: novaWorkoutDraft.name.trim() || `My ${novaWorkoutDraft.focus} workout`,
      description: useSuggestion ? `Built with Nova's ${novaWorkoutDraft.goal.toLowerCase()} recommendations.` : "Built with Nova, one movement at a time.",
      focus: novaWorkoutDraft.focus,
      goal: novaWorkoutDraft.goal,
      level: "Beginner",
      duration: novaWorkoutDraft.duration,
      equipment: novaWorkoutDraft.equipment === "Any equipment" ? ["Any equipment"] : [novaWorkoutDraft.equipment],
      location: novaWorkoutDraft.location,
      exercises: [],
      source: "personal",
    };
    setPersonalTemplates((templates) => [workout, ...templates]);
    setFavoriteTemplateIds((ids) => ids.includes(workout.id) ? ids : [...ids, workout.id]);
    const suggestions = useSuggestion ? structuredClone(match.exercises) : [];
    setSelectedTemplateId(workout.id); setTemplateEditing(false); setBuilderPickerOpen(false); setNovaSuggestedExercises(suggestions); setNovaSuggestionIndex(0); setNovaRoutineStatus(useSuggestion ? "Nova suggested the first movement. Keep it or search for another." : "Choose the first movement for your routine."); setNovaExerciseSearch(""); setNovaExercise(suggestions[0] ? exerciseLibrary.find((exercise) => exercise.name === suggestions[0].exerciseName) ?? null : null, suggestions[0]); setScreen("nova-routine-builder");
  }

  function patchPersonalTemplate(patch: Partial<WorkoutTemplate>) {
    if (selectedTemplate.source !== "personal") return;
    setPersonalTemplates((templates) => templates.map((template) => template.id === selectedTemplate.id ? { ...template, ...patch } : template));
  }

  function patchTemplateExercise(index: number, patch: Partial<WorkoutTemplate["exercises"][number]>) {
    patchPersonalTemplate({ exercises: selectedTemplate.exercises.map((exercise, position) => position === index ? { ...exercise, ...patch } : exercise) });
    setBuilderStatus("Changes saved.");
  }

  function moveTemplateExercise(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selectedTemplate.exercises.length) return;
    const exercises = [...selectedTemplate.exercises];
    [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
    patchPersonalTemplate({ exercises });
  }

  function addTemplateExercise(definition: ExerciseDefinition) {
    if (selectedTemplate.exercises.some((exercise) => exercise.exerciseName === definition.name)) { setBuilderStatus(`${definition.name} is already in this workout.`); return; }
    const targetReps = definition.target.match(/·\s*(.+?)\s*reps/i)?.[1] ?? definition.target.match(/(\d+[–-]\d+)/)?.[1] ?? "8–12";
    const exercises = [...selectedTemplate.exercises, { exerciseName: definition.name, sets: 3, reps: targetReps, rest: definition.rest }];
    const detectedEquipment = [...new Set(exercises.map((exercise) => exerciseLibrary.find((item) => item.name === exercise.exerciseName)?.equipment).filter((item): item is string => Boolean(item) && item !== "None"))];
    patchPersonalTemplate({ exercises, equipment: detectedEquipment.length ? detectedEquipment : ["Any equipment"] });
    setBuilderStatus(`${definition.name} added and saved.`);
  }

  function openExercisePreview(definition: ExerciseDefinition) {
    setExerciseDetailPreview(buildExercise(definition, `preview-${definition.name}`));
    setExerciseDetailReturn("workout-template");
    setScreen("exercise-detail");
  }

  function closeExerciseDetail() {
    const returnScreen = exerciseDetailReturn;
    setExerciseDetailPreview(null);
    if (returnScreen === "workout-template") setBuilderPickerOpen(true);
    setScreen(returnScreen);
  }

  function toggleTemplateEquipment(equipment: string) {
    const current = selectedTemplate.equipment;
    const next = equipment === "Any equipment" ? ["Any equipment"] : current.includes(equipment) ? current.filter((item) => item !== equipment) : [...current.filter((item) => item !== "Any equipment"), equipment];
    patchPersonalTemplate({ equipment: next.length ? next : ["Any equipment"] });
    setBuilderStatus("Equipment saved.");
  }

  function removeTemplateExercise(index: number) {
    if (selectedTemplate.exercises.length <= 1) return;
    patchPersonalTemplate({ exercises: selectedTemplate.exercises.filter((_, position) => position !== index) });
  }

  function deletePersonalTemplate() {
    if (selectedTemplate.source !== "personal" || !window.confirm(`Delete “${selectedTemplate.name}”?`)) return;
    setPersonalTemplates((templates) => templates.filter((template) => template.id !== selectedTemplate.id));
    setSelectedTemplateId(workoutTemplates[0].id);
    setScreen("workout-library");
  }

  function toggleFavoriteTemplate(templateId: string) {
    setFavoriteTemplateIds((ids) => ids.includes(templateId) ? ids.filter((id) => id !== templateId) : [...ids, templateId]);
  }

  function toggleProgramEquipment(equipment: string) {
    setProgramEquipment((current) => {
      if (equipment === "Any equipment") return ["Any equipment"];
      const withoutAny = current.filter((item) => item !== "Any equipment");
      if (!withoutAny.includes(equipment)) return [...withoutAny, equipment];
      const next = withoutAny.filter((item) => item !== equipment);
      return next.length ? next : ["Any equipment"];
    });
  }

  function openProgram(program: ProgramDefinition) {
    setSelectedProgramId(program.id);
    setProgramDays(program.defaultDays);
    setProgramDuration(45);
    setProgramLevel(program.level === "All levels" ? "Beginner" : program.level);
    setProgramEquipment([program.equipment ?? "Any equipment"]);
    setProgramPriority(program.priority ?? "Balanced");
    setScreen("program-detail");
  }

  function trainingIndexes(count: number) {
    return ({ 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] } as Record<number, number[]>)[count] ?? [0, 2, 4];
  }

  function programTemplate(focus: string, position: number) {
    const levelMatches = workoutTemplates.filter((template) => template.focus === focus && (template.level === programLevel || selectedProgram.level === "All levels"));
    const equipmentMatches = levelMatches.filter((template) => programEquipment.includes("Any equipment") || template.equipment.some((equipment) => programEquipment.includes(equipment)) || template.equipment.includes("Bodyweight"));
    const pool = equipmentMatches.length ? equipmentMatches : levelMatches.length ? levelMatches : workoutTemplates.filter((template) => template.focus === focus);
    return [...pool].sort((a, b) => Math.abs(a.duration - programDuration) - Math.abs(b.duration - programDuration))[position % Math.max(1, pool.length)] ?? workoutTemplates[0];
  }

  function generateProgramWeek(program = selectedProgram, week = 1, priorProgram: ActiveProgram | null = activeProgram) {
    const indexes = trainingIndexes(programDays);
    const focuses = program.focusesByDays[programDays] ?? program.focusesByDays[program.defaultDays];
    const monday = weeklyPlan[0].date;
    let sessionIndex = 0;
    setWeeklyPlan((days) => days.map((day, index) => {
      if (!indexes.includes(index)) return { ...day, kind: index === 6 ? "rest" : "recovery", title: index === 6 ? "Rest" : "Recovery and mobility", workout: undefined, note: `${program.name} · Week ${week}`, status: "planned" };
      const focus = focuses[sessionIndex] ?? focuses[focuses.length - 1];
      const template = programTemplate(focus, sessionIndex++);
      return { ...day, kind: "strength", title: template.name, workout: exercisesFromTemplate(template), note: `${program.name} · Week ${week} · ${programPriority}`, status: "planned" };
    }));
    const continuing = priorProgram?.programId === program.id ? priorProgram : null;
    setActiveProgram({ programId: program.id, startedAt: continuing?.startedAt ?? new Date().toISOString(), currentWeek: week, daysPerWeek: programDays, duration: programDuration, level: programLevel, equipment: programEquipment.join(", "), priority: programPriority, trainingDayIndexes: indexes, generatedWeekStart: monday, weekHistory: continuing?.weekHistory ?? [], changes: continuing?.changes ?? [] });
    setSelectedPlanDayId(weeklyPlan[indexes[0]].id);
    setScreen("training");
  }

  function advanceProgramWeek() {
    if (!activeProgram || !currentProgram || activeProgram.currentWeek >= currentProgram.weeks) return;
    setProgramDays(activeProgram.daysPerWeek);
    setProgramDuration(activeProgram.duration);
    setProgramLevel(activeProgram.level);
    setProgramEquipment(activeProgram.equipment.split(", "));
    setProgramPriority(activeProgram.priority);
    const archived = { ...activeProgram, weekHistory: [...activeProgram.weekHistory.filter((item) => item.week !== activeProgram.currentWeek), { week: activeProgram.currentWeek, completed: programCompletedThisWeek, planned: activeProgram.daysPerWeek, weekStart: activeProgram.generatedWeekStart }] };
    generateProgramWeek(currentProgram, activeProgram.currentWeek + 1, archived);
  }

  function applyProgressionSuggestion(suggestion: ProgressionSuggestion) {
    if (selectedPlanDay.kind !== "strength" || !selectedPlanDay.workout?.length) {
      window.alert("Select a strength day with a planned workout first.");
      return;
    }
    const beforeDay = structuredClone(selectedPlanDay);
    let afterDay = structuredClone(selectedPlanDay);
    if (suggestion.kind === "recovery") afterDay = { ...afterDay, workout: afterDay.workout!.map((exercise) => ({ ...exercise, sets: exercise.sets.slice(0, Math.max(1, Math.ceil(exercise.sets.length * .67))) })), note: `${afterDay.note ? `${afterDay.note} · ` : ""}Reduced-volume week suggested from recent difficulty and energy records.` };
    if (suggestion.kind === "load" && suggestion.nextWeight) afterDay = { ...afterDay, workout: afterDay.workout!.map((exercise) => exercise.name === suggestion.exerciseName ? { ...exercise, sets: exercise.sets.map((set) => ({ ...set, weight: suggestion.nextWeight ?? set.weight })) } : exercise) };
    if (suggestion.kind === "reps" && suggestion.nextTarget) afterDay = { ...afterDay, workout: afterDay.workout!.map((exercise) => exercise.name === suggestion.exerciseName ? { ...exercise, target: suggestion.nextTarget ?? exercise.target } : exercise) };
    if (suggestion.kind === "rest" && suggestion.nextRest) afterDay = { ...afterDay, workout: afterDay.workout!.map((exercise) => exercise.name === suggestion.exerciseName ? { ...exercise, rest: suggestion.nextRest ?? exercise.rest } : exercise) };
    if (suggestion.kind === "substitution" && suggestion.substitution) {
      const definition = exerciseLibrary.find((exercise) => exercise.name === suggestion.substitution);
      if (!definition) return;
      afterDay = { ...afterDay, workout: afterDay.workout!.map((exercise) => exercise.name === suggestion.exerciseName ? buildExercise(definition, exercise.id) : exercise), note: `${afterDay.note ? `${afterDay.note} · ` : ""}${suggestion.exerciseName} substituted with ${suggestion.substitution}.` };
    }
    const afterProgram = activeProgram ? { ...structuredClone(activeProgram), changes: [...activeProgram.changes, { createdAt: new Date().toISOString(), week: activeProgram.currentWeek, kind: suggestion.kind, from: suggestion.exerciseName, to: suggestion.kind === "load" ? `${suggestion.nextWeight} lb` : suggestion.kind === "reps" ? suggestion.nextTarget ?? "more repetitions" : suggestion.kind === "rest" ? `${suggestion.nextRest} seconds rest` : suggestion.kind === "substitution" ? suggestion.substitution ?? "substitution" : "reduced volume" }] } : null;
    setProgressionTransaction({ id: crypto.randomUUID(), suggestion: structuredClone(suggestion), planDayId: selectedPlanDay.id, beforeDay, afterDay, beforeProgram: activeProgram ? structuredClone(activeProgram) : null, afterProgram, createdAt: new Date().toISOString() });
  }

  function confirmProgressionTransaction() {
    const transaction = progressionTransaction;
    if (!transaction || transaction.appliedAt && !transaction.undoneAt) return;
    const current = weeklyPlan.find((day) => day.id === transaction.planDayId);
    if (!current || JSON.stringify(current) !== JSON.stringify(transaction.beforeDay) || JSON.stringify(activeProgram) !== JSON.stringify(transaction.beforeProgram)) { setNovaError("The selected workout or program changed after this preview. Reopen Progression for a current recommendation."); return; }
    setWeeklyPlan((days) => days.map((day) => day.id === transaction.planDayId ? structuredClone(transaction.afterDay) : day));
    setActiveProgram(transaction.afterProgram ? structuredClone(transaction.afterProgram) : null);
    setProgressionTransaction({ ...transaction, appliedAt: new Date().toISOString(), undoneAt: undefined }); setNovaError("");
  }

  function undoProgressionTransaction() {
    const transaction = progressionTransaction;
    if (!transaction?.appliedAt || transaction.undoneAt) return;
    const current = weeklyPlan.find((day) => day.id === transaction.planDayId);
    if (!current || JSON.stringify(current) !== JSON.stringify(transaction.afterDay) || JSON.stringify(activeProgram) !== JSON.stringify(transaction.afterProgram)) { setNovaError("The workout or program changed again after this recommendation. North won’t overwrite newer edits."); return; }
    setWeeklyPlan((days) => days.map((day) => day.id === transaction.planDayId ? structuredClone(transaction.beforeDay) : day));
    setActiveProgram(transaction.beforeProgram ? structuredClone(transaction.beforeProgram) : null);
    setProgressionTransaction({ ...transaction, undoneAt: new Date().toISOString() }); setNovaError("");
  }

  function addTemplateToSelectedDay(prepareNow = false) {
    if (selectedTemplateIssues.length) { setBuilderStatus(selectedTemplateIssues[0]); return; }
    const exercises = exercisesFromTemplate(selectedTemplate);
    setWeeklyPlan((days) => days.map((day) => day.id === selectedPlanDay.id ? { ...day, kind: "strength", title: selectedTemplate.name, workout: exercises, status: "planned" } : day));
    if (prepareNow) {
      setSession(initialSession(exercises, selectedPlanDay.id));
      setScreen("prepare");
    } else {
      setScreen("training");
    }
  }

  function applyWorkoutTemplate(template: WorkoutTemplate, prepareNow = false, planDayId = selectedPlanDay.id) {
    setRecentTemplateIds((ids) => [template.id, ...ids.filter((id) => id !== template.id)].slice(0, 8));
    const exercises = exercisesFromTemplate(template);
    setSelectedTemplateId(template.id);
    setWeeklyPlan((days) => days.map((day) => day.id === planDayId ? { ...day, kind: "strength", title: workoutDisplayName(template.name), workout: exercises, status: day.status === "completed" ? "completed" : "planned" } : day));
    if (prepareNow) {
      setSession(initialSession(exercises, planDayId));
      setScreen("prepare");
    } else {
      setScreen("training");
    }
  }

  function openActivity(kind: ActivityEntry["kind"]) {
    setDraftActivity({ id: "", date: isoDate(new Date()), kind, duration: "", distance: "", effort: 3, note: "" });
    setRecorderStatus("");
    setScreen("activity-log");
  }

  function saveActivity() {
    if ((Number.parseFloat(draftActivity.duration) || 0) <= 0) { setRecorderStatus("Add the activity duration before saving."); return; }
    const plannedSessionId = draftActivity.id;
    const entry = { ...draftActivity, id: `${draftActivity.date}-${draftActivity.kind}-${Date.now()}` };
    setActivities((value) => [entry, ...value]);
    setWeeklyPlan((value) => value.map((day) => {
      if (day.date !== entry.date) return day;
      const sessions = (day.sessions ?? []).map((item) => item.id === plannedSessionId ? { ...item, status: "completed" as const } : item);
      return day.kind === entry.kind && !plannedSessionId ? { ...day, sessions, status: "completed" } : { ...day, sessions };
    }));
    localStorage.removeItem(ACTIVITY_DRAFT_KEY);
    setRecorderStatus("");
    setScreen("journey");
  }

  function importCoachWorkout() {
    const lines = coachText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) { setImportError("Paste at least one exercise."); return; }
    const exercises = lines.map((line, index) => {
      const [namePart, setsPart = "3", repsPart = "8–12", weightPart = "", restPart = "75"] = line.split("|").map((part) => part.trim());
      const name = namePart.replace(/^[-*\d.)\s]+/, "").trim();
      const sets = Math.min(10, Math.max(1, Number.parseInt(setsPart, 10) || 3));
      const rest = Math.min(600, Math.max(0, Number.parseInt(restPart, 10) || 75));
      return {
        id: `coach-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}-${index}`,
        name: name || `Exercise ${index + 1}`,
        target: `${sets} sets · ${repsPart} reps`,
        rest,
        previous: "Coach import · no previous result",
        cue: "Follow your coach’s guidance and use the exercise note for any session-specific instruction.",
        sets: Array.from({ length: sets }, () => ({ weight: weightPart, reps: "", complete: false })),
        note: "",
        passed: false,
      } satisfies Exercise;
    });
    const next = { ...initialSession(), currentId: exercises[0].id, exercises };
    setSession(next);
    setCoachText("");
    setImportError("");
    setScreen("prepare");
  }

  function saveCheckIn() {
    const enteredWeight = Number.parseFloat(draftCheckIn.weight);
    const entry = { ...draftCheckIn, weight: Number.isFinite(enteredWeight) ? storeBodyWeight(draftCheckIn.weight) : "", id: `${draftCheckIn.date}-${Date.now()}` };
    setCheckIns((value) => [entry, ...value].slice(0, 365));
    setScreen("today");
  }

  function saveTodayBodyWeight() {
    const enteredWeight = Number.parseFloat(draftCheckIn.weight);
    if (!Number.isFinite(enteredWeight)) return;
    const today = isoDate(new Date());
    const existing = checkIns.find((item) => item.date === today);
    const entry: CheckInEntry = { ...(existing ?? draftCheckIn), date: today, weight: storeBodyWeight(draftCheckIn.weight), id: existing?.id ?? `${today}-${Date.now()}` };
    setCheckIns((value) => [entry, ...value.filter((item) => item.date !== today)].slice(0, 365));
    setDraftCheckIn((value) => ({ ...value, date: today, weight: displayBodyWeight(entry.weight).toFixed(1).replace(/\.0$/, "") }));
  }

  function saveWeeklyReview() {
    const entry: WeeklyReview = { id: `${weeklyPlan[0].date}-${Date.now()}`, weekStart: weeklyPlan[0].date, ...draftReview, createdAt: new Date().toISOString() };
    setWeeklyReviews((value) => [entry, ...value.filter((item) => item.weekStart !== entry.weekStart)].slice(0, 52));
    setScreen("journey");
  }

  function exportNorthData() {
    const backup = {
      northBackupVersion: 1,
      exportedAt: new Date().toISOString(),
      data: { session, history, weeklyPlan, activities, checkIns, weeklyReviews, testNotes, personalTemplates, activeProgram, journeyPhotos, profile, novaMessages, progressionTransaction, calorieEstimates, theme: themeName },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `north-backup-${isoDate(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDataStatus("Backup exported");
  }

  async function importNorthData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as { northBackupVersion?: number; data?: Record<string, unknown> };
      if (backup.northBackupVersion !== 1 || !backup.data || !Array.isArray(backup.data.history) || !Array.isArray(backup.data.weeklyPlan)) throw new Error("Invalid backup");
      const data = backup.data;
      await deleteCurrentNorthDatabase();
      const restoredDocuments: Array<[string, string, unknown]> = [
        [STORAGE_KEY, "active-session", data.session ?? initialSession()], [HISTORY_KEY, "workouts", data.history], [PLAN_KEY, "week-plan", data.weeklyPlan],
        [ACTIVITIES_KEY, "activities", Array.isArray(data.activities) ? data.activities : []], [CHECK_INS_KEY, "check-ins", Array.isArray(data.checkIns) ? data.checkIns : []],
        [REVIEWS_KEY, "reviews", Array.isArray(data.weeklyReviews) ? data.weeklyReviews : []], [TEST_NOTES_KEY, "test-notes", Array.isArray(data.testNotes) ? data.testNotes : []],
        [PERSONAL_TEMPLATES_KEY, "personal-workouts", Array.isArray(data.personalTemplates) ? data.personalTemplates : []], [JOURNEY_PHOTOS_KEY, "journey-photos", Array.isArray(data.journeyPhotos) ? data.journeyPhotos : []],
        [PROFILE_KEY, "profile", data.profile ?? readProfile()], [NOVA_MESSAGES_KEY, "nova-conversations", Array.isArray(data.novaMessages) ? data.novaMessages : []],
      ];
      for (const [storageKey, collection, value] of restoredDocuments) { localStorage.setItem(storageKey, JSON.stringify(value)); await northRepository.put(collection, "primary", value); }
      if (data.activeProgram) { localStorage.setItem(ACTIVE_PROGRAM_KEY, JSON.stringify(data.activeProgram)); await northRepository.put("active-program", "primary", data.activeProgram); } else { localStorage.removeItem(ACTIVE_PROGRAM_KEY); await northRepository.remove("active-program", "primary"); }
      if (data.progressionTransaction) { localStorage.setItem(PROGRESSION_TRANSACTION_KEY, JSON.stringify(data.progressionTransaction)); await northRepository.put("progression-transaction", "primary", data.progressionTransaction); } else { localStorage.removeItem(PROGRESSION_TRANSACTION_KEY); await northRepository.remove("progression-transaction", "primary"); }
      localStorage.setItem("north-calorie-estimates", data.calorieEstimates ? "on" : "off");
      localStorage.setItem("north-theme", data.theme === "night" ? "night" : "morning");
      await northRepository.put("settings", "calorie-estimates", Boolean(data.calorieEstimates));
      await northRepository.put("settings", "theme", data.theme === "night" ? "night" : "morning");
      reloadSyncedAccountState();
      setDataStatus(navigator.onLine ? "Backup restored locally and queued for account review." : "Backup restored offline and queued to sync.");
      if (navigator.onLine && readNorthSession()) await runAccountSync();
      event.target.value = "";
    } catch (reason) {
      setDataStatus(reason instanceof Error && reason.message !== "Invalid backup" ? reason.message : "That file is not a valid North backup");
      event.target.value = "";
    }
  }

  async function resetNorthData() {
    if (!window.confirm("Erase this device’s local North copy and sign out? Your synced account records stay safe and will return when you sign in again.")) return;
    try {
      const ownerId = readNorthSession()?.user.id;
      await deleteCurrentNorthDatabase();
      [STORAGE_KEY, HISTORY_KEY, PLAN_KEY, ACTIVITIES_KEY, CHECK_INS_KEY, REVIEWS_KEY, TEST_NOTES_KEY, PERSONAL_TEMPLATES_KEY, ACTIVE_PROGRAM_KEY, JOURNEY_PHOTOS_KEY, PROFILE_KEY, NOVA_MESSAGES_KEY, PROGRESSION_TRANSACTION_KEY, "north-favorite-workouts-v1", "north-favorite-exercises-v1", "north-recent-workouts-v1", "north-calorie-estimates", "north-theme", ...(ownerId ? [`${LAST_PULL_KEY}:${ownerId}`] : [])].forEach((key) => localStorage.removeItem(key));
      logoutNorthAccount();
      window.location.assign("/");
    } catch (reason) { setDataStatus(reason instanceof Error ? reason.message : "This local copy could not be erased."); }
  }

  function openTestLog(from: Screen) {
    setTestReturnScreen(from);
    setDraftTestNote({ category: "confusing", text: "" });
    setScreen("test-log");
  }

  function saveTestNote() {
    if (!draftTestNote.text.trim()) return;
    setTestNotes((value) => [{ id: `test-${Date.now()}`, createdAt: new Date().toISOString(), source: testReturnScreen, category: draftTestNote.category, text: draftTestNote.text.trim(), resolved: false }, ...value]);
    setScreen(testReturnScreen);
  }

  function toggleTestNote(id: string) {
    setTestNotes((value) => value.map((item) => item.id === id ? { ...item, resolved: !item.resolved } : item));
  }

  function addJourneyPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2_000_000) {
      window.alert("Choose an image under 2 MB. Photos stay in this browser and are included in North backups.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const createdAt = new Date().toISOString();
      setJourneyPhotos((photos) => [{ id: `photo-${createdAt}`, createdAt, date: isoDate(new Date()), dataUrl: reader.result as string, caption: photoCaption.trim() }, ...photos].slice(0, 20));
      setPhotoCaption("");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  function removeJourneyPhoto(id: string) {
    if (!window.confirm("Remove this private photo from North on this browser?")) return;
    setJourneyPhotos((photos) => photos.filter((photo) => photo.id !== id));
  }

  useEffect(() => {
    if (screen !== "today" || !navigator.permissions) return;
    let cancelled = false;
    void navigator.permissions.query({ name: "geolocation" }).then((permission) => {
      if (!cancelled && permission.state === "granted") loadLocalWeather(true);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [screen]);

  function loadLocalWeather(silent = false) {
    if (!navigator.geolocation) { setWeatherStatus("Location is not available in this browser."); return; }
    if (!silent) setWeatherStatus("Requesting location…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude.toFixed(4)}&longitude=${coords.longitude.toFixed(4)}&current=temperature_2m,apparent_temperature,precipitation,weather_code&timezone=auto`);
        if (!response.ok) throw new Error("Weather unavailable");
        const data = await response.json() as { current?: { temperature_2m?: number; apparent_temperature?: number; precipitation?: number; weather_code?: number } };
        if (!data.current || data.current.temperature_2m === undefined) throw new Error("Weather unavailable");
        const nextWeather = { temperature: data.current.temperature_2m, apparent: data.current.apparent_temperature ?? data.current.temperature_2m, precipitation: data.current.precipitation ?? 0, weatherCode: data.current.weather_code ?? 0 };
        setWeather(nextWeather);
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ...nextWeather, savedAt: Date.now() } satisfies CachedWeather));
        if (!silent) setWeatherStatus("Local forecast loaded with permission.");
      } catch { if (!silent) setWeatherStatus("Weather could not be loaded. Your plan is unchanged."); }
    }, () => { if (!silent) setWeatherStatus("Location was not shared. Weather remains off."); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 900000 });
  }

  function openTodayWorkout() {
    setSelectedPlanDayId(todayPlan.id);
    if (todayPlan.kind === "strength") {
      if (hasPreparedDraft && session.planDayId === todayPlan.id) setScreen(session.startedAt ? "workout" : "prepare");
      else { setSession(initialSession(todayPlan.workout?.length ? todayPlan.workout : starterExercises, todayPlan.id)); setScreen("prepare"); }
    } else if (todayPlan.kind !== "rest") {
      setDraftActivity({ id: "", date: todayPlan.date, kind: todayPlan.kind, duration: "", distance: "", effort: 3, note: todayPlan.note });
      setScreen("activity-log");
    } else { setTrainingDetailsOpen(true); setScreen("training"); }
  }

  function completeOnboarding(result: OnboardingResult) {
    setProfile((value) => ({ ...value, name: result.name, direction: result.direction, trainingDays: result.trainingDays, units: result.units, bodyWeightUnit: result.units === "metric" ? "kg" : "lb", distanceUnit: result.units === "metric" ? "km" : "mi", tone: result.tone, memoryEnabled: result.memoryEnabled }));
    const indexes = result.trainingDayIndexes;
    setWeeklyPlan((days) => days.map((day, index) => indexes.includes(index) ? { ...day, kind: "strength", title: result.direction, note: `${result.duration} minute ${result.experience.toLowerCase()} session`, status: "planned" } : { ...day, kind: index === 6 ? "rest" : "recovery", title: index === 6 ? "Rest & recover" : "Active recovery", note: "Easy movement and recovery", status: "planned" }));
    void northRepository.put("onboarding", "primary", { completedAt: new Date().toISOString(), ...result });
    setEntryComplete(true);
    setLoginReveal(true);
    setScreen("today");
    setTourStep(0);
  }

  function closeProductTour() {
    localStorage.setItem(productTourStorageKey(), new Date().toISOString());
    setTourStep(-1);
  }

  function closeReleaseNotes() {
    if (dismissReleaseNotes) localStorage.setItem(RELEASE_NOTES_DISMISSAL_KEY, RELEASE_NOTES_ID);
    setReleaseNotesOpen(false);
  }

  function advanceProductTour() {
    if (tourStep < 0) return;
    const next = tourStep + 1;
    if (next >= productTourSteps.length) { closeProductTour(); return; }
    setTourStep(next);
    setScreen(productTourSteps[next].screen);
  }

  function replayProductTour() {
    setScreen("today");
    setTourStep(0);
  }

  async function refreshLocalSyncState() {
    const [pending, conflicts] = await Promise.all([northRepository.pendingMutations(), northRepository.conflicts()]);
    setSyncResult((current) => ({ sent: current?.sent ?? 0, conflicts: conflicts.filter((item) => item.status === "open").length, failed: pending.filter((item) => item.lastError).length, pending: pending.length }));
    setSyncConflicts(conflicts.filter((item) => item.status === "open"));
  }

  function reloadSyncedAccountState() {
    const restoredPlan = readPlan();
    const restoredSession = readSession();
    setWeeklyPlan(restoredPlan);
    setSelectedPlanDayId((current) => restoredPlan.some((day) => day.id === current) ? current : restoredPlan.find((day) => day.date === isoDate(new Date()))?.id ?? restoredPlan[0].id);
    setSession(restoredSession); sessionRef.current = restoredSession;
    setHistory(readHistory());
    setActivities(readActivities());
    setCheckIns(readCheckIns());
    setWeeklyReviews(readWeeklyReviews());
    setTestNotes(readTestNotes());
    setPersonalTemplates(readPersonalTemplates());
    setActiveProgram(readActiveProgram());
    setJourneyPhotos(readJourneyPhotos());
    setProfile(readProfile());
    setNovaMessages(readNovaMessages());
    setProgressionTransaction(readProgressionTransaction());
    try { const ids = JSON.parse(localStorage.getItem("north-favorite-workouts-v1") ?? "[]"); setFavoriteTemplateIds(Array.isArray(ids) ? ids : []); } catch { setFavoriteTemplateIds([]); }
    try { const names = JSON.parse(localStorage.getItem("north-favorite-exercises-v1") ?? "[]"); setFavoriteExerciseNames(Array.isArray(names) ? names : []); } catch { setFavoriteExerciseNames([]); }
    setThemeName(readThemeName());
  }

  async function runAccountSync(showFeedback = false) {
    if (syncLock.current) { syncRequested.current = true; return; }
    const account = readNorthSession();
    if (!account) return;
    const backoffUntil = Number(localStorage.getItem("north-sync-backoff-until") || 0);
    if (!showFeedback && backoffUntil > Date.now()) return;
    setOnline(navigator.onLine);
    if (!navigator.onLine) { setSyncError("You are offline. Changes are safely queued on this device."); await refreshLocalSyncState(); return; }
    syncLock.current = true; setSyncing(true); if (showFeedback) setSyncVisible(true); setSyncError("");
    try {
      const pullKey = `${LAST_PULL_KEY}:${account.user.id}`;
      if (!localStorage.getItem(pullKey)) {
        const restored = await withFreshAccess((token) => pullNorth(NORTH_API_BASE, token));
        localStorage.setItem(pullKey, restored.serverTime);
        if (restored.restored > 0) reloadSyncedAccountState();
      }
      const result = await withFreshAccess((token) => syncNorth(NORTH_API_BASE, token));
      setSyncResult(result);
      if (result.failed === 0 && result.conflicts === 0) {
        const restored = await withFreshAccess((token) => pullNorth(NORTH_API_BASE, token, localStorage.getItem(pullKey) || "1970-01-01T00:00:00.000Z"));
        localStorage.setItem(pullKey, restored.serverTime);
        if (restored.restored > 0) reloadSyncedAccountState();
        const now = new Date().toISOString(); localStorage.setItem("north-last-sync-at", now); localStorage.removeItem("north-sync-backoff-until"); setLastSyncedAt(now); setPlanSaveStatus("Saved to your North account");
      }
      else setSyncError(result.conflicts ? `${result.conflicts} account change${result.conflicts === 1 ? " needs" : "s need"} your decision before North replaces anything.` : `${result.failed} change${result.failed === 1 ? "" : "s"} could not sync yet. North will retry automatically.`);
      await refreshLocalSyncState();
    } catch (reason) { const message = reason instanceof Error ? reason.message : "Sync could not complete. Your local changes remain safe."; if (message.includes("429")) localStorage.setItem("north-sync-backoff-until", String(Date.now() + 60_000)); setSyncError(message); await refreshLocalSyncState(); }
    finally {
      syncLock.current = false; setSyncing(false); setSyncVisible(false);
      if (syncRequested.current) { syncRequested.current = false; if (syncTimer.current !== null) window.clearTimeout(syncTimer.current); syncTimer.current = window.setTimeout(() => { syncTimer.current = null; if (navigator.onLine) void runAccountSync(); }, 3000); }
    }
  }

  async function installNorth() {
    if (window.matchMedia("(display-mode: standalone)").matches) { setInstallStatus("North is already installed on this phone."); return; }
    if (!installPrompt) {
      setInstallStatus(/iPhone|iPad/i.test(navigator.userAgent) ? "On iPhone: tap Share, then Add to Home Screen." : "Open your browser menu and choose Install app or Add to Home screen.");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallStatus(choice.outcome === "accepted" ? "North is being installed." : "Installation was cancelled. You can try again anytime.");
    setInstallPrompt(null);
  }

  async function chooseSyncConflict(conflict: SyncConflict, choice: "local" | "remote") {
    if (syncLock.current) return; syncLock.current = true; setSyncing(true); setSyncError("");
    try {
      await resolveConflict(conflict.conflictId, choice);
      if (choice === "local") await withFreshAccess((token) => syncNorth(NORTH_API_BASE, token));
      await withFreshAccess(async (token) => {
        const response = await fetch(`${NORTH_API_BASE}/v1/sync/conflicts/${conflict.conflictId}/resolve`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...northDeviceHeaders() }, body: JSON.stringify({ choice }) });
        if (!response.ok && response.status !== 404) throw new Error("Conflict decision could not be saved.");
      });
      const now = new Date().toISOString(); localStorage.setItem("north-last-sync-at", now); setLastSyncedAt(now); await refreshLocalSyncState();
    } catch (reason) { setSyncError(reason instanceof Error ? reason.message : "Conflict could not be resolved."); }
    finally { syncLock.current = false; setSyncing(false); }
  }

  async function keepAllAccountConflictVersions() {
    if (syncLock.current || syncConflicts.length === 0) return;
    syncLock.current = true; setSyncing(true); setSyncError("");
    try {
      for (const conflict of syncConflicts) {
        await resolveConflict(conflict.conflictId, "remote");
        await withFreshAccess(async (token) => {
          const response = await fetch(`${NORTH_API_BASE}/v1/sync/conflicts/${conflict.conflictId}/resolve`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...northDeviceHeaders() }, body: JSON.stringify({ choice: "remote" }) });
          if (!response.ok && response.status !== 404) throw new Error("Account version could not be kept.");
        });
      }
      const account = readNorthSession()!;
      const restored = await withFreshAccess((token) => pullNorth(NORTH_API_BASE, token, localStorage.getItem(`${LAST_PULL_KEY}:${account.user.id}`) || "1970-01-01T00:00:00.000Z"));
      localStorage.setItem(`${LAST_PULL_KEY}:${account.user.id}`, restored.serverTime);
      reloadSyncedAccountState();
      const now = new Date().toISOString(); localStorage.setItem("north-last-sync-at", now); setLastSyncedAt(now); await refreshLocalSyncState();
    } catch (reason) { setSyncError(reason instanceof Error ? reason.message : "Account versions could not be applied."); }
    finally { syncLock.current = false; setSyncing(false); }
  }

  async function revokeAccountDevice(device: AccountDevice) {
    if (!window.confirm(`Sign out ${device.name || "this device"}?`)) return;
    setAccountStatus("Revoking device…");
    try {
      await withFreshAccess(async (token) => {
        const response = await fetch(`${NORTH_API_BASE}/v1/me/devices/${device.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, ...northDeviceHeaders() } });
        if (!response.ok) throw new Error("Device could not be revoked");
      });
      if (device.id === currentDeviceId) { logoutNorthAccount(); location.assign("/"); return; }
      setAccountDevices((devices) => devices.map((item) => item.id === device.id ? { ...item, revoked_at: new Date().toISOString(), active_sessions: 0 } : item));
      setAccountStatus(`${device.name} was signed out.`);
    } catch (reason) { setAccountStatus(reason instanceof Error ? reason.message : "Device could not be revoked."); }
  }

  function signOutAccount() { logoutNorthAccount(); location.assign("/"); }

  async function shareNorth() {
    const account = readNorthSession();
    const invitationUrl = new URL("/", window.location.origin);
    if (account?.user.username) invitationUrl.searchParams.set("from", account.user.username);
    const invitation = {
      title: "Try North",
      text: `${account?.user.displayName || "A friend"} invited you to try North — plan your training, track your progress, and find your direction.`,
      url: invitationUrl.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(invitation);
        setShareStatus("Invitation shared.");
        return;
      }
      await navigator.clipboard.writeText(`${invitation.text}\n${invitation.url}`);
      setShareStatus("Invitation link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(invitation.url);
        setShareStatus("Invitation link copied.");
      } catch {
        setShareStatus("Could not open sharing. You can share north.bodhix.io directly.");
      }
    }
  }

  const coreScreen = ["today", "journey", "training", "nova-workout-builder", "nova-routine-builder", "workout-library", "workout-template", "nova", "you", "settings"].includes(screen);
  const activeTourStep = tourStep >= 0 ? productTourSteps[tourStep] : null;

  if (!entryComplete) return <Onboarding onComplete={completeOnboarding} onLocalPreview={import.meta.env.DEV ? () => setEntryComplete(true) : undefined} />;
  if (!accountDataReady) return <main className="account-hydration-screen"><BrandLoader label="Restoring your North" /><p>Bringing your plan and saved workouts onto this device…</p></main>;

  return (
    <main className="app-shell member-shell" id="north-content" tabIndex={-1}>
      <a className="skip-link" href="#north-content">Skip to main content</a>
      <header className="topbar">
        <button className="brand" onClick={() => setScreen("today")} aria-label="North home">
          <img className="brand-lockup brand-lockup-light" src="/png/transparent/lockup-horizontal-teal.png" alt="" />
          <img className="brand-lockup brand-lockup-dark" src="/png/transparent/lockup-horizontal-offwhite.png" alt="" />
        </button>
        <div className="topbar-actions">
          {screen === "workout" && timer > 0 && <button className="header-rest-timer" onClick={() => setTimerControlsOpen((open) => !open)} aria-expanded={timerControlsOpen} aria-label={`Rest timer: ${Math.floor(timer / 60)} minutes ${timer % 60} seconds remaining. Open controls`}><TimerReset size={15}/><span><small>REST</small><strong>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</strong></span><ChevronDown size={14}/></button>}
          {screen === "today" && <button className="weather-icon-button" onClick={() => loadLocalWeather()} aria-label={weather ? `Refresh weather, currently ${Math.round(weather.temperature)} degrees Celsius` : "Load local weather"} title={weather ? "Refresh local weather" : "Load local weather"}><span className="header-weather-date">{new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric" }).format(new Date()).toUpperCase()}</span>{weather ? <WeatherMark code={weather.weatherCode} size={20} /> : <CloudSun size={20} />}{weather && <span className="header-weather-temperature">{Math.round(weather.temperature)}°</span>}</button>}
          {readNorthSession() && <button className={`topbar-account-button account-avatar-button ${screen === "settings" ? "active" : ""}`} onClick={() => setScreen("settings")} aria-label="Open account and app settings" title="Account and app settings"><span className="account-avatar-glyph" aria-hidden="true"><i/><b/></span></button>}
        </div>
      </header>

      {!online && <div className="offline-banner" role="status" aria-live="polite"><Database size={15}/><span><strong>Offline mode</strong> Your workout and edits are saved on this device and will sync when connection returns.</span></div>}

      {readNorthSession() && ["you", "account"].includes(screen) && (Boolean(syncError) || syncConflicts.length > 0) && <SyncCentre expanded online={online} syncing={syncing} error={syncError} result={syncResult} conflicts={syncConflicts} lastSyncedAt={lastSyncedAt} onSync={() => void runAccountSync(true)} onResolve={(conflict, choice) => void chooseSyncConflict(conflict, choice)} onResolveAllAccount={() => void keepAllAccountConflictVersions()} />}

      {screen === "today" && (
        <section className="screen today-screen" id="north-primary-screen">
          <section className="today-intro">
            <div><p className="today-greeting">{todayGreeting}</p><h1>{profile.name || "North"}</h1><p className="lead">{todayIntro}</p></div>
          </section>

          <section className={`direction-panel${todayPlan.kind === "run" ? " direction-panel-run" : todayPlan.kind === "strength" ? " direction-panel-strength" : todayPlan.kind === "rest" ? " direction-panel-rest" : ""}`}>
            {(todayPlan.kind === "run" || todayPlan.kind === "strength" || todayPlan.kind === "rest") && <><img className="direction-run-art" src={todayPlan.kind === "strength" ? todayPlan.title === "Upper Body Builder" ? "/png/upper-body-builder.png" : todayPlan.title === "Push Day" ? "/png/push-day.png" : "/png/full-body-foundation.png" : todayPlan.kind === "rest" ? "/png/rest.png" : "/png/run-direction-legs.png"} alt="" /><span className="direction-run-overlay" aria-hidden="true" /></>}
            <div className="direction-panel-copy">
              <p className="eyebrow">TODAY’S DIRECTION</p>
              <h2>{todayPlan.title}</h2>
              <p>{todayPlan.kind === "strength" && todayPlan.workout ? `${todayPlan.workout.length} exercises · ${todayPlan.workout.reduce((sum, exercise) => sum + exercise.sets.length, 0)} working sets · ≈${plannedMinutes(todayPlan.workout)} minutes` : todayPlan.note || `${todayPlan.kind} day`}</p>
              {todayPlanCompleted ? <><span className="direction-complete-stamp"><Check size={14} /> Completed</span><button className="direction-panel-add-session" onClick={() => { setSelectedPlanDayId(todayPlan.id); setScreen("training"); }}>Add a session <ArrowRight size={16} /></button></> : <>{hasProgress && todayPlan.kind !== "rest" && <div className="resume-progress"><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><span>{progress}% complete</span></div>}<button className="primary-button direction-panel-action" onClick={openTodayWorkout}>{hasPreparedDraft && session.planDayId === todayPlan.id ? session.startedAt ? "Resume workout" : "Continue workout setup" : todayPlan.kind === "rest" ? "Plan a workout" : todayPlan.kind === "strength" ? "View today’s workout" : `Open ${todayPlan.kind}`}<ArrowRight size={18} /></button></>}
            </div>
            {todayPlan.kind !== "run" && todayPlan.kind !== "strength" && todayPlan.kind !== "rest" && <span className="direction-mark">{todayPlan.kind === "bike" ? <Bike size={24} /> : todayPlan.kind === "walk" ? <Footprints size={24} /> : todayPlan.kind === "recovery" ? <HeartPulse size={24} /> : <Compass size={24} />}</span>}
          </section>
          {todayActivities.length > 0 && <section className="day-session-stack compact" aria-label="Today's completed sessions"><header><div><p className="eyebrow">TODAY'S RECORD</p><h2>{todayPlanCompleted || todayCompletedWorkout ? "Main session and additional movement" : "Movement recorded today"}</h2></div><span>{todayActivities.length + (todayPlan.kind === "rest" ? 0 : 1)} sessions</span></header>{todayPlan.kind !== "rest" && <article className="primary-session completed"><i><Check size={14}/></i><div><small>MAIN SESSION</small><strong>{todayPlan.title}</strong><span>{todayPlanCompleted || todayCompletedWorkout ? "Completed" : "Planned"}</span></div></article>}{todayActivities.map((activity) => <article key={activity.id} className="completed"><i>{activity.kind === "bike" ? <Bike size={14}/> : activity.kind === "run" ? <Footprints size={14}/> : activity.kind === "walk" ? <PersonStanding size={14}/> : <HeartPulse size={14}/>}</i><div><small>ADDITIONAL ACTIVITY</small><strong>{activity.kind === "bike" ? "Bike ride" : activity.kind === "run" ? "Run" : activity.kind === "walk" ? "Walk" : "Recovery"}</strong><span>{[activity.duration ? `${activity.duration} min` : "", activity.distance ? `${displayDistance(activity.distance).toFixed(1)} ${distanceUnit}` : ""].filter(Boolean).join(" · ") || "Logged"}</span></div></article>)}</section>}
          {weatherStatus && <p className="weather-status" role="status">{weatherStatus}</p>}

          {(todayPlan.sessions?.length ?? 0) > 0 && <section className="day-session-stack compact"><header><div><p className="eyebrow">TODAY'S SESSION STACK</p><h2>Main focus plus supporting work</h2></div><span>{1 + (todayPlan.sessions?.length ?? 0)} sessions</span></header><article className="primary-session"><i>1</i><div><small>MAIN FOCUS</small><strong>{todayPlan.title}</strong><span>{todayPlan.kind}</span></div></article>{todayPlan.sessions?.map((item, index) => <article key={item.id} className={item.status}><i>{index + 2}</i><div><small>{item.role.toUpperCase()}</small><strong>{item.title}</strong><span>{[item.distance ? `${displayDistance(item.distance).toFixed(1)} ${distanceUnit}` : "", item.duration ? `${item.duration} min` : "", item.kind].filter(Boolean).join(" · ")}</span></div></article>)}</section>}

          <button className="daily-check-in" onClick={() => { setDraftCheckIn({ id: "", date: isoDate(new Date()), weight: checkIns[0]?.weight ? displayBodyWeight(checkIns[0].weight).toFixed(1).replace(/\.0$/, "") : "", sleep: "", energy: 3, soreness: 2, note: "" }); setScreen("check-in"); }}><HeartPulse size={19} /><div><strong>{checkIns[0]?.date === isoDate(new Date()) ? "Today is checked in" : "How are you arriving today?"}</strong><small>{checkIns[0]?.date === isoDate(new Date()) ? `Energy ${checkIns[0].energy}/5 · Soreness ${checkIns[0].soreness}/5` : "Energy, recovery, sleep, and anything worth knowing"}</small></div><ArrowRight size={16} /></button>

          <section className="today-week-pulse"><div className="today-week-pulse-copy"><p className="eyebrow">YOUR WEEK</p><h2>{completedWeekDays ? `${completedWeekDays} of ${plannedWeekDays.length} sessions complete.` : "Your week is ready."}</h2><p>{weekTrainingMinutes ? `${weekTrainingMinutes} minutes already in the record.` : "Your plan can change with real life."}</p></div><div className="week-pulse-orbit" style={{ "--week-progress": `${weeklyPulseProgress * 3.6}deg` } as CSSProperties}><b>{weeklyPulseProgress}%</b><small>COMPLETE</small></div><div className="week-pulse-days" aria-label="This week's plan">{currentWeekPlan.map((day) => <button key={day.id} className={`${day.status} ${day.date === todayPlan.date ? "today" : ""}`} onClick={() => { selectPlanDay(day); setScreen("training"); }} aria-label={`${day.label}: ${day.title}, ${day.status}`}><span>{day.label.slice(0, 1)}</span><i>{day.status === "completed" ? <Check size={12}/> : day.kind === "rest" ? <Moon size={11}/> : day.kind === "recovery" ? <HeartPulse size={11}/> : ""}</i></button>)}</div>{upcomingMilestones[0] && <button className="week-pulse-milestone" onClick={() => { setJourneyTab("milestones"); setScreen("journey"); }}><span>Next milestone</span><strong>{upcomingMilestones[0].title.replace(/^Chapter \d+: /, "")}</strong><em>{upcomingMilestones[0].progress}% complete</em><i><b style={{ width: `${upcomingMilestones[0].progress}%` }} /></i><ArrowRight size={14}/></button>}</section>

          <section className="today-record"><header><div><p className="eyebrow">THE RECORD</p><h2>Where you are now.</h2></div><button onClick={() => { setJourneyTab("timeline"); setScreen("journey"); }}>Open Journey <ArrowRight size={14}/></button></header>{latestWorkout ? <button className="today-record-item" onClick={() => openHistory(latestWorkout, "training")}><span><History size={17}/></span><div><small>LAST SESSION</small><strong>{latestWorkoutTitle ?? "Workout completed"}</strong><p>{formatSessionDate(workoutRecordDate(latestWorkout))}{sessionSetCount(latestWorkout) ? ` · ${sessionSetCount(latestWorkout)} working sets` : " · Recorded in North"}</p></div><ArrowRight size={16}/></button> : <div className="today-record-item"><span><History size={17}/></span><div><small>LAST SESSION</small><strong>Your record starts here.</strong><p>Complete a session to begin your Journey.</p></div></div>}{upNextPlan ? <button className="today-record-item" onClick={() => { setSelectedPlanDayId(upNextPlan.id); setScreen("training"); }}><span>{upNextPlan.kind === "bike" ? <Bike size={17}/> : upNextPlan.kind === "run" ? <Footprints size={17}/> : upNextPlan.kind === "recovery" ? <HeartPulse size={17}/> : <CalendarDays size={17}/>}</span><div><small>UP NEXT</small><strong>{upNextPlan.title}</strong><p>{formatSessionDate(`${upNextPlan.date}T12:00:00`)} · {upNextPlan.kind}</p></div><ArrowRight size={16}/></button> : <button className="today-record-item" onClick={() => setScreen("training")}><span><Plus size={17}/></span><div><small>UP NEXT</small><strong>Shape your next session.</strong><p>Build a workout, add a ride, or leave room to recover.</p></div><ArrowRight size={16}/></button>}</section>

          <p className="quiet-copy">Head North. Every day.</p>
        </section>
      )}

      {screen === "journey" && (
        <section className="screen destination-screen journey-destination">
          <header className="journey-page-header"><div><p className="eyebrow">YOUR JOURNEY</p><h1>See how far you’ve come.</h1><p>Progress is more than a number. It is the story of choosing to continue.</p></div><span><MapIcon size={22} /></span></header>
          <nav className="journey-tabs" aria-label="Journey views">{(["timeline", "milestones", "insights", "this-day"] as const).map((tab) => <button key={tab} className={journeyTab === tab ? "active" : ""} onClick={() => setJourneyTab(tab)}><span aria-hidden="true">{tab === "timeline" ? <MapIcon size={17} /> : tab === "milestones" ? <Award size={17} /> : tab === "insights" ? <TrendingUp size={17} /> : <CalendarDays size={17} />}</span><b>{tab === "this-day" ? "This Day" : tab[0].toUpperCase() + tab.slice(1)}</b></button>)}</nav>
          {journeyTab === "timeline" && <>
            <section className="journey-stats"><div><i><Dumbbell size={16} /></i><strong>{history.length}</strong><span>workouts</span></div><div><i><Award size={16} /></i><strong>{history.reduce((total, item) => total + sessionSetCount(item), 0)}</strong><span>completed sets</span></div><div><i><Clock3 size={16} /></i><strong>{lifetimeTrainingMinutes}</strong><span>total minutes</span></div><div><i><Bike size={16} /></i><strong>{displayDistance(activities.reduce((total, item) => total + (Number.parseFloat(item.distance) || 0), 0)).toFixed(1)}</strong><span>distance {distanceUnit}</span></div><div><i><HeartPulse size={16} /></i><strong>{checkIns[0]?.weight ? displayWeight(checkIns[0].weight).toFixed(1) : "—"}</strong><span>latest {weightUnit}</span></div></section>
            {timelineDate && timelineDate <= isoDate(new Date()) && <section className="journey-backfill"><button className="journey-backfill-launch" onClick={() => setBackfillOpen((open) => !open)}><span><Plus size={19}/></span><div><small>{timelineDate < isoDate(new Date()) ? "MISSING SOMETHING?" : "ADD TO TODAY"}</small><strong>{timelineDate < isoDate(new Date()) ? "Add a workout performed this day" : "Add another workout"}</strong><p>North will preserve when it happened and when it was entered.</p></div><ChevronDown className={backfillOpen ? "open" : ""}/></button>{backfillOpen && <div className="journey-backfill-picker"><header><div><p className="eyebrow">BACKFILL WORKOUT</p><h2>{formatSessionDate(`${timelineDate}T12:00:00`)}</h2></div><button onClick={() => setBackfillOpen(false)} aria-label="Close backfill options"><X/></button></header>{weeklyPlan.find((day) => day.date === timelineDate && day.kind === "strength") && (() => { const day = weeklyPlan.find((item) => item.date === timelineDate)!; return <button className="backfill-planned" onClick={() => prepareBackfill(day.workout?.length ? day.workout : starterExercises, day.title, day.id)}><CalendarDays/><div><small>PLANNED FOR THIS DAY</small><strong>Complete {day.title}</strong><span>{day.workout?.length ?? starterExercises.length} exercises</span></div><ArrowRight/></button>; })()}<button className="backfill-blank" onClick={() => prepareBackfill([], "Custom workout")}><Plus/><div><strong>Build from scratch</strong><span>Start empty and add only what you performed</span></div><ArrowRight/></button><label className="backfill-search"><Search/><input value={backfillSearch} onChange={(event) => setBackfillSearch(event.target.value)} placeholder="Search premade and My Workouts" /></label><div className="backfill-template-groups"><section><h3>MY WORKOUTS</h3>{personalTemplates.filter((template) => !backfillSearch || `${template.name} ${template.focus}`.toLowerCase().includes(backfillSearch.toLowerCase())).slice(0,6).map((template) => <button key={template.id} onClick={() => prepareBackfill(exercisesFromTemplate(template), template.name)}><Heart/><span><strong>{template.name}</strong><small>{template.duration} min · {template.exercises.length} exercises</small></span><ArrowRight/></button>)}{personalTemplates.length === 0 && <p>Saved personal workouts will appear here.</p>}</section><section><h3>NORTH WORKOUTS</h3>{workoutTemplates.filter((template) => !backfillSearch || `${template.name} ${template.focus} ${template.goal}`.toLowerCase().includes(backfillSearch.toLowerCase())).slice(0,8).map((template) => <button key={template.id} onClick={() => prepareBackfill(exercisesFromTemplate(template), template.name)}><Dumbbell/><span><strong>{template.name}</strong><small>{template.focus} · {template.duration} min</small></span><ArrowRight/></button>)}</section></div></div>}</section>}
            <section className="timeline-moments"><div className="section-heading"><div><p className="eyebrow">TIMELINE</p><h2>{timelineDate ? formatSessionDate(`${timelineDate}T12:00:00`) : "Your moments"}</h2></div><span>{filteredTimeline.length}</span></div><div className="timeline-toolbar"><details><summary><ListFilter size={15} /><span>{timelineFilter === "All" ? "All moments" : timelineFilter}</span><ChevronDown size={14} /></summary><div className="timeline-toolbar-menu">{["All", "Workouts", "Activities", "Check-ins", "Reflections", "Photos"].map((filter) => <button key={filter} className={timelineFilter === filter ? "active" : ""} onClick={() => { setTimelineFilter(filter); }}>{filter === "All" ? "All moments" : filter}</button>)}</div></details><details><summary><ArrowDownUp size={15} /><span>{timelineSort === "newest" ? "Newest first" : "Oldest first"}</span><ChevronDown size={14} /></summary><div className="timeline-toolbar-menu timeline-sort-menu"><button className={timelineSort === "newest" ? "active" : ""} onClick={() => setTimelineSort("newest")}>Newest first</button><button className={timelineSort === "oldest" ? "active" : ""} onClick={() => setTimelineSort("oldest")}>Oldest first</button></div></details><label className="timeline-date-control"><CalendarDays size={15} /><input type="date" value={timelineDate} onChange={(event) => setTimelineDate(event.target.value)} aria-label="Filter timeline by date" /></label>{(timelineFilter !== "All" || timelineDate) && <div className="timeline-active-filters">{timelineFilter !== "All" && <button onClick={() => setTimelineFilter("All")}>{timelineFilter}<X size={12} /></button>}{timelineDate && <button onClick={() => setTimelineDate("")}>{formatSessionDate(`${timelineDate}T12:00:00`)}<X size={12} /></button>}</div>}</div></section>
            <section className="timeline unified-timeline">{filteredTimeline.map((item) => {
              const content = <><span>{journeyMomentIcon(item)}</span><div><small>{item.type.toUpperCase()} · {formatSessionDate(item.date).toUpperCase()}</small><h3>{item.title}</h3>{"photo" in item && item.photo && <img src={item.photo.dataUrl} alt={item.photo.caption || "Journey memory"} />}<p>{item.summary}</p>{"photo" in item && item.photo && <button className="photo-delete" onClick={() => removeJourneyPhoto(item.photo.id)}>Remove photo</button>}</div></>;
              return "workout" in item && item.workout ? <button className={`timeline-entry ${journeyMomentTone(item)}`} key={item.id} onClick={() => openHistory(item.workout, "journey")}>{content}</button> : <article className={journeyMomentTone(item)} key={item.id}>{content}</article>;
            })}{filteredTimeline.length === 0 && <article><span><Compass size={16} /></span><div><small>NO MATCHING MOMENTS</small><h3>Your record is still here.</h3><p>Clear the date or choose another filter.</p></div></article>}<article><span><Compass size={16} /></span><div><small>YOUR BEGINNING</small><h3>You chose a direction.</h3><p>Every journey needs somewhere honest to begin.</p></div></article></section>
            <section className="photo-add"><div><strong>Add a private Journey photo</strong><small>Stored only in this browser and your exported backup · maximum 2 MB.</small></div><input value={photoCaption} onChange={(event) => setPhotoCaption(event.target.value)} placeholder="Optional caption" /><label><Plus size={14} /> Choose photo<input type="file" accept="image/*" onChange={addJourneyPhoto} /></label></section>
          </>}
          {journeyTab === "insights" && <>
            <section className="momentum-panel"><div><span>LAST FOUR WEEKS</span><strong>You’re building a record, not a score.</strong><p>{fourWeekTrends.reduce((sum, week) => sum + week.workouts, 0)} workouts · {fourWeekTrends.reduce((sum, week) => sum + week.minutes, 0)} minutes · {Math.round(displayWeight(fourWeekTrends.reduce((sum, week) => sum + week.volume, 0))).toLocaleString()} {weightUnit} volume.</p></div><TrendingUp size={27} /></section>
            <section className="four-week-chart">{fourWeekTrends.map((week) => <article key={week.label}><div><i style={{ height: `${Math.max(5, Math.min(90, week.minutes))}px` }} /></div><strong>{week.workouts}</strong><span>{week.label}</span><small>{week.minutes}m</small></article>)}</section>
            <section className="insight-next-step"><div><p className="eyebrow">YOUR NEXT SIGNAL</p>{history.length === 0 ? <><strong>Complete your first workout.</strong><p>One honest session gives North something real to build on.</p></> : !recoveryComparison ? <><strong>Pair a check-in with a workout.</strong><p>Three paired days reveal how your recovery and training are moving together.</p></> : <><strong>Your record is ready to explore.</strong><p>Use the sections below to see the patterns North can support with evidence.</p></>}</div><button className="secondary-button" onClick={() => history.length === 0 ? setScreen("training") : setScreen("check-in")}>{history.length === 0 ? "Open training" : "Check in"}<ArrowRight size={15}/></button></section>
            <div className="section-heading"><div><p className="eyebrow">FOCUS AREAS</p><h2>Muscle-group volume</h2></div></div>
            <section className="insight-muscles">{fourWeekMuscleDistribution.length ? fourWeekMuscleDistribution.map(([category, sets]) => <div key={category}><span>{category}</span><div><i style={{ width: `${Math.round(sets / fourWeekMuscleDistribution[0][1] * 100)}%` }} /></div><strong>{sets} sets</strong></div>) : <p>Complete workouts to reveal four-week muscle-group distribution.</p>}</section>
            <div className="section-heading"><div><p className="eyebrow">STRENGTH TREND</p><h2>Estimated rep-max direction</h2></div></div>
            <section className="exercise-trend-list">{exerciseTrends.map((item) => <article key={item.name}><div><strong>{item.name}</strong><small>{item.points.length} recorded sessions · volume {item.volumeChange >= 0 ? "+" : ""}{Math.round(displayWeight(item.volumeChange)).toLocaleString()} {weightUnit}</small></div><b className={item.change >= 0 ? "positive" : "negative"}>{item.change >= 0 ? "+" : ""}{displayWeight(item.change).toFixed(1)} {weightUnit}</b><span>estimated max</span></article>)}{exerciseTrends.length === 0 && <p>Repeat an exercise in two completed workouts to see its direction.</p>}</section>
            <div className="section-heading"><div><p className="eyebrow">ACTIVITY TREND</p><h2>Pace and speed</h2></div></div>
            <section className="activity-trend-list">{activityTrends.map((item) => <div key={item.id}><span>{item.kind === "bike" ? <Bike size={14} /> : <PersonStanding size={14} />}</span><div><strong>{item.kind === "bike" ? "Bike" : item.kind === "run" ? "Run" : "Walk"}</strong><small>{formatSessionDate(`${item.date}T12:00:00`)} · {displayDistance(item.distance).toFixed(1)} {distanceUnit} · {item.duration} min</small></div><b>{item.kind === "bike" ? `${displayDistance(item.pace).toFixed(1)} ${distanceUnit}/h` : `${(item.pace / (distanceUnit === "km" ? 1 : 0.621371)).toFixed(1)} min/${distanceUnit}`}</b></div>)}{activityTrends.length === 0 && <p>Add duration and distance to activity logs to calculate pace or speed.</p>}</section>
            <section className="recovery-evidence"><p className="eyebrow">RECOVERY CONTEXT</p>{recoveryComparison ? <><strong>{recoveryComparison.count} same-day check-in/workout pairs</strong><p>{recoveryComparison.lowDifficulty !== null ? `Low-energy days average ${recoveryComparison.lowDifficulty.toFixed(1)}/5 workout difficulty. ` : ""}{recoveryComparison.highDifficulty !== null ? `Higher-energy days average ${recoveryComparison.highDifficulty.toFixed(1)}/5. ` : ""}This is an association in your records, not proof that energy caused workout difficulty.</p></> : <><strong>More paired days are needed</strong><p>North needs at least three dates containing both a check-in and a completed workout before comparing recovery context.</p></>}</section>
            <div className="section-heading"><div><p className="eyebrow">PERSONAL BESTS</p><h2>Recent progress</h2></div></div><section className="pr-list">{personalRecords.slice(0, 6).map((record) => <article key={record.id}><span><Trophy size={15} /></span><div><small>PERSONAL BEST · {formatSessionDate(record.date)}</small><strong>{record.exerciseName}</strong><em>Previous {displayWeight(record.previous).toFixed(1)} {weightUnit}</em></div><b>{displayWeight(record.weight).toFixed(1)} <small>{weightUnit}</small></b></article>)}{personalRecords.length === 0 && <p>New load records appear after a movement has a previous result to compare.</p>}</section>
            <div className="section-heading"><div><p className="eyebrow">WHAT NORTH HAS LEARNED</p><h2>Evidence and limits</h2></div></div><section className="learned-list">{visibleLearnedInsights.map((insight) => <button key={insight.id} className={expandedInsightId === insight.id ? "expanded" : ""} onClick={() => setExpandedInsightId((value) => value === insight.id ? null : insight.id)}><span>{insight.icon}</span><div><strong>{insight.title}</strong><small>{insight.summary}</small>{expandedInsightId === insight.id && <p>{insight.evidence}</p>}</div>{expandedInsightId === insight.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>)}</section>
          </>}
          {journeyTab === "this-day" && <><section className="momentum-panel"><div><span>THIS DAY, ACROSS TIME</span><strong>{thisDayItems.length ? `${thisDayItems.length} ${thisDayItems.length === 1 ? "memory" : "memories"} to revisit` : "A memory will meet you here"}</strong><p>North looks for moments from one week, one month, six months, and one year ago. Nothing is invented when no memory exists.</p></div><CalendarDays size={27} /></section><section className="timeline unified-timeline">{thisDayItems.map((item) => <article className={journeyMomentTone(item)} key={`${item.id}-${item.interval}`}><span>{journeyMomentIcon(item)}</span><div><small>{item.interval} · {formatSessionDate(item.date).toUpperCase()}</small><h3>{item.title}</h3><p>{item.summary}</p></div></article>)}{thisDayItems.length === 0 && <article><span><CalendarDays size={16} /></span><div><small>NO MEMORY AT THESE INTERVALS YET</small><h3>Today is becoming part of the story.</h3><p>When you log a moment one week, month, six months, or year from now, North can bring it back here.</p></div></article>}</section></>}
          {journeyTab === "milestones" && <><section className="milestone-summary"><div><small>YOUR JOURNEY MARK</small><strong>Chapter {currentChapter}</strong><span>{unlockedMilestones.length}/{milestoneResults.length} achievements unlocked</span><em>Keep knocking off achievements as you go.</em></div><div className="milestone-ring" style={{ "--milestone-progress": `${Math.round(unlockedMilestones.length / milestoneResults.length * 360)}deg` } as CSSProperties}><b>{Math.round(unlockedMilestones.length / milestoneResults.length * 100)}%</b></div></section><section className="chapter-progress" aria-label="Chapter achievement progress">{chapterProgress.map((chapter) => <button key={chapter.chapter} className={`${chapter.chapter === currentChapter ? "current" : ""} ${chapter.chapter === selectedMilestoneChapter ? "selected" : ""}`} onClick={() => setSelectedMilestoneChapter(chapter.chapter)}><small>CH {chapter.chapter}</small><b>{chapter.unlocked}/{chapter.total}</b></button>)}</section><div className="section-heading chapter-heading"><div><p className="eyebrow">CHAPTER {selectedMilestoneChapter}</p><h2>Recognition in progress</h2></div><span>{chapterProgress[selectedMilestoneChapter - 1]?.unlocked}/20</span></div><div className="picker-filters milestone-filters chapter-filters">{["All", "Completed", ...milestoneCategories.filter((category) => category !== "All")].map((category) => <button key={category} className={milestoneFilter === category ? "active" : ""} onClick={() => setMilestoneFilter(category)}>{category}</button>)}</div><section className="milestone-list chapter-milestone-list">{filteredChapterMilestones.map((milestone) => <article key={milestone.id} className={milestone.unlocked ? "unlocked" : ""} data-chapter={milestone.chapter}><span>{milestone.unlocked ? <Check size={15} /> : `${milestone.progress}%`}</span><div><strong>{milestone.title.replace(`Chapter ${milestone.chapter}: `, "")}</strong>{!milestone.unlocked && <div className="milestone-progress"><i style={{ width: `${milestone.progress}%` }} /></div>}<small>{milestone.unlocked ? `Unlocked ${formatSessionDate(milestone.achievedAt)}` : `${milestone.value.toLocaleString()} / ${milestone.target.toLocaleString()}`} · {milestone.category}</small></div></article>)}{filteredChapterMilestones.length === 0 && <p>No achievements match this filter in Chapter {selectedMilestoneChapter}.</p>}</section></>}
        </section>
      )}

      {screen === "training" && (
        <section className="screen destination-screen training-destination">
          <header className="training-page-header"><div><p className="eyebrow">TRAINING</p><h1>Own the work.</h1><p>Your plan. Your progress. Your strength.</p></div><div className="training-page-actions"><button aria-label="Review this week" title={weeklyReviews.some((item) => item.weekStart === weeklyPlan[0].date) ? "Revisit this week" : "Reflect on this week"} onClick={() => { const existing = weeklyReviews.find((item) => item.weekStart === weeklyPlan[0].date); setDraftReview(existing ? { proud: existing.proud, learned: existing.learned, next: existing.next } : { proud: "", learned: "", next: "" }); setScreen("weekly-review"); }}><NotebookPen size={20} /></button><button aria-label="Open progression and personal records" title="Progression and personal records" onClick={() => setScreen("progression")}><Trophy size={21} /></button></div></header>
          <div className="section-heading training-rhythm-heading"><div className="choice-row" aria-label="Planning week"><button className={planningWeekOffset === 0 ? "active" : ""} onClick={() => showPlanningWeek(0)}>This week</button><button className={planningWeekOffset === 1 ? "active" : ""} onClick={() => showPlanningWeek(1)}>Next week</button></div><button className="text-button" onClick={() => setScreen("week-plan")}>See full week <ArrowRight size={14} /></button></div>
          <section className="week-strip training-rhythm-strip">
            {viewedWeekPlan.map((day) => <button key={day.id} onClick={() => selectPlanDay(day)} className={`${day.id === selectedPlanDay.id ? "selected" : ""} ${day.date === isoDate(new Date()) ? "today" : ""} ${day.status}`}><span>{day.label.slice(0, 1)}</span><small>{Number(day.date.slice(-2))}</small><i>{day.status === "completed" ? "✓" : day.status === "skipped" ? "×" : day.kind === "strength" ? "●" : day.kind === "rest" ? "—" : "·"}</i></button>)}
          </section>
          <section className={`training-hero ${selectedPlanDay.kind}`}>
            <div className="training-hero-copy"><p className="eyebrow">TODAY’S TRAINING</p><h2>{selectedPlanDay.title}</h2><div className="training-muscle-tags">{selectedPlanDay.kind === "strength" ? Array.from(new Set(selectedWorkout.map((item) => exerciseLibrary.find((entry) => entry.name === item.name)?.category).filter(Boolean))).slice(0, 3).map((group) => <span key={group}>{group}</span>) : <span>{selectedPlanDay.kind}</span>}</div><div className="training-hero-metrics"><span><Clock3 size={16} /><strong>{selectedPlanDay.kind === "strength" ? `${plannedMinutes(selectedWorkout)} min` : "Open"}</strong><small>EST. TIME</small></span><span><TrendingUp size={16} /><strong>{selectedPlanDay.kind === "strength" ? plannedIntensity(selectedWorkout) : "Steady"}</strong><small>INTENSITY</small></span><span><Dumbbell size={16} /><strong>{selectedPlanDay.kind === "strength" ? selectedWorkout.flatMap((item) => item.sets).length : "—"}</strong><small>SETS</small></span></div></div>
            <div className="training-body-state" aria-hidden="true"><AnatomyMap compact showBack={false} {...selectedMuscleActivation} /></div>
            <div className="training-hero-actions">{selectedPlanDay.kind === "rest" ? <button className="primary-button" onClick={() => setTrainingDetailsOpen(true)}><Dumbbell size={17} />Plan a workout<ArrowRight size={16} /></button> : <><button className="primary-button" onClick={beginPlannedDay}><Play size={17} />{hasPreparedDraft && session.planDayId === selectedPlanDay.id ? session.startedAt ? "Resume workout" : "Continue setup" : "Start workout"}</button><button className="secondary-button" onClick={() => setTrainingDetailsOpen((open) => !open)}>{trainingDetailsOpen ? "Close editor" : "Edit workout"}<ArrowRight size={16} /></button></>}</div>
          </section>
          {selectedPlanDay.kind !== "rest" && <button className="training-add-session" onClick={() => { setTrainingDetailsOpen(true); setStackComposerOpen(true); }}><Plus size={16} /> Add session</button>}
          {trainingDetailsOpen && <section className="plan-editor training-details-drawer">
            {selectedPlanDay.kind === "strength" && plannedPickerOpen && <ExercisePickerV2 onAdd={(exercise) => addPlannedExercise(toLegacyExerciseDefinition(exercise))} onView={(exercise) => openExercisePreview(toLegacyExerciseDefinition(exercise))} addedIds={selectedWorkout.map((exercise) => exercise.canonicalExerciseId).filter((id): id is string => Boolean(id))}/>}
            <div className="plan-date"><div><p className="eyebrow">{selectedPlanDay.label.toUpperCase()} · {formatSessionDate(`${selectedPlanDay.date}T12:00:00`).toUpperCase()}</p><h3>{selectedPlanDay.title}</h3></div><span>{selectedPlanDay.status}</span></div>
            {selectedPlanDay.kind === "strength" && <section className="workout-edit-station"><header><div><p className="eyebrow">WORKOUT EDIT STATION</p><h3>Choose it. Build it. Make it yours.</h3></div><SlidersHorizontal size={20} /></header><div><button className="premade" onClick={() => { setTemplateSource("north"); setScreen("workout-library"); }}><span><Sparkles size={17} /></span><b><strong>Premade workouts</strong><small>Browse by area, goal or time</small></b><ArrowRight size={15} /></button><button className="personal" onClick={() => { setTemplateSource("personal"); setScreen("workout-library"); }}><span><Heart size={17} /></span><b><strong>My workouts</strong><small>Saved, favourite and custom</small></b><ArrowRight size={15} /></button></div><p>Your current movements stay editable below. Choosing a workout replaces only this selected day.</p></section>}
            <div className="kind-picker">{(["strength", "bike", "walk", "run", "recovery", "rest"] as ActivityKind[]).map((kind) => <button key={kind} className={selectedPlanDay.kind === kind ? "active" : ""} onClick={() => patchPlanDay({ kind, title: kind === "strength" ? "Strength session" : kind === "bike" ? "Bike ride" : kind === "walk" ? "Walk" : kind === "run" ? "Run" : kind === "recovery" ? "Recovery and mobility" : "Rest", workout: kind === "strength" ? (selectedPlanDay.workout?.length ? selectedPlanDay.workout : resetExercises(starterExercises)) : undefined })}>{kind}</button>)}</div>
            <label><span>Session</span><input value={selectedPlanDay.title} onChange={(event) => patchPlanDay({ title: event.target.value })} /></label><label><span>Plan note</span><textarea rows={2} value={selectedPlanDay.note} onChange={(event) => patchPlanDay({ note: event.target.value })} placeholder="Anything worth knowing before the day begins?" /></label>
            {selectedPlanDay.kind === "strength" && <section className="planned-workout-prescriptions"><header><div><p className="eyebrow">EXERCISE PRESCRIPTIONS</p><h3>Edit every detail</h3></div><span>{selectedWorkout.length} exercises</span></header><button className="planned-workout-edit" type="button" onClick={() => setPlannedPickerOpen((open) => !open)}>{plannedPickerOpen ? <X size={15} /> : <Plus size={15} />}{plannedPickerOpen ? "Close exercise picker" : "Edit this workout"}</button>{plannedPickerOpen && <section className="exercise-picker planned-exercise-picker"><label className="search-field"><Search size={17} /><input value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder={`Search ${exerciseLibrary.length} exercises`} /></label><div className="picker-filters">{exerciseCategories.map((category) => <button key={category} className={exerciseCategory === category ? "active" : ""} onClick={() => setExerciseCategory(category)}>{category}</button>)}</div><div className="picker-results">{filteredLibrary.map((exercise) => <button key={exercise.name} onClick={() => addPlannedExercise(exercise)}><span><strong>{exercise.name}</strong><small>{exercise.category} · {exercise.equipment} · {exercise.target}</small></span><Plus size={17} /></button>)}</div></section>}{selectedWorkout.map((exercise) => <article key={exercise.id}><div className="planned-exercise-title"><strong>{exercise.name}</strong><button type="button" onClick={() => removePlannedExercise(exercise.id)} aria-label={`Remove ${exercise.name}`} title={`Remove ${exercise.name}`}><Trash2 size={15} /></button></div><div><label><span>Sets</span><input type="number" min="1" max="10" value={exercise.sets.length} onChange={(event) => resizePlannedExercise(exercise, Number(event.target.value) || 1)} /></label><label><span>Reps, time, or distance</span><input value={exercise.target.replace(/^\d+\s*sets?\s*·?\s*/i, "")} onChange={(event) => patchPlannedExercise(exercise.id, { target: `${exercise.sets.length} sets · ${event.target.value}` })} placeholder="8–12 reps, 30 sec, 400 m" /></label><label><span>Rest (sec)</span><input type="number" min="0" max="600" value={exercise.rest} onChange={(event) => patchPlannedExercise(exercise.id, { rest: Math.max(0, Number(event.target.value) || 0) })} /></label></div></article>)}</section>}
            <section className="day-session-stack"><header><div><p className="eyebrow">SESSION STACK</p><h3>Everything planned today</h3></div><button type="button" onClick={() => setStackComposerOpen((open) => !open)}><Plus size={14} /> Add session</button></header><article className="primary-session"><i>1</i><div><small>MAIN FOCUS</small><strong>{selectedPlanDay.title}</strong><span>{selectedPlanDay.kind}</span></div></article>{(selectedPlanDay.sessions ?? []).map((item, index) => <article key={item.id} className={item.status}><i>{index + 2}</i><div><small>{item.role.toUpperCase()}</small><strong>{item.title}</strong><span>{[item.distance ? `${displayDistance(item.distance).toFixed(1)} ${distanceUnit}` : "", item.duration ? `${item.duration} min` : "", item.kind].filter(Boolean).join(" · ")}</span></div><div className="stack-actions"><button type="button" onClick={() => openPlannedSession(item)}>{item.kind === "strength" ? "Prepare" : "Log"}</button><button type="button" onClick={() => patchPlannedSession(item.id, { status: item.status === "skipped" ? "planned" : "skipped" })}>{item.status === "skipped" ? "Restore" : "Skip"}</button><button type="button" aria-label={`Remove ${item.title}`} onClick={() => removePlannedSession(item.id)}><X size={14} /></button></div></article>)}{stackComposerOpen && <div className="stack-composer"><div><label><span>Type</span><select value={draftPlannedSession.kind} onChange={(event) => { const kind = event.target.value as PlannedSession["kind"]; setDraftPlannedSession((value) => ({ ...value, kind, title: kind === "bike" ? "Zone 2 bike ride" : kind === "strength" ? "Strength session" : kind === "walk" ? "Walk" : kind === "run" ? "Run" : "Recovery session" })); }}><option value="bike">Bike</option><option value="strength">Strength</option><option value="walk">Walk</option><option value="run">Run</option><option value="recovery">Recovery</option></select></label><label><span>Purpose</span><select value={draftPlannedSession.role} onChange={(event) => setDraftPlannedSession((value) => ({ ...value, role: event.target.value as SessionRole }))}><option value="warm-up">Warm-up</option><option value="secondary">Secondary</option><option value="recovery">Recovery</option><option value="optional">Optional</option></select></label></div><label><span>Session name</span><input value={draftPlannedSession.title} onChange={(event) => setDraftPlannedSession((value) => ({ ...value, title: event.target.value }))} /></label><div><label><span>Distance ({distanceUnit})</span><DeferredUnitInput storedValue={draftPlannedSession.distance} formatValue={displayDistance} storeValue={storeDistance} onCommit={(distance) => setDraftPlannedSession((value) => ({ ...value, distance }))} label={`Planned distance in ${distanceUnit}`} /></label><label><span>Duration (min)</span><input inputMode="numeric" value={draftPlannedSession.duration} onChange={(event) => setDraftPlannedSession((value) => ({ ...value, duration: event.target.value }))} /></label></div><label><span>Notes or intensity</span><input value={draftPlannedSession.note} onChange={(event) => setDraftPlannedSession((value) => ({ ...value, note: event.target.value }))} placeholder="Zone 2, easy pace, route…" /></label><button type="button" className="primary-button" onClick={addPlannedSession}>Add to this day</button></div>}</section>
            <div className="plan-actions"><button onClick={() => movePlanDay(-1)} disabled={weeklyPlan[0].id === selectedPlanDay.id}><ArrowLeft size={13} /> Earlier</button><button onClick={() => movePlanDay(1)} disabled={weeklyPlan[weeklyPlan.length - 1].id === selectedPlanDay.id}>Later <ArrowRight size={13} /></button><button onClick={() => patchPlanDay({ status: selectedPlanDay.status === "skipped" ? "planned" : "skipped" })}>{selectedPlanDay.status === "skipped" ? "Restore" : "Skip"}</button></div><div className="plan-save-row"><button type="button" onClick={() => void saveSelectedWorkout()} disabled={syncing}><Save size={16}/>{syncing ? "Saving…" : "Save this workout"}</button><span>{planSaveStatus}</span></div>{selectedPlanDay.kind !== "rest" && <button className="primary-button" onClick={beginPlannedDay}>{selectedPlanDay.kind === "strength" ? "Prepare this workout" : `Log ${selectedPlanDay.kind}`}<ArrowRight size={16} /></button>}{selectedPlanDay.kind === "rest" && <p className="rest-message"><BedDouble size={17} /> Rest is part of the plan, not a missed day.</p>}
          </section>}
          <div className="training-desktop-choices">
            <section className="workout-builder-section">
              <div className="section-heading"><div><p className="eyebrow">BUILD YOUR WORKOUT</p><h2>Choose your starting point</h2></div></div>
              <div className="workout-builder-grid">
                <button className="workout-builder-option program" onClick={() => setScreen("programs")}><MapIcon size={19} /><strong>Training program</strong><small>{programs.length} guided paths</small></button>
                <button className="workout-builder-option premade" onClick={() => setScreen("workout-library")}><Dumbbell size={19} /><strong>Premade workout</strong><small>{workoutTemplates.length} ready sessions</small></button>
                <button className="workout-builder-option custom" onClick={() => setScreen("nova-workout-builder")}><Sparkles size={19} /><strong>Build with Nova</strong><small>Guided workout setup</small></button>
                <button className="workout-builder-option personal" onClick={() => { setTemplateSource("personal"); setScreen("workout-library"); }}><Heart size={19} /><strong>My workouts</strong><small>{personalTemplates.length} saved by you</small></button>
              </div>
            </section>
            <section className="quick-log-section">
              <div className="section-heading"><div><p className="eyebrow">QUICK LOG</p><h2>Move outside the plan</h2></div></div>
              <section className="activity-shortcuts">
                <button className="activity-bike" onClick={() => openActivity("bike")}><Bike size={18} /><span className="quick-log-total"><strong>{displayDistance(bikeTotals.distance).toFixed(1)}</strong><small>{distanceUnit}</small></span>Bike</button>
                <button className="activity-walk" onClick={() => openActivity("walk")}><PersonStanding size={18} /><span className="quick-log-total"><strong>{displayDistance(walkTotals.distance).toFixed(1)}</strong><small>{distanceUnit}</small></span>Walk</button>
                <button className="activity-run" onClick={() => openActivity("run")}><PersonStanding size={18} /><span className="quick-log-total"><strong>{displayDistance(runTotals.distance).toFixed(1)}</strong><small>{distanceUnit}</small></span>Run</button>
                <button className="activity-recovery" onClick={() => openActivity("recovery")}><HeartPulse size={18} /><span className="quick-log-total"><strong>{recoveryTotals.sessions}</strong><small>logs</small></span>Recovery</button>
              </section>
            </section>
          </div>
          {trainingDetailsOpen && screen !== "training" && <section className="plan-editor training-details-drawer">
            <div className="plan-date"><div><p className="eyebrow">{selectedPlanDay.label.toUpperCase()} · {formatSessionDate(`${selectedPlanDay.date}T12:00:00`).toUpperCase()}</p><h3>{selectedPlanDay.title}</h3></div><span>{selectedPlanDay.status}</span></div>
            {selectedPlanDay.kind === "strength" && <section className="workout-edit-station"><header><div><p className="eyebrow">WORKOUT EDIT STATION</p><h3>Choose it. Build it. Make it yours.</h3></div><SlidersHorizontal size={20} /></header><div><button className="premade" onClick={() => { setTemplateSource("north"); setScreen("workout-library"); }}><span><Sparkles size={17} /></span><b><strong>Premade workouts</strong><small>Browse by area, goal or time</small></b><ArrowRight size={15} /></button><button className="personal" onClick={() => { setTemplateSource("personal"); setScreen("workout-library"); }}><span><Heart size={17} /></span><b><strong>My workouts</strong><small>Saved, favourite and custom</small></b><ArrowRight size={15} /></button></div><p>Your current movements stay editable below. Choosing a workout replaces only this selected day.</p></section>}
            <div className="kind-picker">
              {(["strength", "bike", "walk", "run", "recovery", "rest"] as ActivityKind[]).map((kind) => <button key={kind} className={selectedPlanDay.kind === kind ? "active" : ""} onClick={() => patchPlanDay({ kind, title: kind === "strength" ? "Strength session" : kind === "bike" ? "Bike ride" : kind === "walk" ? "Walk" : kind === "run" ? "Run" : kind === "recovery" ? "Recovery and mobility" : "Rest", workout: kind === "strength" ? (selectedPlanDay.workout?.length ? selectedPlanDay.workout : resetExercises(starterExercises)) : undefined })}>{kind}</button>)}
            </div>
            <label><span>Session</span><input value={selectedPlanDay.title} onChange={(event) => patchPlanDay({ title: event.target.value })} /></label>
            <label><span>Plan note</span><textarea rows={2} value={selectedPlanDay.note} onChange={(event) => patchPlanDay({ note: event.target.value })} placeholder="Anything worth knowing before the day begins?" /></label>
            {selectedPlanDay.kind === "strength" && <section className="planned-workout-prescriptions"><header><div><p className="eyebrow">EXERCISE PRESCRIPTIONS</p><h3>Edit every detail</h3></div><span>{selectedWorkout.length} exercises</span></header><button className="planned-workout-edit" type="button" onClick={() => setPlannedPickerOpen((open) => !open)}>{plannedPickerOpen ? <X size={15} /> : <Plus size={15} />}{plannedPickerOpen ? "Close exercise picker" : "Edit this workout"}</button>{plannedPickerOpen && <section className="exercise-picker planned-exercise-picker"><label className="search-field"><Search size={17} /><input value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder={`Search ${exerciseLibrary.length} exercises`} /></label><div className="picker-filters">{exerciseCategories.map((category) => <button key={category} className={exerciseCategory === category ? "active" : ""} onClick={() => setExerciseCategory(category)}>{category}</button>)}</div><div className="picker-results">{filteredLibrary.map((exercise) => <button key={exercise.name} onClick={() => addPlannedExercise(exercise)}><span><strong>{exercise.name}</strong><small>{exercise.category} · {exercise.equipment} · {exercise.target}</small></span><Plus size={17} /></button>)}</div></section>}{selectedWorkout.map((exercise) => <article key={exercise.id}><div className="planned-exercise-title"><strong>{exercise.name}</strong><button type="button" onClick={() => removePlannedExercise(exercise.id)} aria-label={`Remove ${exercise.name}`} title={`Remove ${exercise.name}`}><Trash2 size={15} /></button></div><div><label><span>Sets</span><input type="number" min="1" max="10" value={exercise.sets.length} onChange={(event) => resizePlannedExercise(exercise, Number(event.target.value) || 1)} /></label><label><span>Reps, time, or distance</span><input value={exercise.target.replace(/^\d+\s*sets?\s*·?\s*/i, "")} onChange={(event) => patchPlannedExercise(exercise.id, { target: `${exercise.sets.length} sets · ${event.target.value}` })} placeholder="8–12 reps, 30 sec, 400 m" /></label><label><span>Rest (sec)</span><input type="number" min="0" max="600" value={exercise.rest} onChange={(event) => patchPlannedExercise(exercise.id, { rest: Math.max(0, Number(event.target.value) || 0) })} /></label></div></article>)}</section>}
            <section className="day-session-stack">
              <header><div><p className="eyebrow">SESSION STACK</p><h3>Everything planned today</h3></div><button type="button" onClick={() => setStackComposerOpen((open) => !open)}><Plus size={14} /> Add session</button></header>
              <article className="primary-session"><i>1</i><div><small>MAIN FOCUS</small><strong>{selectedPlanDay.title}</strong><span>{selectedPlanDay.kind}</span></div></article>
              {(selectedPlanDay.sessions ?? []).map((item, index) => <article key={item.id} className={item.status}><i>{index + 2}</i><div><small>{item.role.toUpperCase()}</small><strong>{item.title}</strong><span>{[item.distance ? `${displayDistance(item.distance).toFixed(1)} ${distanceUnit}` : "", item.duration ? `${item.duration} min` : "", item.kind].filter(Boolean).join(" · ")}</span></div><div className="stack-actions"><button type="button" onClick={() => openPlannedSession(item)}>{item.kind === "strength" ? "Prepare" : "Log"}</button><button type="button" onClick={() => patchPlannedSession(item.id, { status: item.status === "skipped" ? "planned" : "skipped" })}>{item.status === "skipped" ? "Restore" : "Skip"}</button><button type="button" aria-label={`Remove ${item.title}`} onClick={() => removePlannedSession(item.id)}><X size={14} /></button></div></article>)}
              {stackComposerOpen && <div className="stack-composer"><div><label><span>Type</span><select value={draftPlannedSession.kind} onChange={(event) => { const kind = event.target.value as PlannedSession["kind"]; setDraftPlannedSession((value) => ({ ...value, kind, title: kind === "bike" ? "Zone 2 bike ride" : kind === "strength" ? "Strength session" : kind === "walk" ? "Walk" : kind === "run" ? "Run" : "Recovery session" })); }}><option value="bike">Bike</option><option value="strength">Strength</option><option value="walk">Walk</option><option value="run">Run</option><option value="recovery">Recovery</option></select></label><label><span>Purpose</span><select value={draftPlannedSession.role} onChange={(event) => setDraftPlannedSession((value) => ({ ...value, role: event.target.value as SessionRole }))}><option value="warm-up">Warm-up</option><option value="secondary">Secondary</option><option value="recovery">Recovery</option><option value="optional">Optional</option></select></label></div><label><span>Session name</span><input value={draftPlannedSession.title} onChange={(event) => setDraftPlannedSession((value) => ({ ...value, title: event.target.value }))} /></label><div><label><span>Distance ({distanceUnit})</span><DeferredUnitInput storedValue={draftPlannedSession.distance} formatValue={displayDistance} storeValue={storeDistance} onCommit={(distance) => setDraftPlannedSession((value) => ({ ...value, distance }))} label={`Planned distance in ${distanceUnit}`} /></label><label><span>Duration (min)</span><input inputMode="numeric" value={draftPlannedSession.duration} onChange={(event) => setDraftPlannedSession((value) => ({ ...value, duration: event.target.value }))} /></label></div><label><span>Notes or intensity</span><input value={draftPlannedSession.note} onChange={(event) => setDraftPlannedSession((value) => ({ ...value, note: event.target.value }))} placeholder="Zone 2, easy pace, route…" /></label><button type="button" className="primary-button" onClick={addPlannedSession}>Add to this day</button></div>}
            </section>
            <div className="plan-actions"><button onClick={() => movePlanDay(-1)} disabled={weeklyPlan[0].id === selectedPlanDay.id}><ArrowLeft size={13} /> Earlier</button><button onClick={() => movePlanDay(1)} disabled={weeklyPlan[weeklyPlan.length - 1].id === selectedPlanDay.id}>Later <ArrowRight size={13} /></button><button onClick={() => patchPlanDay({ status: selectedPlanDay.status === "skipped" ? "planned" : "skipped" })}>{selectedPlanDay.status === "skipped" ? "Restore" : "Skip"}</button></div>
            <div className="plan-save-row"><button type="button" onClick={() => void saveSelectedWorkout()} disabled={syncing}><Save size={16}/>{syncing ? "Saving…" : "Save this workout"}</button><span>{planSaveStatus}</span></div>
            {selectedPlanDay.kind !== "rest" && <button className="primary-button" onClick={beginPlannedDay}>{selectedPlanDay.kind === "strength" ? "Prepare this workout" : `Log ${selectedPlanDay.kind}`}<ArrowRight size={16} /></button>}
            {selectedPlanDay.kind === "rest" && <p className="rest-message"><BedDouble size={17} /> Rest is part of the plan, not a missed day.</p>}
          </section>}
          {currentProgram && activeProgram && <section className="active-program-card"><div><p className="eyebrow">ACTIVE PROGRAM</p><h3>{currentProgram.name}</h3><span>Week {activeProgram.currentWeek} of {currentProgram.weeks} · {programCompletedThisWeek}/{activeProgram.daysPerWeek} sessions complete · {programAdherence}% adherence</span>{activeProgram.changes.length > 0 && <span>{activeProgram.changes.length} confirmed program change{activeProgram.changes.length === 1 ? "" : "s"}</span>}</div><div className="program-progress"><i style={{ width: `${Math.round((activeProgram.currentWeek / currentProgram.weeks) * 100)}%` }} /></div><button onClick={advanceProgramWeek} disabled={activeProgram.currentWeek >= currentProgram.weeks || programCompletedThisWeek < activeProgram.daysPerWeek}>Generate next week <ArrowRight size={14} /></button></section>}
          <aside className="training-performance-rail">
            <div className="training-performance-panel">
              <header className="panel-heading"><p className="eyebrow">RECENT</p><h2>Completed sessions</h2></header>
              <section className="recent-sessions">
                {history.length === 0 ? (
                  <div className="quiet-row"><History size={19} /><div><strong>No sessions yet</strong><small>Your completed workouts will collect here.</small></div></div>
                ) : history.slice(0, 3).map((item) => (
                  <button key={item.finishedAt} onClick={() => openHistory(item, "training")}><span><Dumbbell size={17} /></span><div><strong>{formatSessionDate(item.finishedAt)}</strong><small>{sessionSetCount(item)} sets{sessionMinutes(item) ? ` · ${sessionMinutes(item)} min` : ""} · Energy {item.energy}/5</small></div><ArrowRight size={16} /></button>
                ))}
              </section>
              {history.length > 0 && <button className="text-wide-button" onClick={() => setScreen("workout-history")}>View all workouts <ArrowRight size={16} /></button>}
            </div>
            <div className="training-performance-panel">
              <header className="panel-heading"><p className="eyebrow">WEEKLY LOAD</p><h2>What actually happened</h2></header>
              <section className="weekly-load-card">
                <div className="weekly-load-metrics"><div><strong>{weekSessions.length + weekActivities.length}</strong><span>sessions</span></div><div><strong>{weekTrainingMinutes}</strong><span>minutes</span></div><div><strong>{weekReps}</strong><span>reps</span></div><div><strong>{Math.round(displayWeight(weekTonnage)).toLocaleString()}</strong><span>{weightUnit} volume</span></div><div><strong>{displayDistance(weekDistance).toFixed(1)}</strong><span>{distanceUnit}</span></div></div>
                <div className="week-bars">{weekDayMinutes.map((minutes, index) => <div key={currentWeekPlan[index].id}><i style={{ height: `${Math.max(4, Math.min(56, minutes))}px` }} /><span>{currentWeekPlan[index].label.slice(0, 1)}</span></div>)}</div>
                {muscleDistribution.length > 0 && <div className="muscle-summary">{muscleDistribution.slice(0, 5).map(([category, sets]) => <span key={category}>{category} <b>{sets} sets</b></span>)}</div>}
                {calorieEstimates && <p className="calorie-assumption">{estimatedWeekCalories ? `≈${estimatedWeekCalories.toLocaleString()} active kcal estimated using your latest recorded bodyweight and standard activity MET values.` : "Add bodyweight in a check-in to calculate an estimate."} Estimates are optional and are not measurements.</p>}
                <button className="estimate-toggle" onClick={() => setCalorieEstimates((enabled) => !enabled)}>{calorieEstimates ? "Hide calorie estimate" : "Show optional calorie estimate"}</button>
              </section>
            </div>
          </aside>
        </section>
      )}

      {screen === "week-plan" && (
        <section className="screen week-plan-screen">
          <button className="back-button" onClick={() => setScreen("training")}><ArrowLeft size={17} /> Training</button>
          <p className="eyebrow">FULL WEEK</p>
          <h1>Plan the rhythm.</h1>
          <p className="lead">See every day, preview the real prescription, then open any day to edit it.</p>
          <div className="choice-row" aria-label="Planning week"><button className={planningWeekOffset === 0 ? "active" : ""} onClick={() => showPlanningWeek(0)}>This week</button><button className={planningWeekOffset === 1 ? "active" : ""} onClick={() => showPlanningWeek(1)}>Next week</button></div>
          <section className="expanded-week-list">{viewedWeekPlan.map((day) => {
            const workout = day.workout ?? [];
            return <article key={day.id} className={`${day.kind} ${day.status}`}><button onClick={() => { selectPlanDay(day); setScreen("training"); }}><div className="expanded-day-date"><span>{day.label}</span><strong>{Number(day.date.slice(-2))}</strong></div><div className="expanded-day-content"><small>{day.kind.toUpperCase()} · {day.status}{day.sessions?.length ? ` · ${day.sessions.length + 1} sessions` : ""}</small><h3>{day.title}</h3>{day.kind === "strength" && workout.length > 0 ? <><p>{workout.map((exercise) => exercise.name).join(" · ")}{day.sessions?.length ? ` · then ${day.sessions.map((item) => item.title).join(" · ")}` : ""}</p><div><span><Clock3 size={12} /> ≈{plannedMinutes(workout)} min</span><span><Dumbbell size={12} /> {workout.reduce((sum, exercise) => sum + exercise.sets.length, 0)} sets</span><span><TrendingUp size={12} /> {plannedIntensity(workout)}</span></div></> : <p>{day.note || (day.kind === "rest" ? "Recovery is part of the plan." : "Open the day to add details.")}</p>}</div><ArrowRight size={16} /></button></article>;
          })}</section>
        </section>
      )}

      {screen === "progression" && (
        <section className="screen progression-screen">
          <button className="back-button" onClick={() => setScreen("training")}><ArrowLeft size={17} /> Training</button>
          <p className="eyebrow">PROGRESSION</p>
          <h1>Build from evidence.</h1>
          <p className="lead">Nova only suggests a change when North's saved records support it. You confirm every plan edit.</p>
          <section className="progression-target"><small>CHANGES APPLY TO</small><strong>{selectedPlanDay.label} · {selectedPlanDay.title}</strong><span>Select another day from Training before returning here if needed.</span></section>
          <div className="section-heading"><div><p className="eyebrow">NOVA RECOMMENDATIONS</p><h2>What to consider</h2></div></div>
          <section className="suggestion-list">
            {progressionSuggestions.map((suggestion) => <article key={suggestion.id}><span>{suggestion.kind === "load" ? "↑" : suggestion.kind === "recovery" ? "↘" : "↔"}</span><div><strong>{suggestion.title}</strong><p>{suggestion.recommendation}</p><details><summary>Why North is suggesting this</summary><small>{suggestion.evidence}</small></details><button onClick={() => applyProgressionSuggestion(suggestion)}>Review and apply <ArrowRight size={13} /></button></div></article>)}
            {progressionSuggestions.length === 0 && <div className="quiet-row"><TrendingUp size={19} /><div><strong>No change suggested yet</strong><small>Repeat movements and record complete sets before North proposes progression.</small></div></div>}
          </section>
          {progressionTransaction && !progressionTransaction.appliedAt && <section className="progression-preview" role="dialog" aria-labelledby="progression-preview-title"><header><span><SlidersHorizontal size={17} /></span><div><small>REVIEW BEFORE APPLYING</small><h2 id="progression-preview-title">{progressionTransaction.suggestion.title}</h2></div></header><p>{progressionTransaction.suggestion.evidence}</p><div className="progression-compare"><div><span>BEFORE</span><strong>{progressionTransaction.beforeDay.title}</strong><small>{progressionTransaction.beforeDay.workout?.find((exercise) => exercise.name === progressionTransaction.suggestion.exerciseName)?.target ?? `${progressionTransaction.beforeDay.workout?.reduce((sum, exercise) => sum + exercise.sets.length, 0)} total sets`}</small></div><ArrowRight size={17} /><div><span>AFTER</span><strong>{progressionTransaction.afterDay.title}</strong><small>{progressionTransaction.afterDay.workout?.find((exercise) => exercise.name === (progressionTransaction.suggestion.substitution ?? progressionTransaction.suggestion.exerciseName))?.target ?? `${progressionTransaction.afterDay.workout?.reduce((sum, exercise) => sum + exercise.sets.length, 0)} total sets`}</small></div></div><p className="progression-recommendation">{progressionTransaction.suggestion.recommendation}</p><footer><button onClick={() => setProgressionTransaction(null)}>Cancel</button><button onClick={confirmProgressionTransaction}>Confirm recommendation</button></footer></section>}
          <div className="section-heading"><div><p className="eyebrow">PERSONAL RECORDS</p><h2>New recorded loads</h2></div></div>
          <section className="pr-list">{personalRecords.map((record) => <article key={record.id}><span><Trophy size={15} /></span><div><small>PERSONAL BEST · {formatSessionDate(record.date)}</small><strong>{record.exerciseName}</strong><em>Previous {displayWeight(record.previous).toFixed(1)} {weightUnit}</em></div><b>{displayWeight(record.weight).toFixed(1)} <small>{weightUnit}</small></b></article>)}{personalRecords.length === 0 && <p>Personal records appear after an exercise has at least two recorded loads.</p>}</section>
        </section>
      )}

      {screen === "programs" && (
        <section className="screen programs-screen">
          <button className="back-button" onClick={() => setScreen("training")}><ArrowLeft size={17} /> Training</button>
          <p className="eyebrow">PROGRAMS</p>
          <h1>Choose a path.</h1>
          <p className="lead">A program turns your priorities and available days into a repeatable week. Every generated workout remains editable.</p>
          {currentProgram && activeProgram && <section className="current-program-summary"><small>CURRENT PROGRAM</small><strong>{currentProgram.name}</strong><span>Week {activeProgram.currentWeek} of {currentProgram.weeks}</span></section>}
          <section className="program-list">{programs.map((program) => <button key={program.id} onClick={() => openProgram(program)}><div><span>{program.goal} · {program.level}</span><strong>{program.name}</strong><p>{program.description}</p><small>{program.weeks} weeks · {program.dayOptions.join("–")} days/week</small></div><ArrowRight size={17} /></button>)}</section>
        </section>
      )}

      {screen === "program-detail" && (
        <section className="screen program-detail-screen">
          <button className="back-button" onClick={() => setScreen("programs")}><ArrowLeft size={17} /> Programs</button>
          <p className="eyebrow">{selectedProgram.goal.toUpperCase()} · {selectedProgram.weeks} WEEKS</p>
          <h1>{selectedProgram.name}</h1>
          <p className="lead">{selectedProgram.description}</p>
          <section className="program-config">
            <div><span>TRAINING DAYS</span><section className="choice-row">{selectedProgram.dayOptions.map((days) => <button key={days} className={programDays === days ? "active" : ""} onClick={() => setProgramDays(days)}>{days} days</button>)}</section></div>
            <div><span>SESSION LENGTH</span><section className="choice-row">{[20, 30, 45, 60, 75].map((duration) => <button key={duration} className={programDuration === duration ? "active" : ""} onClick={() => setProgramDuration(duration)}>{duration} min</button>)}</section></div>
            <label><span>EXPERIENCE</span><select value={programLevel} onChange={(event) => setProgramLevel(event.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
            <div><span>AVAILABLE EQUIPMENT</span><details className="equipment-multiselect"><summary>{programEquipment.join(" · ")}</summary><div>{["Any equipment", "Dumbbell", "Barbell", "Kettlebell", "Cable", "Machine", "Bodyweight"].map((equipment) => <label key={equipment}><input type="checkbox" checked={programEquipment.includes(equipment)} onChange={() => toggleProgramEquipment(equipment)} disabled={Boolean(selectedProgram.equipment) && equipment !== selectedProgram.equipment} /><span>{equipment}</span></label>)}</div></details>{selectedProgram.equipment && <small className="required-equipment">This program requires {selectedProgram.equipment}.</small>}</div>
            <label><span>PRIORITY</span><select value={programPriority} onChange={(event) => setProgramPriority(event.target.value)}><option>Balanced</option><option>Strength</option><option>Muscle gain</option><option>Glutes</option><option>Upper body</option><option>Back and V-taper</option><option>Core</option></select></label>
          </section>
          <section className="program-week-preview"><p className="eyebrow">YOUR WEEK</p>{(selectedProgram.focusesByDays[programDays] ?? []).map((focus, index) => <div key={`${focus}-${index}`}><span>DAY {index + 1}</span><strong>{focus}</strong></div>)}</section>
          <button className="primary-button" onClick={() => generateProgramWeek()}>Start program and build my week <ArrowRight size={16} /></button>
          <p className="program-warning">Starting replaces the current seven-day plan. Saved workout history is never changed.</p>
        </section>
      )}

      {screen === "workout-library" && (
        <section className="screen workout-library-screen">
          <button className="back-button" onClick={() => setScreen("training")}><ArrowLeft size={17} /> Training</button>
          <p className="eyebrow">WORKOUT LIBRARY</p>
          <h1>Find the right session.</h1>
          <p className="lead">{workoutTemplates.length} North workouts plus {personalTemplates.length} personal template{personalTemplates.length === 1 ? "" : "s"}.</p>
          <section className="routine-builder-launch"><span><Plus size={22}/></span><div><p className="eyebrow">WORKOUT STUDIO</p><h2>Build exactly what you want.</h2><p>Create a reusable routine, choose every exercise and prescription, then schedule it or start immediately.</p></div><button onClick={createPersonalWorkout}>Build my workout <ArrowRight size={16}/></button></section>
          <section className="library-controls"><label className="search-field template-search"><Search size={17} /><input value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Search workouts, exercises, or equipment" /></label><div className="library-source-tabs" aria-label="Workout library source"><button className={templateSource === "All" ? "active" : ""} onClick={() => setTemplateSource("All")}><strong>All</strong><small>{allTemplates.length}</small></button><button className={templateSource === "personal" ? "active" : ""} onClick={() => setTemplateSource("personal")}><strong>Mine</strong><small>{myWorkoutCount}</small></button><button className={templateSource === "recent" ? "active" : ""} onClick={() => setTemplateSource("recent")}><strong>Recent</strong><small>{recentTemplateIds.length}</small></button><button className={templateSource === "north" ? "active" : ""} onClick={() => setTemplateSource("north")}><strong>North</strong><small>{workoutTemplates.length}</small></button></div><div className="library-control-row"><button className={`library-filter-toggle ${libraryFiltersOpen ? "active" : ""}`} onClick={() => setLibraryFiltersOpen((open) => !open)} aria-expanded={libraryFiltersOpen}><ListFilter size={15} /> Filters{activeLibraryFilterCount ? <b>{activeLibraryFilterCount}</b> : null}<ChevronDown size={15} /></button><label className="library-sort"><span>Sort</span><select value={workoutLibrarySort} onChange={(event) => setWorkoutLibrarySort(event.target.value as WorkoutLibrarySort)}><option value="recommended">Recommended</option><option value="shortest">Shortest total time</option><option value="longest">Longest total time</option><option value="name">Name A-Z</option></select></label></div>{libraryFiltersOpen && <section className="library-filter-drawer"><header><div><p className="eyebrow">REFINE RESULTS</p><strong>Find the session that fits.</strong></div>{activeLibraryFilterCount > 0 && <button onClick={() => { setTemplateFocus("All"); setTemplateGoal("All"); setTemplateLevel("All"); setTemplateDuration("All"); }}>Clear all</button>}</header><div><p>BODY AREA OR STYLE</p><section className="picker-filters">{workoutFocuses.map((focus) => <button key={focus} className={templateFocus === focus ? "active" : ""} onClick={() => setTemplateFocus(focus)}>{focus}</button>)}</section></div><div><p>GOAL</p><section className="picker-filters">{workoutGoals.map((goal) => <button key={goal} className={templateGoal === goal ? "active" : ""} onClick={() => setTemplateGoal(goal)}>{goal}</button>)}</section></div><div className="library-filter-split"><div><p>LEVEL</p><section className="picker-filters">{workoutLevels.map((level) => <button key={level} className={templateLevel === level ? "active" : ""} onClick={() => setTemplateLevel(level)}>{level}</button>)}</section></div><div><p>WORK TIME</p><section className="picker-filters">{["All", "15", "20", "30", "45", "60", "75"].map((duration) => <button key={duration} className={templateDuration === duration ? "active" : ""} onClick={() => setTemplateDuration(duration)}>{duration === "All" ? duration : `${duration}m`}</button>)}</section></div></div></section>}</section>
          <p className="result-count">{sortedTemplates.length} matching workout{sortedTemplates.length === 1 ? "" : "s"}</p>
          <section className="template-grid">
            {sortedTemplates.map((template) => <article key={template.id} style={{ "--template-accent": workoutFocusAccent(template.focus) } as CSSProperties}><button className="template-open" onClick={() => openWorkoutTemplate(template)}><div className="template-card-top"><span>{template.source === "personal" ? "My workout" : template.focus}</span></div><strong>{workoutDisplayName(template.name)}</strong><p>{template.level} · {template.goal}</p><div className="template-card-meta"><small>{template.exercises.length} exercises · {template.equipment.join(" · ")}</small><small><Clock3 size={12} />~{estimatedWorkoutMinutes(template)} min total</small></div></button><button className={`template-favorite ${favoriteTemplateIds.includes(template.id) ? "active" : ""}`} onClick={() => toggleFavoriteTemplate(template.id)} aria-label={`${favoriteTemplateIds.includes(template.id) ? "Remove" : "Add"} ${workoutDisplayName(template.name)} ${favoriteTemplateIds.includes(template.id) ? "from" : "to"} My workouts`}><Heart size={18} fill={favoriteTemplateIds.includes(template.id) ? "currentColor" : "none"} /></button><div className="template-quick-actions"><button onClick={() => openWorkoutTemplate(template)}>Preview</button><button onClick={() => setScheduleTemplate(template)}>Schedule</button><button onClick={() => applyWorkoutTemplate(template, true)}><Play size={13} /> Start</button></div></article>)}
            {sortedTemplates.length === 0 && <div className="empty-search"><Search size={20} /><p>No workouts match those filters.</p></div>}
          </section>
          {scheduleTemplate && createPortal(<div className="schedule-picker-backdrop" role="presentation" onClick={() => setScheduleTemplate(null)}><section className="schedule-picker" role="dialog" aria-modal="true" aria-labelledby="schedule-picker-title" onClick={(event) => event.stopPropagation()}><header><div><p className="eyebrow">SCHEDULE WORKOUT</p><h2 id="schedule-picker-title">Choose a day</h2></div><button onClick={() => setScheduleTemplate(null)} aria-label="Close day picker"><X size={18} /></button></header><p>{workoutDisplayName(scheduleTemplate.name)} will replace the strength session on the day you choose.</p><div>{weeklyPlan.map((day) => <button key={day.id} onClick={() => { applyWorkoutTemplate(scheduleTemplate, false, day.id); setSelectedPlanDayId(day.id); setScheduleTemplate(null); }}><span>{day.label.slice(0, 3)}<small>{formatSessionDate(`${day.date}T12:00:00`)}</small></span><strong>{day.title}</strong><ArrowRight size={16} /></button>)}</div></section></div>, document.body)}
        </section>
      )}

      {screen === "nova-workout-builder" && (
        <section className="screen nova-workout-builder-screen">
          <button className="back-button" onClick={() => setScreen("training")}><ArrowLeft size={17} /> Training</button>
          <header><span><Sparkles size={21}/></span><div><p className="eyebrow">NOVA WORKOUT STUDIO</p><h1>Let&apos;s build your next session.</h1><p>Tell Nova what you want from this workout. You choose whether to use the suggestion or begin blank.</p></div></header>
          <nav className="routine-library-switcher" aria-label="Workout library">
            <button onClick={() => { setTemplateSource("personal"); setScreen("workout-library"); }}><Heart size={16} /> My workouts</button>
            <button onClick={() => { setTemplateSource("north"); setScreen("workout-library"); }}><Dumbbell size={16} /> Premade workouts</button>
            <button onClick={() => { setTemplateSource("personal"); setScreen("workout-library"); }}><NotebookPen size={16} /> Edit existing</button>
          </nav>
          <section className="nova-builder-form">
            <label className="wide"><span>Workout name</span><input value={novaWorkoutDraft.name} onChange={(event) => setNovaWorkoutDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="e.g. Saturday strength" aria-label="Workout name" /></label>
            <label><span>What do you want to train?</span><select value={novaWorkoutDraft.focus} onChange={(event) => setNovaWorkoutDraft((draft) => ({ ...draft, focus: event.target.value }))}>{workoutFocuses.filter((focus) => focus !== "All").map((focus) => <option key={focus}>{focus}</option>)}</select></label>
            <label><span>What is the goal?</span><select value={novaWorkoutDraft.goal} onChange={(event) => setNovaWorkoutDraft((draft) => ({ ...draft, goal: event.target.value as WorkoutTemplate["goal"] }))}>{workoutGoals.filter((goal) => goal !== "All").map((goal) => <option key={goal}>{goal}</option>)}</select></label>
            <label><span>How much work time?</span><select value={novaWorkoutDraft.duration} onChange={(event) => setNovaWorkoutDraft((draft) => ({ ...draft, duration: Number(event.target.value) }))}>{[15, 20, 30, 45, 60, 75].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}</select></label>
            <label><span>Where are you training?</span><select value={novaWorkoutDraft.location} onChange={(event) => setNovaWorkoutDraft((draft) => ({ ...draft, location: event.target.value as WorkoutTemplate["location"] }))}><option>Gym</option><option>Home</option><option>Anywhere</option></select></label>
            <label className="wide"><span>Main equipment</span><select value={novaWorkoutDraft.equipment} onChange={(event) => setNovaWorkoutDraft((draft) => ({ ...draft, equipment: event.target.value }))}><option>Any equipment</option>{exerciseEquipment.filter((equipment) => equipment !== "All" && equipment !== "None").map((equipment) => <option key={equipment}>{equipment}</option>)}</select></label>
          </section>
          <section className="nova-builder-choice"><p className="eyebrow">YOUR CHOICE</p><h2>How should Nova begin?</h2><button onClick={() => createNovaWorkout(true)}><Sparkles size={19} /><span><strong>Use Nova&apos;s suggestion</strong><small>Start with a reviewable exercise list and prescriptions.</small></span><ArrowRight size={17} /></button><button onClick={() => createNovaWorkout(false)}><Plus size={19} /><span><strong>Start blank</strong><small>Keep the setup, then choose every movement yourself.</small></span><ArrowRight size={17} /></button><button className="nova-expert-link" onClick={createPersonalWorkout}><SlidersHorizontal size={17} /> Open Expert Studio</button></section>
        </section>
      )}

      {screen === "nova-routine-builder" && (
        <section className="screen nova-routine-builder-screen">
          <button className="back-button" onClick={() => setScreen("nova-workout-builder")}><ArrowLeft size={17} /> Setup</button>
          <header className="nova-routine-heading"><div><p className="eyebrow">NOVA SIMPLE BUILDER</p><h1>{selectedTemplate.name}</h1><p>Add one movement at a time. Your setup stays fixed while you build.</p></div><span><Sparkles size={21} /></span></header>
          <section className="nova-routine-setup" aria-label="Locked workout setup"><span>{selectedTemplate.focus}</span><span>{selectedTemplate.goal}</span><span>{selectedTemplate.duration} min</span><span>{selectedTemplate.location}</span><span>{selectedTemplate.equipment.join(" · ")}</span></section>
          <section className="nova-routine-progress"><div><span>ROUTINE</span><strong>{selectedTemplate.exercises.length} exercise{selectedTemplate.exercises.length === 1 ? "" : "s"} added</strong></div><div><span>NOW ADDING</span><strong>Exercise {selectedTemplate.exercises.length + 1}</strong></div></section>
          <section className="nova-exercise-step">
            <p className="eyebrow">EXERCISE {selectedTemplate.exercises.length + 1}</p><h2>Choose the movement.</h2>
            <label className="search-field nova-exercise-search"><Search size={18} /><input value={novaExerciseSearch} onChange={(event) => { setNovaExerciseSearch(event.target.value); setNovaRoutineStatus(""); }} placeholder="Search exercises" autoFocus /></label>
            {novaExerciseSearch && <div className="nova-exercise-results">{novaExerciseMatches.map((definition) => <button key={definition.name} className={novaExerciseDraft.definition?.name === definition.name ? "selected" : ""} onClick={() => { setNovaExercise(definition); setNovaRoutineStatus(""); }}><span><strong>{definition.name}</strong><small>{definition.category} · {definition.equipment} · {definition.target}</small></span>{novaExerciseDraft.definition?.name === definition.name ? <Check size={17} /> : <Plus size={17} />}</button>)}{novaExerciseMatches.length === 0 && <p>No movements match that search.</p>}</div>}
            {novaExerciseDraft.definition && <section className="nova-selected-exercise"><div><span>SELECTED MOVEMENT</span><strong>{novaExerciseDraft.definition.name}</strong><small>{novaExerciseDraft.definition.category} · {novaExerciseDraft.definition.equipment}</small></div><button onClick={() => setNovaExercise(null)} aria-label="Clear selected movement"><X size={16} /></button></section>}
            <section className="nova-prescription"><label><span>Sets</span><input type="number" min="1" max="20" value={novaExerciseDraft.sets} onChange={(event) => setNovaExerciseDraft((draft) => ({ ...draft, sets: Math.max(1, Number(event.target.value) || 1) }))} /></label><label><span>Reps, time, or distance</span><input value={novaExerciseDraft.target} onChange={(event) => setNovaExerciseDraft((draft) => ({ ...draft, target: event.target.value }))} placeholder="8–12 reps, 30 sec, 400 m" /></label><label><span>Rest (sec)</span><input type="number" min="0" max="600" value={novaExerciseDraft.rest} onChange={(event) => setNovaExerciseDraft((draft) => ({ ...draft, rest: Math.max(0, Number(event.target.value) || 0) }))} /></label></section>
            {novaRoutineStatus && <p className="nova-routine-status" role="status">{novaRoutineStatus}</p>}
          </section>
          {selectedTemplate.exercises.length > 0 && <section className="nova-routine-list"><p className="eyebrow">YOUR ROUTINE SO FAR</p>{selectedTemplate.exercises.map((exercise, index) => <div key={`${exercise.exerciseName}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{exercise.exerciseName}</strong><small>{exercise.sets} sets · {exercise.reps} · {exercise.rest}s rest</small></div>)}</section>}
          <footer className="nova-routine-actions"><button className="secondary-button" onClick={() => commitNovaExercise(false)}><Plus size={16} /> Add next exercise</button><button className="primary-button" onClick={() => commitNovaExercise(true)}><Save size={16} /> Save routine and exit</button></footer>
        </section>
      )}

      {screen === "workout-template" && (
        <section className="screen workout-template-screen">
          <button className="back-button" onClick={() => setScreen(templateEditing && selectedTemplate.source === "personal" ? "nova-workout-builder" : "workout-library")}><ArrowLeft size={17} /> {templateEditing && selectedTemplate.source === "personal" ? "Nova builder" : "Library"}</button>
          <p className="eyebrow">{selectedTemplate.focus.toUpperCase()} · {selectedTemplate.level.toUpperCase()}</p>
          {templateEditing && selectedTemplate.source === "personal" ? <><div className="template-title-editor"><input value={selectedTemplate.name} onChange={(event) => patchPersonalTemplate({ name: event.target.value })} aria-label="Workout name" /><textarea rows={2} value={selectedTemplate.description} onChange={(event) => patchPersonalTemplate({ description: event.target.value })} aria-label="Workout description" /></div><section className="routine-builder-settings"><label><span>Focus</span><input value={selectedTemplate.focus} onChange={(event) => patchPersonalTemplate({ focus: event.target.value })}/></label><label><span>Goal</span><select value={selectedTemplate.goal} onChange={(event) => patchPersonalTemplate({ goal: event.target.value as WorkoutTemplate["goal"] })}>{workoutGoals.filter((goal) => goal !== "All").map((goal) => <option key={goal}>{goal}</option>)}</select></label><label><span>Level</span><select value={selectedTemplate.level} onChange={(event) => patchPersonalTemplate({ level: event.target.value as WorkoutTemplate["level"] })}>{workoutLevels.filter((level) => level !== "All").map((goal) => <option key={goal}>{goal}</option>)}</select></label><label><span>Duration (mins)</span><DeferredIntegerInput value={selectedTemplate.duration} min={5} max={240} onCommit={(duration) => patchPersonalTemplate({ duration })} label="Workout duration in minutes" /></label><label><span>Location</span><select value={selectedTemplate.location} onChange={(event) => patchPersonalTemplate({ location: event.target.value as WorkoutTemplate["location"] })}><option>Gym</option><option>Home</option><option>Anywhere</option></select></label><div className="routine-equipment-field"><span>Available equipment</span><details className="equipment-multiselect"><summary>{selectedTemplate.equipment.join(" · ")}</summary><div>{exerciseEquipment.map((equipment) => <label key={equipment}><input type="checkbox" checked={selectedTemplate.equipment.includes(equipment)} onChange={() => toggleTemplateEquipment(equipment)} /><span>{equipment}</span></label>)}</div></details></div></section></> : <><h1>{selectedTemplate.name}</h1><p className="lead">{selectedTemplate.description}</p></>}
          <section className="template-metrics"><div><span>EST. TOTAL</span><strong>~{estimatedWorkoutMinutes(selectedTemplate)} min</strong></div><div><span>GOAL</span><strong>{selectedTemplate.goal}</strong></div><div><span>PLACE</span><strong>{selectedTemplate.location}</strong></div></section>
          <p className="equipment-line"><strong>Equipment:</strong> {selectedTemplate.equipment.join(", ")}</p>
          <section className="template-exercises">
            {selectedTemplate.exercises.map((exercise, index) => { const definition = exerciseLibrary.find((item) => item.name === exercise.exerciseName); return <article key={`${exercise.exerciseName}-${index}`} className={templateEditing ? "editing" : ""}><span>{String(index + 1).padStart(2, "0")}</span>{templateEditing && selectedTemplate.source === "personal" ? <div className="template-exercise-editor"><div className="routine-movement-name"><strong>{exercise.exerciseName}</strong><small>{definition ? `${definition.category} · ${definition.equipment} · ${definition.movementPattern}` : "Choose a library movement"}</small></div><div><label>Sets<DeferredIntegerInput value={exercise.sets} min={1} max={10} onCommit={(sets) => patchTemplateExercise(index, { sets })} label={`${exercise.exerciseName} sets`} /></label><label>Target<input value={exercise.reps} onChange={(event) => patchTemplateExercise(index, { reps: event.target.value })} placeholder="8–12 reps, 30 sec, 400 m" aria-label={`${exercise.exerciseName} reps, time, or distance target`} /></label><label>Rest<DeferredIntegerInput value={exercise.rest} min={0} max={600} onCommit={(rest) => patchTemplateExercise(index, { rest })} label={`${exercise.exerciseName} rest seconds`} /></label></div><div className="template-row-actions"><button onClick={() => moveTemplateExercise(index, -1)} disabled={index === 0}>↑</button><button onClick={() => moveTemplateExercise(index, 1)} disabled={index === selectedTemplate.exercises.length - 1}>↓</button><button onClick={() => removeTemplateExercise(index)} disabled={selectedTemplate.exercises.length === 1}><Trash2 size={13} /></button></div></div> : <div><strong>{exercise.exerciseName}</strong><small>{exercise.sets} sets · {exercise.reps}{exercise.reps.includes("sec") ? "" : " reps"} · {exercise.rest}s rest</small></div>}</article>; })}
          </section>
          {templateEditing && selectedTemplate.source === "personal" && <><button className="add-template-row" onClick={() => setBuilderPickerOpen((open) => !open)}>{builderPickerOpen ? <X size={14} /> : <Plus size={14} />} {builderPickerOpen ? "Close exercise picker" : "Find and add exercises"}</button>{builderPickerOpen && <section className="routine-exercise-picker"><label className="search-field"><Search size={17}/><input value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder={`Search ${exerciseLibrary.length} exercises`} /></label><div className="filter-label">BODY AREA</div><div className="picker-filters">{exerciseCategories.map((category) => <button key={category} className={exerciseCategory === category ? "active" : ""} onClick={() => setExerciseCategory(category)}>{category}</button>)}</div><div className="filter-label">EQUIPMENT</div><div className="picker-filters">{exerciseEquipment.map((equipment) => <button key={equipment} className={exerciseEquipmentFilter === equipment ? "active" : ""} onClick={() => setExerciseEquipmentFilter(equipment)}>{equipment}</button>)}</div><p className="result-count">{filteredLibrary.length} matching movement{filteredLibrary.length === 1 ? "" : "s"}</p><div className="routine-picker-results">{filteredLibrary.slice(0, 80).map((definition) => { const added = selectedTemplate.exercises.some((exercise) => exercise.exerciseName === definition.name); return <Fragment key={definition.name}><button disabled={added} onClick={() => addTemplateExercise(definition)}><span><strong>{definition.name}</strong><small>{definition.category} · {definition.equipment} · {definition.target}</small></span>{added ? <Check size={17}/> : <Plus size={17}/>}</button><button className="exercise-profile-button" onClick={() => openExercisePreview(definition)}><Play size={13} /> View exercise</button></Fragment>; })}</div></section>}<p className="routine-save-state"><Check size={14}/>{builderStatus || "Every change saves automatically to My Workouts."}</p>{selectedTemplateIssues.length > 0 && <div className="routine-validation">{selectedTemplateIssues.map((issue) => <p key={issue}>{issue}</p>)}</div>}</>}
          {templateEditing && selectedTemplate.source === "personal" && builderPickerOpen && <ExercisePickerV2 onAdd={(exercise)=>addTemplateExercise(toLegacyExerciseDefinition(exercise))} onView={(exercise)=>openExercisePreview(toLegacyExerciseDefinition(exercise))} addedIds={selectedTemplate.exercises.map((item)=>canonicalExerciseFor(item.exerciseName)?.id).filter((id):id is string=>Boolean(id))}/>}
          <p className="apply-day-note">Add this to {selectedPlanDay.label}, {formatSessionDate(`${selectedPlanDay.date}T12:00:00`)}. You can edit every movement before starting.</p>
          <section className="template-action-grid">
            <button className="primary-button" disabled={selectedTemplateIssues.length > 0} onClick={() => addTemplateToSelectedDay(true)}>Use and prepare now <Play size={16} /></button>
            <button className="secondary-button" disabled={selectedTemplateIssues.length > 0} onClick={() => addTemplateToSelectedDay(false)}>Add to selected day</button>
            {selectedTemplate.source === "personal" ? <><button className="template-owner-action" onClick={() => setTemplateEditing((editing) => !editing)}><Save size={14} /> {templateEditing ? "Done editing" : "Edit workout"}</button><button className="template-owner-action" onClick={() => copyToPersonal(selectedTemplate)}><Copy size={14} /> Duplicate</button></> : <button className="template-owner-action" onClick={() => { copyToPersonal(selectedTemplate); setTemplateEditing(true); }}><Plus size={14} /> Save and customize</button>}
          </section>
          {selectedTemplate.source === "personal" && <button className="danger-button" onClick={deletePersonalTemplate}><Trash2 size={15} /> Delete personal template</button>}
        </section>
      )}

      {screen === "workout-history" && (
        <section className="screen workout-history-screen">
          <button className="back-button" onClick={() => setScreen("training")}><ArrowLeft size={17} /> Training</button>
          <p className="eyebrow">TRAINING CALENDAR</p>
          <h1>Your work, month by month.</h1>
          <p className="lead">Tap a training day. See exactly what happened.</p>
          {history.length > 0 ? <section className="north-history-calendar-layout"><div className="north-history-calendar"><header><button onClick={() => setHistoryCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))} aria-label="Previous month"><ChevronLeft /></button><div><small>TRAINING CALENDAR</small><h2>{new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric" }).format(historyCalendarMonth)}</h2></div><button onClick={() => setHistoryCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))} aria-label="Next month"><ChevronRight /></button></header><div className="north-calendar-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div><div className="north-calendar-grid">{historyCalendarDays.map((date) => { const key = isoDate(date); const items = historyByDate[key] ?? []; const outside = date.getMonth() !== historyCalendarMonth.getMonth(); return <button key={key} className={`${outside ? "outside " : ""}${key === historyCalendarDate ? "selected " : ""}${items.length ? "has-work" : ""}`} onClick={() => setHistoryCalendarDate(key)}><time>{date.getDate()}</time>{items.length > 0 && <span>{items.slice(0, 3).map((item, index) => <i className={item.exercises.length >= 5 ? "strength" : "quick"} key={`${item.finishedAt}-${index}`} />)}</span>}{items.length > 1 && <small>{items.length}</small>}</button>; })}</div></div><aside className="north-history-day"><p>{new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${historyCalendarDate}T12:00:00`))}</p><h2>{historyCalendarSessions.length ? `${historyCalendarSessions.length} session${historyCalendarSessions.length === 1 ? "" : "s"}` : "Recovery day."}</h2>{historyCalendarSessions.length ? historyCalendarSessions.map((item) => <button key={item.finishedAt} onClick={() => openHistory(item, "training")}><span><strong>{item.exercises.filter((exercise) => exercise.sets.some((set) => set.complete)).map((exercise) => exercise.name).slice(0, 2).join(" + ") || "Workout"}</strong><small>{sessionMinutes(item) ?? "—"} min · {sessionSetCount(item)} sets · Energy {item.energy}/5</small></span><ArrowRight /></button>) : <div className="north-rest-day"><Moon /><strong>Rest builds the next session.</strong></div>}</aside></section> : <section className="north-empty-history"><Dumbbell /><h2>Your first workout starts the calendar.</h2><button className="primary-button" onClick={() => setScreen("training")}>Choose today’s training</button></section>}
        </section>
      )}

      {screen === "nova" && (
        <section className="screen destination-screen nova-screen">
          <div className="nova-page-heading"><div><p className="eyebrow">NOVA INTELLIGENCE</p><h1>Let’s figure it out together.</h1><p>Your private coach uses only this account’s records, goals and approved memory.</p></div><div className="nova-heading-actions"><button onClick={() => setNovaHubOpen((open) => !open)}><Compass size={15}/>{novaHubOpen ? "Close context" : "Nova context"}</button>{novaMessages.length > 0 && <button onClick={clearNovaConversation}>Clear chat</button>}</div></div>
          <div className="nova-line living" />
          {novaHubOpen && <section className="nova-intelligence-hub">
            <header><div><p className="eyebrow">NOVA CONTEXT</p><h2>{novaSetupOpen ? "A little context goes a long way." : "What Nova can use."}</h2></div><div className="nova-context-actions"><span className={novaStatus?.available ? "connected" : "setup"}>{novaStatus?.available ? "Nova connected" : "Local setup needed"}</span><button onClick={() => setNovaHubOpen(false)} aria-label="Close Nova context"><X size={17}/></button></div></header>
            {novaSetupOpen ? <section className="nova-setup-form"><p>Optional and quick. Share only what helps Nova make your plan easier to follow.</p><fieldset><legend>Where do you usually train?</legend><div className="nova-setup-choices">{["Home", "Gym", "Outdoors"].map((place) => <button key={place} className={novaSetupDraft.locations.includes(place) ? "selected" : ""} onClick={() => setNovaSetupDraft((draft) => ({ ...draft, locations: draft.locations.includes(place) ? draft.locations.filter((item) => item !== place) : [...draft.locations, place] }))}>{place}</button>)}</div></fieldset>{novaSetupDraft.locations.includes("Home") && <fieldset><legend>What is available at home?</legend><div className="nova-setup-choices">{["Dumbbells", "Barbell", "Bench", "Pull-up bar", "Cable / pulley", "Bands", "Kettlebells"].map((item) => <button key={item} className={novaSetupDraft.homeEquipment.includes(item) ? "selected" : ""} onClick={() => setNovaSetupDraft((draft) => ({ ...draft, homeEquipment: draft.homeEquipment.includes(item) ? draft.homeEquipment.filter((value) => value !== item) : [...draft.homeEquipment, item] }))}>{item}</button>)}</div></fieldset>}{novaSetupDraft.locations.includes("Gym") && <fieldset><legend>How equipped is your usual gym?</legend><div className="nova-setup-choices">{["Basic", "Well equipped", "Not sure"].map((item) => <button key={item} className={novaSetupDraft.gymAccess === item ? "selected" : ""} onClick={() => setNovaSetupDraft((draft) => ({ ...draft, gymAccess: item }))}>{item}</button>)}</div></fieldset>}<fieldset><legend>When do you prefer to train?</legend><div className="nova-setup-choices">{["Morning", "Midday", "Evening", "It varies"].map((item) => <button key={item} className={novaSetupDraft.preferredTime === item ? "selected" : ""} onClick={() => setNovaSetupDraft((draft) => ({ ...draft, preferredTime: item }))}>{item}</button>)}</div></fieldset><footer><button className="secondary-button" onClick={() => setNovaSetupOpen(false)}>Back</button><button className="primary-button" onClick={() => void saveNovaSetup()} disabled={novaSetupSaving}>{novaSetupSaving ? "Saving…" : "Save setup"}<Check size={16}/></button></footer></section> : <>
            {novaStatus?.usage && <section className="nova-usage-panel"><div><p className="eyebrow">NOVA USAGE · THIS MONTH</p><strong>{novaStatus.usage.replies} {novaStatus.usage.replies === 1 ? "reply" : "replies"}</strong><span>{novaStatus.usage.tokens.toLocaleString()} tokens used</span></div><small>{novaStatus.usage.estimatedCostMicros > 0 ? `Estimated provider cost: $${(novaStatus.usage.estimatedCostMicros / 1_000_000).toFixed(2)}` : "Provider cost tracking is not configured for this environment."}</small></section>}
            <div className="nova-hub-grid">
              <section className="nova-memory-panel"><div className="nova-hub-title"><Database size={19}/><div><strong>What Nova knows</strong><small>Review, disable or erase anything.</small></div></div>{novaMemories.length ? <div className="nova-memory-list">{novaMemories.map((memory) => <article key={memory.id}><span className={memory.status}>{memory.kind.replaceAll("_", " ")}</span><div><strong>{memory.label}</strong><small>{memory.source_type.replaceAll("_", " ")} · {Math.round(memory.confidence * 100)}% confidence</small></div><div>{memory.status === "proposed" && <><button onClick={() => void changeNovaMemory(memory, { status: "active" })}>Confirm</button><button onClick={() => void changeNovaMemory(memory, { status: "rejected" })}>Reject</button></>} {memory.status === "active" && <button onClick={() => void changeNovaMemory(memory, { influenceEnabled: !memory.influence_enabled })}>{memory.influence_enabled ? "Pause use" : "Allow use"}</button>}<button className="memory-delete" onClick={() => void forgetNovaMemory(memory)} aria-label={`Forget ${memory.label}`}><Trash2 size={14}/></button></div></article>)}</div> : <div className="nova-memory-empty"><Sparkles size={22}/><strong>No approved memories yet.</strong><p>Start with the few details that make Nova useful from day one.</p><button onClick={openNovaSetup}>Set up Nova <ArrowRight size={15}/></button></div>}</section>
            </div>
            {!novaMemories.length && <button className="nova-setup-link" onClick={openNovaSetup}>Set up Nova in about two minutes <ArrowRight size={15}/></button>}
            </>}
          </section>}
          {!novaHubOpen && novaStatus && !novaStatus.available && <button className="nova-setup-banner" onClick={() => setNovaHubOpen(true)}><span><Sparkles size={17}/><b>Nova’s intelligence is ready for local setup.</b><small>Goals and records are safe. Add the server API key to enable live conversation.</small></span><ArrowRight size={16}/></button>}
          <section className="conversation-surface" ref={novaTranscriptRef}>
            {novaMessages.length === 0 && <><div className="nova-message"><small>NOVA</small><p>{visibleLearnedInsights[0]?.novaPrompt ?? "Memory is off or no current learned observations are available. I can still help with the plan in front of you."}</p></div><div className="nova-starters">{["What is planned today?", "How does my week look?", "Help me reflect on this week", activeProgram ? `Adjust my program to ${Math.max(2, activeProgram.daysPerWeek - 1)} days a week` : "Am I ready to progress?", "I’m sore and low on energy"].map((prompt) => <button type="button" key={prompt} onClick={() => void sendToNova(prompt)}>{prompt}</button>)}</div></>}
            {novaMessages.map((message) => <article className={message.role === "user" ? "user-message" : "nova-message"} key={message.id}><small>{message.role === "user" ? "YOU" : "NOVA"}<time>{new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit" }).format(new Date(message.createdAt))}</time></small><p>{message.text}</p>{message.role === "nova" && message.evidence?.length ? <details className="nova-evidence"><summary>Evidence and limits <span>{message.confidence} confidence</span></summary><ul>{message.evidence.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}{message.proposal && <section className={`nova-proposal ${message.appliedAt && !message.undoneAt ? "applied" : message.undoneAt ? "undone" : ""}`}><header><span>{message.appliedAt && !message.undoneAt ? <Check size={15} /> : message.undoneAt ? <RotateCcw size={15} /> : <SlidersHorizontal size={15} />}</span><div><small>PROPOSED PLAN CHANGE</small><strong>{message.proposal.summary}</strong></div></header><div className="nova-plan-compare"><div><span>BEFORE</span><strong>{message.proposal.before.title}</strong><small>{message.proposal.before.kind}{message.proposal.before.workout ? ` · ${message.proposal.before.workout.length} exercises · ${message.proposal.before.workout.reduce((sum, exercise) => sum + exercise.sets.length, 0)} sets` : ""}</small></div><ArrowRight size={16} /><div><span>AFTER</span><strong>{message.proposal.after.title}</strong><small>{message.proposal.after.kind}{message.proposal.after.workout ? ` · ${message.proposal.after.workout.length} exercises · ${message.proposal.after.workout.reduce((sum, exercise) => sum + exercise.sets.length, 0)} sets` : ""}</small></div></div>{!message.appliedAt || message.undoneAt ? <div className="nova-proposal-actions"><button onClick={() => correctNovaProposal(message)}>Correct it</button><button onClick={() => applyNovaProposal(message)} disabled={Boolean(message.undoneAt)}>Confirm change</button></div> : <div className="nova-proposal-actions"><span>Applied to {message.proposal.before.label}</span><button onClick={() => undoNovaProposal(message)}><RotateCcw size={13} /> Undo</button></div>}</section>}{message.programProposal && <section className={`nova-proposal ${message.appliedAt && !message.undoneAt ? "applied" : message.undoneAt ? "undone" : ""}`}><header><span><MapIcon size={15} /></span><div><small>PROPOSED PROGRAM CHANGE</small><strong>{message.programProposal.summary}</strong></div></header><div className="nova-plan-compare"><div><span>BEFORE</span><strong>{message.programProposal.beforeProgram.daysPerWeek} days</strong><small>{message.programProposal.beforeProgram.duration} minutes · {message.programProposal.beforeProgram.trainingDayIndexes.map((index) => message.programProposal!.beforePlan[index].label).join(" · ")}</small></div><ArrowRight size={16} /><div><span>AFTER</span><strong>{message.programProposal.afterProgram.daysPerWeek} days</strong><small>{message.programProposal.afterProgram.duration} minutes · {message.programProposal.afterProgram.trainingDayIndexes.map((index) => message.programProposal!.afterPlan[index].label).join(" · ")}</small></div></div>{!message.appliedAt || message.undoneAt ? <div className="nova-proposal-actions"><button onClick={() => correctNovaProposal(message)}>Correct it</button><button onClick={() => applyNovaProgramProposal(message)} disabled={Boolean(message.undoneAt)}>Confirm program change</button></div> : <div className="nova-proposal-actions"><span>Program and week updated</span><button onClick={() => undoNovaProgramProposal(message)}><RotateCcw size={13} /> Undo</button></div>}</section>}{message.action && !message.proposal && !message.programProposal && <button className="nova-tool-action" onClick={() => followNovaAction(message.action)}>{message.actionLabel}<ArrowRight size={14} /></button>}</article>)}
            {novaMessages.filter((message) => message.apiProposal?.status === "pending").map((message) => <section className="nova-proposal api-proposal pending" key={`proposal-${message.id}`}><header><span><Sparkles size={15}/></span><div><small>NOVA PROPOSAL · YOUR APPROVAL REQUIRED</small><strong>{message.apiProposal!.summary}</strong></div></header><p>{message.apiProposal!.reason}</p><div className="nova-proposal-payload"><span>{message.apiProposal!.action_type.replaceAll("_", " ")}</span><small>Nova cannot apply this without your confirmation.</small></div><div className="nova-proposal-actions"><button onClick={() => void rejectApiProposal(message)}>Not now</button><button onClick={() => void applyApiProposal(message)}>Review & confirm</button></div></section>)}
            {novaThinking && <div className="nova-thinking"><BrandLoader label="Nova is checking your North records…" /></div>}
            {novaError && <div className="nova-error" role="alert"><span>{novaError}</span><button onClick={() => { const last = [...novaMessages].reverse().find((message) => message.role === "user"); if (last) sendToNova(last.text); }}>Retry</button></div>}
          </section>
          {!novaAtBottom && <button className="nova-scroll-to-latest" onClick={() => { const transcript = novaTranscriptRef.current; transcript?.scrollTo({ top: transcript.scrollHeight, behavior: profile.reducedMotion ? "auto" : "smooth" }); setNovaAtBottom(true); }} aria-label="Scroll to latest messages"><ChevronDown size={18}/></button>}
          {createPortal(<form className="nova-input" onSubmit={(event) => { event.preventDefault(); void sendToNova(); }}><input value={novaInput} onChange={(event) => setNovaInput(event.target.value)} placeholder="Ask about today, recovery, or your week" /><button type="submit" disabled={novaThinking || !novaInput.trim()} aria-label="Send to Nova"><Send size={18} /></button></form>, document.body)}
          <p className="nova-safety-note">Nova supports training decisions from your saved records. It does not diagnose injuries or replace medical care.</p>
        </section>
      )}

      {screen === "account" && (
        <section className="screen destination-screen account-screen">
          <button className="back-button" onClick={() => setScreen("you")}><ArrowLeft size={17} /> You</button>
          <header className="account-screen-header"><span><UserRound size={26} /></span><div><p className="eyebrow">ACCOUNT</p><h1>Your North.</h1><p>Sign-in, sync, and trusted devices live here—not in your personal story.</p></div></header>
          {readNorthSession() && <section className="account-panel"><div className="account-identity"><span><UserRound size={19} /></span><div><strong>{readNorthSession()?.user.displayName}</strong><small>@{readNorthSession()?.user.username} · synced account</small></div>{readNorthSession()?.user.username === "druwbi" && <a href="/admin">Owner console</a>}</div><div className="account-device-list">{accountDevices.map((device) => <article key={device.id}><span className={device.id === currentDeviceId ? "current" : ""}><Database size={16} /></span><div><strong>{device.name}{device.id === currentDeviceId ? " · This device" : ""}</strong><small>Last active {formatSessionDate(device.last_seen_at)} · {device.active_sessions} active session{device.active_sessions === 1 ? "" : "s"}</small></div>{device.revoked_at ? <b>Signed out</b> : <button onClick={() => void revokeAccountDevice(device)}>Sign out</button>}</article>)}</div>{accountStatus && <p className="account-status" role="status">{accountStatus}</p>}<button className="account-signout" onClick={signOutAccount}>Sign out of this device</button></section>}
          <section className="account-menu-grid"><button onClick={() => setScreen("settings")}><SlidersHorizontal size={19}/><span><strong>App settings & preferences</strong><small>Units, coaching, privacy, installation and sharing</small></span><ArrowRight size={15}/></button><button onClick={() => void runAccountSync(true)}><RotateCcw size={19}/><span><strong>Sync & devices</strong><small>{lastSyncedAt ? `Last synced ${formatSessionDate(lastSyncedAt)}` : "Keep every device current"}</small></span><ArrowRight size={15}/></button></section>
          {healthSummary && healthSummary.types.length > 0 && <section className="health-summary-card"><header><div><p className="eyebrow">CONNECTED SERVICES</p><h2>Samsung Health</h2><p>{healthSummary.types.reduce((sum, item) => sum + item.records, 0).toLocaleString()} imported records. Wearable development remains paused while the core app is rebuilt.</p></div><HeartPulse size={24} /></header></section>}
        </section>
      )}

      {screen === "settings" && (
        <section className="screen destination-screen settings-screen">
          <button className="back-button" onClick={() => setScreen("you")}><ArrowLeft size={17}/>You</button><p className="eyebrow">ACCOUNT & APP</p><h1>North, your way.</h1><p className="lead">One clear place for your account, devices, appearance, integrations, privacy and app controls.</p>
          {readNorthSession() && <section className="settings-account-hero"><span className="account-avatar-glyph large" aria-hidden="true"><i/><b/></span><div><small>SIGNED IN AS</small><strong>{readNorthSession()?.user.displayName}</strong><p>@{readNorthSession()?.user.username}</p></div>{readNorthSession()?.user.username === "druwbi" && <a href="/admin">Admin</a>}</section>}
          {readNorthSession() && <details className="settings-group" open><summary><span><UserRound size={18}/><b>Your account</b><small>{accountDevices.length} connected device{accountDevices.length === 1 ? "" : "s"}</small></span><ChevronDown size={18}/></summary><div className="settings-group-body"><div className="account-device-list">{accountDevices.map((device) => <article key={device.id}><span className={device.id === currentDeviceId ? "current" : ""}><Database size={16}/></span><div><strong>{device.name}{device.id === currentDeviceId ? " · This device" : ""}</strong><small>Last active {formatSessionDate(device.last_seen_at)}</small></div>{device.revoked_at ? <b>Signed out</b> : device.id !== currentDeviceId ? <button onClick={() => void revokeAccountDevice(device)}>Sign out</button> : null}</article>)}</div><button className="settings-sync-check" onClick={() => void runAccountSync(true)} disabled={syncing || !online}><RotateCcw size={16}/><span><strong>{syncing ? "Checking your account…" : "Check for updates"}</strong><small>{lastSyncedAt ? `Everything saved · last checked ${formatSessionDate(lastSyncedAt)}` : "Automatic sync is on"}</small></span></button>{accountStatus && <p className="account-status">{accountStatus}</p>}<button className="account-signout" onClick={signOutAccount}>Sign out of this device</button></div></details>}
          <details className="settings-group"><summary><span><Sun size={18}/><b>Appearance</b><small>{themeOptions.find((theme) => theme.id === themeName)?.name} · {profile.largeText ? "larger text" : "standard text"}</small></span><ChevronDown size={18}/></summary><div className="settings-group-body"><section className="theme-picker" aria-label="Theme palette">{themeOptions.map((theme) => <button key={theme.id} className={`${themeName === theme.id ? "selected " : ""}${theme.mode}`} onClick={() => setThemeName(theme.id)} aria-pressed={themeName === theme.id}><span className={`theme-swatch ${theme.id}`}><i/><i/><i/></span><strong>{theme.name}</strong><small>{theme.mode}</small></button>)}</section></div></details>
          <div className="section-heading"><div><p className="eyebrow">NORTH APP</p><h2>Keep North close</h2></div></div>
          <section className="install-app-card"><span><Download size={20} /></span><div><p className="eyebrow">NORTH ON YOUR PHONE</p><h2>{window.matchMedia("(display-mode: standalone)").matches ? "Installed and ready." : "Install North as an app."}</h2><p>Launch from your home screen in a clean full-screen window. Your account and synchronized plan remain the same.</p>{installStatus && <small role="status">{installStatus}</small>}</div><button onClick={() => void installNorth()}>{window.matchMedia("(display-mode: standalone)").matches ? "Installed" : "Install North"}</button></section>
          <section className="share-north-card"><span><Share2 size={22} /></span><div><p className="eyebrow">BRING SOMEONE WITH YOU</p><h2>Recommend North</h2><p>Send a thoughtful “try this out” link to someone who would value a steadier training practice.</p>{shareStatus && <small role="status">{shareStatus}</small>}</div><button onClick={() => void shareNorth()}><Share2 size={17} /> Share North</button></section>
          <div className="section-heading"><div><p className="eyebrow">MEASUREMENTS & COACHING</p><h2>Independent preferences</h2></div></div><section className="preference-panel"><label><span>Lifting weight</span><select value={profile.units} onChange={(event) => setProfile((value) => ({ ...value, units: event.target.value as ProfileSettings["units"] }))}><option value="imperial">Pounds (lb)</option><option value="metric">Kilograms (kg)</option></select></label><label><span>Body weight</span><select value={profile.bodyWeightUnit} onChange={(event) => setProfile((value) => ({ ...value, bodyWeightUnit: event.target.value as ProfileSettings["bodyWeightUnit"] }))}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></label><label><span>Distance</span><select value={profile.distanceUnit} onChange={(event) => setProfile((value) => ({ ...value, distanceUnit: event.target.value as ProfileSettings["distanceUnit"] }))}><option value="mi">Miles</option><option value="km">Kilometres</option></select></label><label><span>Language</span><select value={profile.language} onChange={(event) => setProfile((value) => ({ ...value, language: event.target.value }))}><option>English</option><option>English (UK)</option><option>French</option><option>Spanish</option></select></label><label><span>Coaching tone</span><select value={profile.tone} onChange={(event) => setProfile((value) => ({ ...value, tone: event.target.value }))}><option>Encouraging and direct</option><option>Quiet and concise</option><option>Detailed and educational</option></select></label><label className="toggle-setting"><div><strong>Notifications</strong><small>Preference saved; delivery begins only after permission is granted.</small></div><input type="checkbox" checked={profile.notifications} onChange={(event) => setProfile((value) => ({ ...value, notifications: event.target.checked }))}/></label></section>
          <div className="section-heading"><div><p className="eyebrow">ACCESSIBILITY</p><h2>Comfort and clarity</h2></div></div><section className="preference-panel"><label className="toggle-setting"><div><strong>Reduce motion</strong><small>Turns off decorative transitions and animation.</small></div><input type="checkbox" checked={profile.reducedMotion} onChange={(event) => setProfile((value) => ({ ...value, reducedMotion: event.target.checked }))}/></label><label className="toggle-setting"><div><strong>Larger text</strong><small>Increases base interface text size.</small></div><input type="checkbox" checked={profile.largeText} onChange={(event) => setProfile((value) => ({ ...value, largeText: event.target.checked }))}/></label><label className="toggle-setting"><div><strong>Higher contrast</strong><small>Strengthens borders and secondary text.</small></div><input type="checkbox" checked={profile.highContrast} onChange={(event) => setProfile((value) => ({ ...value, highContrast: event.target.checked }))}/></label></section>
          <div className="section-heading"><div><p className="eyebrow">PRIVACY & SERVICES</p><h2>Nothing connects silently</h2></div></div><section className="privacy-panel"><div><strong>Local-first data</strong><p>Workouts, photos, preferences and memories remain account-private.</p></div><div><strong>Connected services</strong><p>Health access is granted category by category and can be revoked.</p><section className="service-controls"><button className={healthConnections.some((item) => item.provider === "health_connect" && item.status === "connected") ? "connected" : ""} onClick={() => { window.location.href = "intent://connect#Intent;scheme=northhealth;package=io.bodhix.north.health;S.browser_fallback_url=https%3A%2F%2Fnorth.bodhix.io%2Fnorth-health.apk;end"; }}><span>Samsung Health · Health Connect</span><small>{healthConnections.find((item) => item.provider === "health_connect")?.status === "connected" ? `Connected · last sync ${formatSessionDate(healthConnections.find((item) => item.provider === "health_connect")?.last_sync_at)}` : "Not connected"}</small></button><button disabled><span>Apple Health</span><small>Deferred</small></button></section></div><div><strong>Help & support</strong><p>Replay the product tour or record a gym-floor issue.</p><button className="replay-tour-button" onClick={replayProductTour}><Compass size={15}/> Replay the North tour</button></div></section>
          <div className="section-heading"><div><p className="eyebrow">YOUR DATA</p><h2>Ownership and recovery</h2></div></div><section className="data-controls"><button onClick={exportNorthData}><Download size={18}/><div><strong>Export North backup</strong><small>{history.length} workouts · {activities.length} activities · {checkIns.length} check-ins</small></div><ArrowRight size={15}/></button><label><Upload size={18}/><div><strong>Restore a backup</strong><small>Replace this browser’s North data from a backup file</small></div><ArrowRight size={15}/><input type="file" accept="application/json,.json" onChange={importNorthData}/></label><button className="reset-data" onClick={() => void resetNorthData()}><Database size={18}/><div><strong>Erase this device’s copy</strong><small>Signs out here; synced account records stay safe</small></div><ArrowRight size={15}/></button></section>{dataStatus && <p className="data-status">{dataStatus}</p>}<button className="test-log-link" onClick={() => openTestLog("settings")}><NotebookPen size={18}/><div><strong>Gym test notes</strong><small>{testNotes.filter((item) => !item.resolved).length} open observations</small></div><ArrowRight size={15}/></button>
        </section>
      )}

      {screen === "you" && (
        <section className="screen destination-screen you-screen">
          <p className="eyebrow">YOU</p>
          <div className="identity-header">
            <span className="journey-mark"><Compass size={36} /></span>
            <div><h1>{profile.name ? `${profile.name}.` : "Your North."}</h1><p>{profile.direction}</p></div>
          </div>
          <p className="together">Your record contains <strong>{history.length + activities.length} completed movement sessions.</strong></p>
          <section className="you-progress-dashboard">
            <header><div><p className="eyebrow">YOU, IN PROGRESS</p><h2>Your body and record</h2></div><span>{Math.round(unlockedMilestones.length / milestoneResults.length * 100)}%<small>journey</small></span></header>
            <div className="body-status-card"><div><small>CURRENT WEIGHT</small><strong>{latestBodyWeight === null ? "Add a check-in" : `${latestBodyWeight.toFixed(1)} ${bodyWeightUnit}`}</strong><span>{bodyWeightChange === null ? `${bodyWeightCheckIns.length} recorded check-in${bodyWeightCheckIns.length === 1 ? "" : "s"}` : `${bodyWeightChange > 0 ? "+" : ""}${bodyWeightChange.toFixed(1)} ${bodyWeightUnit} since first record`}</span></div><button type="button" onClick={() => document.getElementById("personal-measurements")?.scrollIntoView({ behavior: profile.reducedMotion ? "auto" : "smooth" })}>Update measurements <ArrowRight size={14} /></button></div>
            <section className="personal-measurements" id="personal-measurements"><div><p className="eyebrow">BODY & MEASUREMENTS</p><h3>Your current baseline</h3><small className="measurement-guidance">Height is a profile detail, not a daily check-in. Set it once and only update it when needed.</small></div><div className="measurement-fields"><label><span>Height · occasional</span><input value={profile.height} onChange={(event) => setProfile((value) => ({ ...value, height: event.target.value }))} placeholder="e.g. 5 ft 11 in or 180 cm" aria-label="Height" /></label><label><span>Today's body weight ({bodyWeightUnit}) · optional</span><input inputMode="decimal" value={draftCheckIn.weight} onChange={(event) => setDraftCheckIn((value) => ({ ...value, weight: event.target.value }))} placeholder={`Add weight in ${bodyWeightUnit}`} aria-label={`Body weight in ${bodyWeightUnit}`} /></label></div><div className="measurement-actions"><select value={profile.bodyWeightUnit} onChange={(event) => setProfile((value) => ({ ...value, bodyWeightUnit: event.target.value as ProfileSettings["bodyWeightUnit"] }))} aria-label="Body weight unit"><option value="lb">lb</option><option value="kg">kg</option></select><button type="button" onClick={saveTodayBodyWeight} disabled={!draftCheckIn.weight.trim()}>Save today's weight</button></div></section>
            <div className="personal-record-grid"><article><strong>{history.length}</strong><span>workouts</span></article><article><strong>{recordedSets}</strong><span>working sets</span></article><article><strong>{recordedVolume ? `${Math.round(displayWeight(recordedVolume)).toLocaleString()} ${weightUnit}` : "—"}</strong><span>volume</span></article><article><strong>{personalRecords.length}</strong><span>personal bests</span></article></div>
          </section>
          <section className="direction-statement"><div className="direction-heading"><p className="eyebrow">YOUR DIRECTION</p><button onClick={() => setProfileEditing((editing) => !editing)}>{profileEditing ? "Done" : "Edit"}</button></div>{profileEditing ? <div className="profile-editor"><label><span>Name</span><input value={profile.name} onChange={(event) => setProfile((value) => ({ ...value, name: event.target.value }))} placeholder="What should North call you?" /></label><label><span>Direction</span><textarea rows={3} value={profile.direction} onChange={(event) => setProfile((value) => ({ ...value, direction: event.target.value }))} /></label><div><label><span>Training rhythm</span><select value={profile.trainingDays} onChange={(event) => setProfile((value) => ({ ...value, trainingDays: Number(event.target.value) }))}>{[2,3,4,5,6].map((days) => <option key={days} value={days}>{days} days / week</option>)}</select></label><label><span>Target date</span><input type="date" value={profile.targetDate} onChange={(event) => setProfile((value) => ({ ...value, targetDate: event.target.value }))} /></label></div></div> : <><h2>{profile.direction}</h2><small>{profile.trainingDays} planned training days per week{profile.targetDate ? ` · target ${formatSessionDate(`${profile.targetDate}T12:00:00`)}` : ""} · Chapter {Math.floor(unlockedMilestones.length / 4) + 1}</small></>}</section>
          {earnedIdentities.length > 0 && <section className="earned-identities"><p className="eyebrow">QUIETLY EARNED</p><div>{earnedIdentities.map((identity) => <span key={identity}>{identity}</span>)}</div></section>}
          <div className="section-heading"><div><p className="eyebrow">WHAT NORTH HAS LEARNED</p><h2>A clearer picture of you</h2></div></div>
          <section className="memory-controls"><label><div><strong>Permissioned memory</strong><small>{profile.memoryEnabled ? "North may surface observations derived from your records." : "Learned observations are hidden from North and Nova."}</small></div><input type="checkbox" checked={profile.memoryEnabled} onChange={(event) => setProfile((value) => ({ ...value, memoryEnabled: event.target.checked }))} /></label>{profile.memoryEnabled && visibleLearnedInsights.map((insight) => <article key={insight.id}><span>{insight.icon}</span><div><strong>{insight.title}</strong><small>{profile.memoryCorrections[insight.id] || insight.summary}</small><p>{insight.evidence}</p><input value={profile.memoryCorrections[insight.id] ?? ""} onChange={(event) => setProfile((value) => ({ ...value, memoryCorrections: { ...value.memoryCorrections, [insight.id]: event.target.value } }))} placeholder="Correct how North describes this…" /></div><button onClick={() => setProfile((value) => ({ ...value, dismissedInsights: [...value.dismissedInsights, insight.id] }))}>Forget</button></article>)}{profile.dismissedInsights.length > 0 && <button className="restore-memory" onClick={() => setProfile((value) => ({ ...value, dismissedInsights: [] }))}>Restore {profile.dismissedInsights.length} forgotten observation{profile.dismissedInsights.length === 1 ? "" : "s"}</button>}</section>
          <div className="legacy-you-technical-settings" aria-hidden="true"><div className="section-heading"><div><p className="eyebrow">ACCOUNT & APP</p><h2>Keep North close</h2></div></div>
          <section className="account-menu-grid you-account-menu"><button onClick={() => setScreen("settings")}><SlidersHorizontal size={19}/><span><strong>App settings</strong><small>Preferences, privacy, installation and sharing</small></span><ArrowRight size={15}/></button>{readNorthSession() && <button onClick={() => setScreen("account")}><UserRound size={19}/><span><strong>Account & devices</strong><small>Sync, connected devices and sign-in</small></span><ArrowRight size={15}/></button>}</section>
          <div className="section-heading"><div><p className="eyebrow">APPEARANCE</p><h2>Choose a palette</h2></div></div>
          <section className="theme-picker" aria-label="Theme palette">{themeOptions.map((theme) => <button key={theme.id} className={`${themeName === theme.id ? "selected " : ""}${theme.mode}`} onClick={() => setThemeName(theme.id)} aria-pressed={themeName === theme.id}><span className={`theme-swatch ${theme.id}`}><i /><i /><i /></span><strong>{theme.name}</strong><small>{theme.mode}</small></button>)}</section>
          <div className="section-heading"><div><p className="eyebrow">PERSONALISATION</p><h2>How North meets you</h2></div></div><section className="preference-panel"><label><span>Lifting weight</span><select value={profile.units} onChange={(event) => setProfile((value) => ({ ...value, units: event.target.value as ProfileSettings["units"] }))}><option value="imperial">Pounds (lb)</option><option value="metric">Kilograms (kg)</option></select></label><label><span>Body weight</span><select value={profile.bodyWeightUnit} onChange={(event) => setProfile((value) => ({ ...value, bodyWeightUnit: event.target.value as ProfileSettings["bodyWeightUnit"] }))}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></label><label><span>Distance</span><select value={profile.distanceUnit} onChange={(event) => setProfile((value) => ({ ...value, distanceUnit: event.target.value as ProfileSettings["distanceUnit"] }))}><option value="mi">Miles</option><option value="km">Kilometres</option></select></label><label><span>Language</span><select value={profile.language} onChange={(event) => setProfile((value) => ({ ...value, language: event.target.value }))}><option>English</option><option>English (UK)</option><option>French</option><option>Spanish</option></select></label><label><span>Coaching tone</span><select value={profile.tone} onChange={(event) => setProfile((value) => ({ ...value, tone: event.target.value }))}><option>Encouraging and direct</option><option>Quiet and concise</option><option>Detailed and educational</option></select></label><label className="toggle-setting"><div><strong>Notifications</strong><small>Preference saved; delivery begins when accounts and notification permission are implemented.</small></div><input type="checkbox" checked={profile.notifications} onChange={(event) => setProfile((value) => ({ ...value, notifications: event.target.checked }))} /></label></section>
          <div className="section-heading"><div><p className="eyebrow">ACCESSIBILITY</p><h2>Comfort and clarity</h2></div></div><section className="preference-panel"><label className="toggle-setting"><div><strong>Reduce motion</strong><small>Turns off decorative transitions and animation.</small></div><input type="checkbox" checked={profile.reducedMotion} onChange={(event) => setProfile((value) => ({ ...value, reducedMotion: event.target.checked }))} /></label><label className="toggle-setting"><div><strong>Larger text</strong><small>Increases base interface text size.</small></div><input type="checkbox" checked={profile.largeText} onChange={(event) => setProfile((value) => ({ ...value, largeText: event.target.checked }))} /></label><label className="toggle-setting"><div><strong>Higher contrast</strong><small>Strengthens borders and secondary text.</small></div><input type="checkbox" checked={profile.highContrast} onChange={(event) => setProfile((value) => ({ ...value, highContrast: event.target.checked }))} /></label></section>
          <div className="section-heading"><div><p className="eyebrow">PRIVACY & SERVICES</p><h2>Nothing connects silently</h2></div></div><section className="privacy-panel"><div><strong>Local-first data</strong><p>Workouts, photos, preferences, and memories remain account-private. Weather coordinates are sent only to Open-Meteo when you request weather and are not saved by North.</p></div><div><strong>Connected services</strong><p>Health access is granted on the phone, category by category. North records scopes, source apps, last sync, pause and revocation state.</p><section className="service-controls"><button className={healthConnections.some((item) => item.provider === "health_connect" && item.status === "connected") ? "connected" : ""} onClick={() => { window.location.href = "intent://connect#Intent;scheme=northhealth;package=io.bodhix.north.health;S.browser_fallback_url=https%3A%2F%2Fnorth.bodhix.io%2Fnorth-health.apk;end"; }}><span>Samsung Health · Health Connect</span><small>{healthConnections.find((item) => item.provider === "health_connect")?.status === "connected" ? `Connected · last sync ${formatSessionDate(healthConnections.find((item) => item.provider === "health_connect")?.last_sync_at)} · Tap to sync` : "Tap to connect through the North Health app"}</small></button><button disabled><span>Apple Health</span><small>Not connected · iPhone bridge next</small></button><button disabled><span>Strava</span><small>Not connected</small></button></section></div><div><strong>Help & support</strong><p>Use Gym test notes to preserve confusing, slow, missing, or broken moments. Emergency and medical guidance are outside North’s role.</p><button className="replay-tour-button" onClick={replayProductTour}><Compass size={15} /> Replay the North tour</button></div></section>
          <div className="section-heading"><div><p className="eyebrow">YOUR DATA</p><h2>Ownership and recovery</h2></div></div>
          <section className="data-controls">
            <button onClick={exportNorthData}><Download size={18} /><div><strong>Export North backup</strong><small>{history.length} workouts · {activities.length} activities · {checkIns.length} check-ins</small></div><ArrowRight size={15} /></button>
            <label><Upload size={18} /><div><strong>Restore a backup</strong><small>Replace this browser’s North data from a backup file</small></div><ArrowRight size={15} /><input type="file" accept="application/json,.json" onChange={importNorthData} /></label>
            <button className="reset-data" onClick={() => void resetNorthData()}><Database size={18} /><div><strong>Erase this device’s copy</strong><small>Signs out here; synced account records stay safe</small></div><ArrowRight size={15} /></button>
          </section>
          {dataStatus && <p className="data-status">{dataStatus}</p>}
          <button className="test-log-link" onClick={() => openTestLog("you")}><NotebookPen size={18} /><div><strong>Gym test notes</strong><small>{testNotes.filter((item) => !item.resolved).length} open observations</small></div><ArrowRight size={15} /></button></div>
        </section>
      )}

      {screen === "exercise-detail" && (exerciseDetailPreview ?? current) && ((current) => {
        const definition = exerciseLibrary.find((item) => item.name.toLowerCase() === current.name.toLowerCase());
        const progressRecord = exerciseProgress.find((item) => item.name.toLowerCase() === current.name.toLowerCase());
        const completedForExercise = history.filter((item) => item.exercises.some((exercise) => exercise.name.toLowerCase() === current.name.toLowerCase() && exercise.sets.some((set) => set.complete)));
        const latestExercise = completedForExercise[0]?.exercises.find((exercise) => exercise.name.toLowerCase() === current.name.toLowerCase());
        const latestSet = latestExercise?.sets.filter((set) => set.complete).sort((a, b) => Number(b.weight) - Number(a.weight))[0];
        const guidance = getExerciseGuidance(definition ?? { name: current.name, movementPattern: "General" });
        const exerciseMedia = getExerciseMedia(current.name);
        const exerciseDemo = getApprovedExerciseDemo(current.name);
        const performancePoints = completedForExercise.slice(0, 8).reverse().map((workout) => Math.max(0, ...workout.exercises.find((exercise) => exercise.name.toLowerCase() === current.name.toLowerCase())!.sets.filter((set) => set.complete).map((set) => Number(set.weight) || 0)));
        const performancePeak = Math.max(1, ...performancePoints);
        const muscleActivation = getMuscleActivation(definition);
        const commonMuscleNames: Record<string, string> = { "front-delts": "Front delts", "side-delts": "Side delts", "rear-delts": "Rear delts", "lower-back": "Lower back" };
        const muscleName = (name: string) => commonMuscleNames[name] ?? name.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
        const mainMuscles = muscleActivation.primary.map(muscleName);
        const supportingMuscles = [...muscleActivation.secondary, ...muscleActivation.supporting].map(muscleName);
        return <section className="screen exercise-detail-screen">
          <header className="exercise-detail-nav"><button className="back-button" onClick={closeExerciseDetail}><ArrowLeft size={18} /> {exerciseDetailReturn === "workout-template" ? "Workout builder" : "Workout"}</button><div><button className={favoriteExerciseNames.includes(current.name) ? "active" : ""} onClick={() => setFavoriteExerciseNames((names) => names.includes(current.name) ? names.filter((name) => name !== current.name) : [...names, current.name])} aria-label={`${favoriteExerciseNames.includes(current.name) ? "Remove" : "Add"} ${current.name} ${favoriteExerciseNames.includes(current.name) ? "from" : "to"} favourites`}><Heart size={20} fill={favoriteExerciseNames.includes(current.name) ? "currentColor" : "none"}/></button><button onClick={() => document.getElementById("exercise-technique")?.scrollIntoView({ behavior: profile.reducedMotion ? "auto" : "smooth" })} aria-label="Open exercise technique"><SlidersHorizontal size={20} /></button></div></header>
          <section className="exercise-detail-hero"><div><span><Dumbbell size={25} /></span><p className="eyebrow">EXERCISE</p><h1>{current.name}</h1><p>{definition?.equipment ?? "Equipment"} · {definition?.movementPattern ?? "Controlled movement"}</p></div><div className="exercise-muscle-summary"><strong>Main muscles</strong><span>{mainMuscles.join(" · ") || definition?.category || "Full body"}</span>{supportingMuscles.length > 0 && <small>Also works {supportingMuscles.join(" · ")}</small>}</div></section>
          <section className="exercise-today-card"><header><div><p className="eyebrow">TODAY</p><h2>{current.target}</h2></div><span>{current.rest}s rest</span></header><div>{current.sets.map((set, index) => <article key={`${current.id}-detail-${index}`}><small>SET {index + 1}</small><strong>{set.weight ? `${displayWeight(set.weight).toFixed(1)} ${weightUnit}` : `Choose ${weightUnit}`} × {set.reps || prescribedResult(current.target)}</strong></article>)}</div><button className="primary-button" onClick={() => setScreen(exerciseDetailReturn)}>Back to workout <ArrowRight size={17}/></button></section>
          <section className="exercise-quick-guide"><p className="eyebrow">HOW TO DO IT</p><h2>Three things to focus on</h2><ol>{guidance.execution.slice(0, 3).map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol><p><strong>Keep in mind:</strong> {current.cue}</p></section>
          <details className="exercise-detail-section" id="exercise-muscles"><summary><div><strong>Muscles worked</strong><small>{mainMuscles.join(" · ") || definition?.category || "Full body"}</small></div><ChevronDown size={18}/></summary><AnatomyMap {...muscleActivation} visibility={muscleView} /></details>
          <details className="exercise-detail-section"><summary><div><strong>Your history</strong><small>{completedForExercise.length ? `${completedForExercise.length} sessions logged` : "No recorded sessions yet"}</small></div><ChevronDown size={18}/></summary><section className="exercise-performance-card"><div className="performance-kpis"><article><small>LAST TIME</small><strong>{latestSet?.weight ? `${displayWeight(latestSet.weight).toFixed(1)} ${weightUnit}` : "—"}</strong><span>{latestSet?.reps ? `${latestSet.reps} reps` : "No result yet"}</span></article><article className="pr"><small>PERSONAL BEST</small><strong>{progressRecord?.bestWeight ? `${displayWeight(progressRecord.bestWeight).toFixed(1)} ${weightUnit}` : "—"}</strong><span>{progressRecord?.sets ?? 0} sets logged</span></article><article><small>SESSIONS</small><strong>{completedForExercise.length}</strong><span>times performed</span></article></div>{performancePoints.length > 0 ? <div className="mini-strength-chart" aria-label={`Recent ${current.name} working-weight trend`}>{performancePoints.map((point, index) => <i key={`${point}-${index}`} style={{ height: `${Math.max(12, Math.round(point / performancePeak * 100))}%` }}/>)}</div> : <p className="exercise-no-history">Complete this movement to begin its personal trend.</p>}</section></details>
          <details className="exercise-detail-section" id="exercise-technique"><summary><div><strong>Technique and safety</strong><small>Setup, common mistakes, and safety notes</small></div><ChevronDown size={18}/></summary><section className="exercise-technique-card"><div className="technique-columns"><article><strong>SETUP</strong><ol>{guidance.setup.map((step) => <li key={step}>{step}</li>)}</ol></article><article><strong>COMMON MISTAKES</strong><ul>{guidance.mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul></article></div><article className="breathing-cue"><strong>BREATHING</strong><p>{guidance.breathing}</p></article><aside><strong>SAFETY</strong><p>{definition?.safetyNote ?? "Use a controlled range you can own. Stop for sharp pain, dizziness, numbness, or a sudden loss of control."}</p></aside>{exerciseDemo && <img className="exercise-detail-demo" src={exerciseDemo} alt={exerciseMedia?.alt ?? `Start and finish demonstration for ${current.name}`} />}</section></details>
          <details className="exercise-detail-section"><summary><div><strong>Gymbro details</strong><small>Alternatives, anatomy data, and tracking method</small></div><ChevronDown size={18}/></summary>{canonicalExerciseFor(current) && <NormalizedExerciseDetails exercise={canonicalExerciseFor(current)!}/>}</details>
          <button className="exercise-alternative-button" onClick={() => { setScreen(exerciseDetailReturn); setEditingExerciseId(current.id); }}><RotateCcw size={18}/><div><strong>Equipment busy?</strong><small>See safe alternatives for today</small></div><ArrowRight size={17}/></button>
        </section>;
      })(exerciseDetailPreview ?? current)}

      {screen === "prepare" && (
        <section className="screen">
          <button className="back-button" onClick={leavePreparation}><ArrowLeft size={17} /> {session.addedLater ? "Save & Journey" : "Save & Training"}</button>
          <p className="eyebrow">{session.addedLater ? "ADD A PAST WORKOUT" : "TODAY’S TRAINING"}</p>
          <h1>{session.addedLater ? "Record what happened." : "Ready when you are."}</h1>
          <p className="lead">{session.addedLater ? "Use the performed date for progress while North separately preserves when this record was entered." : "Review the order, then take North onto the gym floor."}</p>

          {session.addedLater && <section className="backfill-evidence-card"><span><History/></span><div><small>ADDED LATER</small><strong>Performed {formatSessionDate(session.performedAt)}</strong><p>Entered {formatSessionDate(session.recordedAt)} · Nova and progress use these timestamps for different purposes.</p></div><label><span>Duration</span><div className="unit-input"><DeferredIntegerInput value={session.durationMinutes ?? Math.max(1, plannedMinutes(session.exercises))} min={1} max={600} onCommit={(durationMinutes) => setSession((value) => ({ ...value, durationMinutes }))} label="Backfilled workout duration in minutes"/><small>min</small></div></label></section>}

          {!session.addedLater && <section className="workout-source-switcher"><button onClick={() => { setTemplateSource("north"); setScreen("workout-library"); }}><span><Sparkles size={18} /></span><strong>Premade</strong><small>Choose by area or goal</small></button><button onClick={() => { setTemplateSource("personal"); setScreen("workout-library"); }}><span><Heart size={18} /></span><strong>My Workouts</strong><small>Saved and favourites</small></button><button className="active"><span><SlidersHorizontal size={18} /></span><strong>Edit this</strong><small>Shape today’s session</small></button></section>}

          <div className="workout-summary">
            <span><Clock3 size={17} /> {session.durationMinutes ?? plannedMinutes(session.exercises)} min</span>
            <span><Dumbbell size={17} /> {session.exercises.flatMap((exercise) => exercise.sets).length} sets</span>
          </div>

          <div className="exercise-list">
            {session.exercises.map((exercise, index) => {
              const definition = exerciseLibrary.find((item) => item.name.toLowerCase() === exercise.name.toLowerCase());
              const demo = getApprovedExerciseDemo(exercise.name);
              const completedSets = exercise.sets.filter((set) => set.complete).length;
              const completion = Math.round(completedSets / Math.max(1, exercise.sets.length) * 100);
              return (
              <Fragment key={exercise.id}>
                <article className={`prepare-row premium-exercise-card ${demo ? "has-demo" : ""}`}>
                  <span className="exercise-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="prepare-exercise-media">{demo ? <img src={demo} alt="" /> : <Dumbbell size={22} />}</span>
                  <div>
                    <h3>{exercise.name}</h3>
                    <div className="movement-card-tags"><span>{definition?.category ?? "Custom"}</span><span>{definition?.equipment ?? "Your setup"}</span><span>{definition?.movementPattern ?? "Movement"}</span></div>
                    <p>{exercise.target} · {exercise.sets.length} sets · {exercise.rest}s rest</p>
                    <small>Last recorded: {previousPerformance(exercise)}</small>
                    <div className="movement-card-progress"><i style={{ width: `${completion}%` }} /><span>{completedSets}/{exercise.sets.length}</span></div>
                    <div className="prepare-row-actions"><button className="exercise-profile-button" onClick={() => { setSession((value) => ({ ...value, currentId: exercise.id })); setExerciseDetailReturn("prepare"); setScreen("exercise-detail"); }}><Play size={13} /> View exercise</button><button className="adjust-button" onClick={() => setEditingExerciseId((value) => value === exercise.id ? null : exercise.id)}><SlidersHorizontal size={13} /> {editingExerciseId === exercise.id ? "Close adjustments" : "Adjust"}</button></div>
                  </div>
                  <div className="order-controls">
                    <button onClick={() => moveExercise(index, -1)} disabled={index === 0} aria-label={`Move ${exercise.name} up`}><ChevronUp size={17} /></button>
                    <button onClick={() => moveExercise(index, 1)} disabled={index === session.exercises.length - 1} aria-label={`Move ${exercise.name} down`}><ChevronDown size={17} /></button>
                    <button onClick={() => removeExercise(exercise.id)} disabled={session.exercises.length === 1} aria-label={`Remove ${exercise.name}`}><Trash2 size={15} /></button>
                  </div>
                </article>
                {editingExerciseId === exercise.id && (
                  <section className="prescription-editor">
                    <label><span>Sets</span><DeferredIntegerInput value={exercise.sets.length} min={1} max={10} onCommit={(sets) => resizeExerciseSets(exercise.id, sets)} label={`${exercise.name} planned sets`} /></label>
                    <label><span>Planned load</span><div className="unit-input"><DeferredUnitInput storedValue={exercise.sets[0]?.weight ?? ""} formatValue={displayWeight} storeValue={storeWeight} onCommit={(weight) => updatePlannedLoad(exercise.id, weight)} label={`${exercise.name} planned load in ${weightUnit}`} /><small>{weightUnit}</small></div></label>
                    <label className="wide"><span>Target</span><input value={exercise.target} onChange={(event) => patchExercise(exercise.id, { target: event.target.value })} placeholder="3 sets · 8–12 reps" /></label>
                    <label><span>Rest</span><div className="unit-input"><DeferredIntegerInput value={exercise.rest} min={0} max={600} step={15} onCommit={(rest) => patchExercise(exercise.id, { rest })} label={`${exercise.name} rest seconds`} /><small>sec</small></div></label>
                    {substitutionsFor(exercise.name).length > 0 && <label className="wide"><span>Substitute movement</span><select value="" onChange={(event) => substituteExercise(exercise.id, event.target.value)}><option value="">Choose a similar movement…</option>{substitutionsFor(exercise.name).map((name) => <option key={name} value={name}>{name}</option>)}</select></label>}
                  </section>
                )}
              </Fragment>
            )})}
          </div>
          <button className="add-exercise-button" onClick={() => setPickerOpen((value) => !value)}>
            {pickerOpen ? <X size={17} /> : <Plus size={17} />}{pickerOpen ? "Close exercise picker" : "Add an exercise"}
          </button>
          {pickerOpen && (
            <section className="exercise-picker">
              <ExercisePickerV2 onAdd={(exercise) => addExercise(toLegacyExerciseDefinition(exercise))} onView={(exercise) => { setExerciseDetailPreview(buildExercise(toLegacyExerciseDefinition(exercise), `preview-${exercise.id}`)); setExerciseDetailReturn("prepare"); setScreen("exercise-detail"); }} addedIds={session.exercises.map((exercise) => exercise.canonicalExerciseId).filter((id): id is string => Boolean(id))}/>
              <details className="legacy-custom-exercise"><summary>Add a custom movement</summary>
              <label className="search-field"><Search size={17} /><input value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder={`Search ${exerciseLibrary.length} exercises`} /></label>
              <div className="filter-label">BODY AREA</div>
              <div className="picker-filters">{exerciseCategories.map((category) => <button key={category} className={exerciseCategory === category ? "active" : ""} onClick={() => setExerciseCategory(category)}>{category}</button>)}</div>
              <div className="filter-label">EQUIPMENT</div>
              <div className="picker-filters">{exerciseEquipment.map((equipment) => <button key={equipment} className={exerciseEquipmentFilter === equipment ? "active" : ""} onClick={() => setExerciseEquipmentFilter(equipment)}>{equipment}</button>)}</div>
              <p className="result-count">{filteredLibrary.length} movement{filteredLibrary.length === 1 ? "" : "s"}</p>
              <div className="picker-results">
                {filteredLibrary.map((exercise) => (
                  <button key={exercise.name} onClick={() => addExercise(exercise)}>
                    <span><strong>{exercise.name}</strong><small>{exercise.category} · {exercise.equipment} · {exercise.difficulty} · {exercise.locations.join("/")}</small><small>{exercise.movementPattern} · {exercise.target}</small></span><Plus size={17} />
                  </button>
                ))}
                {filteredLibrary.length === 0 && <p>No matching movement. Add it as a custom exercise below.</p>}
              </div>
              <div className="custom-exercise">
                <input value={customName} onChange={(event) => setCustomName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addCustomExercise()} placeholder="Custom exercise name" />
                <button onClick={addCustomExercise} disabled={!customName.trim()}>Add</button>
              </div>
              </details>
            </section>
          )}
          <div className="prepare-save-actions"><button className="secondary-button" onClick={() => void savePreparedWorkout()} disabled={syncing}><Save size={16}/>{syncing ? "Saving…" : "Save workout setup"}</button><button className="primary-button" onClick={beginWorkout}>Start workout <Play size={17} fill="currentColor" /></button></div>
          {recorderStatus && <p className="recorder-status" role="status">{recorderStatus}</p>}
        </section>
      )}

      {screen === "workout" && current && (
        <section className="screen workout-screen">
          <div className="workout-header">
            <button className="back-button" onClick={() => setScreen("today")}><ArrowLeft size={17} /> Save & leave</button>
            <span>{Math.floor(elapsedWorkoutSeconds / 60)}:{String(elapsedWorkoutSeconds % 60).padStart(2, "0")} · {progress}%</span>
          </div>
          <div className="progress-track large"><span style={{ width: `${progress}%` }} /></div>
          <p className="eyebrow">EXERCISE {currentIndex + 1} OF {session.exercises.length}</p>
          <h1>{current.name}</h1>
          <p className="lead">{current.target}</p>

          <section className="workout-movement-hero"><button onClick={() => { setExerciseDetailReturn("workout"); setScreen("exercise-detail"); }} aria-label={`Open ${current.name} exercise profile`}>{getApprovedExerciseDemo(current.name) ? <img src={getApprovedExerciseDemo(current.name)!} alt="" /> : <span><Dumbbell size={32}/></span>}<div><small>MOVEMENT PROFILE</small><strong>Form, muscles and history</strong><em>{exerciseLibrary.find((item) => item.name.toLowerCase() === current.name.toLowerCase())?.category ?? "Custom"} · {current.sets.filter((set) => set.complete).length}/{current.sets.length} sets</em></div><ArrowRight size={18}/></button></section>

          <section className="cue"><Compass size={18} /><p>{current.cue}</p></section>

          {(() => { const canonical=canonicalExerciseFor(current); const trackingTemplate=trackingTemplates.find((item)=>item.id===canonical?.trackingTemplateId); const usesClassicTable=!trackingTemplate||trackingTemplate.requiredFieldIds.every((fieldId)=>fieldId==="weight"||fieldId==="reps"); return !usesClassicTable&&canonical&&trackingTemplate?<DynamicSetLogger exercise={canonical} template={trackingTemplate} sets={current.sets.map(legacyCompatibleSet)} preferences={defaultUnitPreferences(profile.units==="metric")} onChange={(index,patch)=>updateSet(index,patch)} onComplete={(index)=>{const wasComplete=current.sets[index]?.complete;updateSet(index,{complete:!wasComplete});if(!wasComplete){setTimer(current.sets[index]?.restSeconds || current.rest);setTimerRunning(true);}}}/>:<div className="sets-table">
            <div className="set-row set-head"><span>SET</span><span>WEIGHT</span><span>REPS</span><span>DONE</span></div>
            {current.sets.map((set, index) => (
              <Fragment key={index}><div className={`set-row ${set.complete ? "set-complete" : ""}`}>
                <strong>{index + 1}</strong>
                <div className="set-value-control weight"><button onClick={() => adjustWorkingSet(index,"weight",-1)} aria-label={`Reduce set ${index + 1} weight`}>−</button><label><DeferredUnitInput storedValue={set.weight} formatValue={displayWeight} storeValue={storeWeight} onCommit={(weight) => updateSet(index, { weight })} label={`Set ${index + 1} weight in ${weightUnit}`} /><small>{weightUnit}</small></label><button onClick={() => adjustWorkingSet(index,"weight",1)} aria-label={`Increase set ${index + 1} weight`}>+</button></div>
                <div className="set-value-control reps"><button onClick={() => adjustWorkingSet(index,"reps",-1)} aria-label={`Reduce set ${index + 1} repetitions`}>−</button><input inputMode="numeric" placeholder="—" value={set.reps} onChange={(event) => updateSet(index, { reps: event.target.value })} aria-label={`Set ${index + 1} reps`} /><button onClick={() => adjustWorkingSet(index,"reps",1)} aria-label={`Increase set ${index + 1} repetitions`}>+</button></div>
                <button className="set-check" onClick={() => updateSet(index, { complete: !set.complete })} aria-label={`Complete set ${index + 1}`}>{set.complete && <Check size={18} />}</button>
              </div><small className="set-history-hint">Set {index + 1} last time: <strong>{previousSetPerformance(current,index)}</strong></small></Fragment>
            ))}
          </div>; })()}
          <section className="gym-set-controls"><div><button onClick={addWorkingSet}><Plus size={15}/> Add set</button><button onClick={removeLastWorkingSet} disabled={current.sets.length <= 1}><Trash2 size={14}/> Remove last</button></div></section>
          <p className="recorder-status" role="status" aria-live="polite">{recorderStatus || "Every change is saved automatically."}</p>

          <label className="note-field">
            <span>Quick note</span>
            <textarea value={current.note} onChange={(event) => patchExercise(current.id, { note: event.target.value })} placeholder="How did that feel?" rows={2} />
          </label>

          {timer > 0 && timerControlsOpen && createPortal(
            <section className="timer-panel">
              <div><TimerReset size={20} /><span>REST</span><strong>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</strong></div>
              <button onClick={() => setTimer((value) => Math.max(0, value - 15))} aria-label="Remove 15 seconds from rest">−15</button>
              <button onClick={() => setTimerRunning((value) => !value)}>{timerRunning ? <Pause size={18} /> : <Play size={18} />}</button>
              <button onClick={() => setTimer((value) => value + 15)} aria-label="Add 15 seconds to rest">+15</button>
              <button onClick={() => { setTimer(0); setTimerControlsOpen(false); }}>Skip</button>
            </section>,
            document.body,
          )}

          <div className="workout-actions">
            <button className={`workout-continue-button${current.sets.every((set) => set.complete) ? " ready-to-finish" : ""}`} onClick={() => current.sets.every((set) => set.complete) ? finishExercise() : completeNextSet()}>
              <span className="workout-continue-icon">{current.sets.every((set) => set.complete) ? <ArrowRight size={22} /> : <Check size={22} />}</span>
              <span>{current.sets.every((set) => set.complete) ? <><small>All sets logged</small><strong>Finish {current.name}</strong></> : <><small>Set {current.sets.findIndex((set) => !set.complete) + 1} of {current.sets.length}</small><strong>Complete set {current.sets.findIndex((set) => !set.complete) + 1}</strong></>}</span>
              {current.sets.every((set) => set.complete) ? <ArrowRight size={20} /> : <Check size={20} />}
            </button>
            <button className="workout-pass-button" onClick={passCurrent}><SkipForward size={15} /> Pass this exercise</button>
          </div>
          <button className="test-note-button" onClick={() => openTestLog("workout")}><Bug size={14} /> Something got in the way</button>

          {returnQueue.length > 0 && (
            <section className="return-queue">
              <p className="eyebrow">RETURN TO</p>
              {returnQueue.map((exercise) => (
                <button key={exercise.id} onClick={() => returnTo(exercise.id)}><RotateCcw size={15} />{exercise.name}<ArrowRight size={15} /></button>
              ))}
            </section>
          )}

          {available.length === 0 && returnQueue.length === 0 && (
            <button className="primary-button" onClick={() => setScreen("review")}>Review workout <ArrowRight size={17} /></button>
          )}
        </section>
      )}

      {screen === "review" && (
        <section className="screen review-screen">
          <span className="completion-mark"><img src="/png/transparent/footprint-stamp-offwhite.png" alt="" /></span>
          <p className="eyebrow">SESSION COMPLETE</p>
          <h1>You showed up.</h1>
          <p className="lead">Take a moment to leave North with the context that numbers can’t capture.</p>
          {session.addedLater && <p className="added-later-label"><History size={14}/> Performed {formatSessionDate(session.performedAt)} · entered {formatSessionDate(session.recordedAt)}</p>}

          <section className="review-stats">
            <div><strong>{sessionMinutes({ ...session, finishedAt: session.finishedAt ?? new Date().toISOString() }) ?? 1}</strong><span>minutes</span></div>
            <div><strong>{session.exercises.flatMap((item) => item.sets).filter((set) => set.complete).length}</strong><span>sets logged</span></div>
            <div><strong>{completedCount}/{session.exercises.length}</strong><span>completed</span></div>
          </section>
          {sessionNewRecords.length > 0 && <section className="earned-pr-banner"><span><TrendingUp size={22}/></span><div><p className="eyebrow">EARNED TODAY</p><h2>{sessionNewRecords.length === 1 ? "A new personal best." : `${sessionNewRecords.length} new personal bests.`}</h2>{sessionNewRecords.map((record) => <p key={record.exercise}><strong>{record.exercise}</strong><span>{displayWeight(record.previous).toFixed(1)} → {displayWeight(record.current).toFixed(1)} {weightUnit}</span></p>)}</div></section>}
          {sessionEarnedMoments.length > 0 && <section className="earned-moments" aria-label="Achievements earned in this session">{sessionEarnedMoments.map((moment) => <article className={moment.kind} key={moment.id}><span>{moment.kind === "program" ? <Trophy size={23} /> : <Award size={23} />}</span><div><p className="eyebrow">{moment.eyebrow}</p><h2>{moment.title}</h2><p>{moment.detail}</p></div></article>)}</section>}

          <section className="review-list">
            {session.exercises.map((exercise) => (
              <article key={exercise.id}><header><span className={exercise.sets.every((set) => set.complete) ? "done-dot" : "open-dot"} /><div><strong>{exercise.name}</strong><small>{exercise.sets.filter((set) => set.complete).length}/{exercise.sets.length} sets completed</small></div></header><div className="review-set-receipts">{exercise.sets.map((set, index) => { const target = Number(prescribedResult(exercise.target)); const hit = set.complete && (!target || Number(set.reps) >= target); const delta = previousSetDelta(exercise, set, index); return <span className={!set.complete ? "not-done" : hit ? "hit" : "under"} key={index}><small>Set {index + 1}</small><strong>{set.complete ? `${set.weight ? `${displayWeight(set.weight).toFixed(1)} ${weightUnit}` : "Bodyweight"} × ${set.reps || "—"}` : "Not completed"}</strong><em>{set.complete ? `${hit ? "Target hit" : "Below target"} · ${delta}` : "Missed"}</em></span>; })}</div>{exercise.note && <blockquote>“{exercise.note}”</blockquote>}</article>
            ))}
          </section>

          <Rating label="Energy today" value={session.energy} onChange={(energy) => setSession((value) => ({ ...value, energy }))} />
          <Rating label="Session difficulty" value={session.difficulty} onChange={(difficulty) => setSession((value) => ({ ...value, difficulty }))} />
          <label className="note-field"><span>Anything worth remembering?</span><textarea rows={3} value={session.reflection} onChange={(event) => setSession((value) => ({ ...value, reflection: event.target.value }))} placeholder="What should Nova know next time?" /></label>

          <section className="nova-note review-nova"><div className="nova-label"><Compass size={14} /> NOVA</div><p>You kept the session moving and captured what happened. That gives us something real to build the next workout from.</p></section>

          {!session.finishedAt ? (
            <>
              <button className="primary-button submit-record-button" onClick={() => setWorkoutSubmitOpen(true)}>Submit to Nova &amp; Records <Check size={17} /></button>
              {workoutSubmitOpen && (() => {
                const allSets = session.exercises.flatMap((exercise) => exercise.sets.map((set) => ({ set, target: Number(prescribedResult(exercise.target)) })));
                const hit = allSets.filter(({ set, target }) => set.complete && (!target || Number(set.reps) >= target)).length;
                const missed = allSets.filter(({ set, target }) => set.complete && target && Number(set.reps) < target).length;
                const notLogged = allSets.length - hit - missed;
                return createPortal(<div className="exercise-finish-overlay" role="presentation"><section className="exercise-finish-dialog" role="dialog" aria-modal="true" aria-labelledby="workout-submit-title"><p className="eyebrow">FINAL CHECK</p><h2 id="workout-submit-title">Submit this workout?</h2><p>Review what North will carry into your workout record.</p><div className="exercise-finish-summary"><span className="hit"><strong>{hit}</strong> Hit</span><span className="missed"><strong>{missed}</strong> Missed target</span><span className="open"><strong>{notLogged}</strong> Not logged</span></div><footer><button className="secondary-button" onClick={() => setWorkoutSubmitOpen(false)}>Go back</button><button className="primary-button" onClick={saveReview}>Submit <Check size={17}/></button></footer></section></div>, document.body);
              })()}
            </>
          ) : (
            <button className="primary-button" onClick={startFresh}>Back to Today <ArrowRight size={17} /></button>
          )}
        </section>
      )}

      {screen === "session-detail" && selectedHistory && (
        <section className="screen session-detail-screen">
          <div className="detail-topline">
            <button className="back-button" onClick={() => setScreen(historyReturnScreen)}><ArrowLeft size={17} /> {historyReturnScreen === "training" ? "Training" : "Journey"}</button>
            <button className="text-button" onClick={() => setHistoryEditing((value) => !value)}>{historyEditing ? <><Save size={14} /> Done</> : "Correct record"}</button>
          </div>
          <p className="eyebrow">COMPLETED WORKOUT</p>
          <h1>{formatSessionDate(workoutRecordDate(selectedHistory))}</h1>
          {selectedHistory.addedLater && <p className="added-later-label"><History size={14}/> Added later · performed {formatSessionDate(selectedHistory.performedAt)} · entered {formatSessionDate(selectedHistory.recordedAt)}</p>}
          <p className="lead">{sessionMinutes(selectedHistory) ? `${sessionMinutes(selectedHistory)} minutes` : "Duration not recorded"} · {sessionSetCount(selectedHistory)} working sets</p>
          <section className="detail-metrics"><div><span>ENERGY</span><strong>{selectedHistory.energy}/5</strong></div><div><span>DIFFICULTY</span><strong>{selectedHistory.difficulty}/5</strong></div><div><span>EXERCISES</span><strong>{selectedHistory.exercises.length}</strong></div></section>
          <section className="history-exercises">
            {selectedHistory.exercises.map((exercise, exerciseIndex) => (
              <article key={exercise.id}>
                <div className="history-exercise-heading"><div><p className="eyebrow">EXERCISE {exerciseIndex + 1}</p><h2>{exercise.name}</h2></div><span>{exercise.sets.filter((set) => set.complete).length}/{exercise.sets.length}</span></div>
                {historyEditing ? <div className="history-sets">{exercise.sets.map((set, setIndex) => <div key={setIndex} className={!set.complete ? "incomplete" : ""}><span>Set {setIndex + 1}</span><DeferredUnitInput storedValue={set.weight} formatValue={displayWeight} storeValue={storeWeight} onCommit={(weight) => { const exercises = selectedHistory.exercises.map((item, index) => index === exerciseIndex ? { ...item, sets: item.sets.map((entry, position) => position === setIndex ? { ...entry, weight } : entry) } : item); updateHistorySession({ ...selectedHistory, exercises }); }} label={`${exercise.name} set ${setIndex + 1} weight in ${weightUnit}`} /><small>{weightUnit}</small><input value={set.reps} onChange={(event) => { const exercises = selectedHistory.exercises.map((item, index) => index === exerciseIndex ? { ...item, sets: item.sets.map((entry, position) => position === setIndex ? { ...entry, reps: event.target.value } : entry) } : item); updateHistorySession({ ...selectedHistory, exercises }); }} aria-label={`${exercise.name} set ${setIndex + 1} reps`} /><small>reps</small></div>)}</div> : <div className="history-result-grid">{exercise.sets.map((set, setIndex) => { const target = Number(prescribedResult(exercise.target)); const hit = set.complete && (!target || Number(set.reps) >= target); const delta = previousSetDelta(exercise, set, setIndex, workoutRecordDate(selectedHistory)); return <article key={setIndex} className={!set.complete ? "not-done" : hit ? "hit" : "under"}><small>Set {setIndex + 1}</small><strong>{set.complete ? `${set.weight ? `${displayWeight(set.weight).toFixed(1)} ${weightUnit}` : "Bodyweight"} × ${set.reps || "—"}` : "Not completed"}</strong><em>{set.complete ? `${hit ? "Target hit" : "Below target"} · ${delta}` : "Missed"}</em></article>; })}</div>}
                {historyEditing ? <textarea rows={2} value={exercise.note} onChange={(event) => { const exercises = selectedHistory.exercises.map((item, index) => index === exerciseIndex ? { ...item, note: event.target.value } : item); updateHistorySession({ ...selectedHistory, exercises }); }} placeholder="Exercise note" /> : exercise.note && <p className="history-note">“{exercise.note}”</p>}
              </article>
            ))}
          </section>
          <section className="session-reflection"><p className="eyebrow">REFLECTION</p>{historyEditing ? <textarea rows={3} value={selectedHistory.reflection} onChange={(event) => updateHistorySession({ ...selectedHistory, reflection: event.target.value })} placeholder="What should North remember?" /> : <p>{selectedHistory.reflection || "No reflection was added for this session."}</p>}</section>
          <button className="primary-button" onClick={copyCoachReport}><Copy size={16} /> {copyStatus || "Copy workout"}</button>
          <button className="danger-button" onClick={removeHistorySession}><Trash2 size={15} /> Delete workout</button>
        </section>
      )}

      {screen === "activity-log" && (
        <section className="screen activity-log-screen">
          <button className="back-button" onClick={() => setScreen("training")}><ArrowLeft size={17} /> Training</button>
          <p className="eyebrow">QUICK LOG</p>
          <h1>{draftActivity.kind === "bike" ? "Bike ride" : draftActivity.kind === "walk" ? "Walk" : draftActivity.kind === "run" ? "Run" : "Recovery"}</h1>
          <p className="lead">Capture what happened without turning movement into paperwork.</p>
          <section className="activity-form">
            <label><span>Date</span><input type="date" value={draftActivity.date} onChange={(event) => setDraftActivity((value) => ({ ...value, date: event.target.value }))} /></label>
            <div className="activity-form-grid">
              <label><span>Duration</span><div className="unit-input"><input inputMode="numeric" value={draftActivity.duration} onChange={(event) => setDraftActivity((value) => ({ ...value, duration: event.target.value }))} /><small>min</small></div></label>
              {draftActivity.kind !== "recovery" && <label><span>Distance</span><div className="unit-input"><DeferredUnitInput storedValue={draftActivity.distance} formatValue={displayDistance} storeValue={storeDistance} onCommit={(distance) => setDraftActivity((value) => ({ ...value, distance }))} label={`Activity distance in ${distanceUnit}`} /><small>{distanceUnit}</small></div></label>}
            </div>
            <Rating label="How hard did it feel?" value={draftActivity.effort} onChange={(effort) => setDraftActivity((value) => ({ ...value, effort }))} />
            <label><span>Note</span><textarea rows={4} value={draftActivity.note} onChange={(event) => setDraftActivity((value) => ({ ...value, note: event.target.value }))} placeholder="Weather, route, how you felt, or anything worth remembering." /></label>
          </section>
          {recorderStatus && <p className="recorder-status activity-error" role="alert">{recorderStatus}</p>}
          <button className="primary-button" onClick={saveActivity}>Save to Journey <Check size={16} /></button>
        </section>
      )}

      {screen === "coach-import" && (
        <section className="screen coach-import-screen">
          <button className="back-button" onClick={() => setScreen("training")}><ArrowLeft size={17} /> Training</button>
          <p className="eyebrow">COACH IMPORT</p>
          <h1>Bring the plan with you.</h1>
          <p className="lead">Use one exercise per line. North will show you exactly what it understood before anything begins.</p>
          <section className="import-guide"><strong>Recommended format</strong><code>Exercise | sets | reps | weight | rest seconds</code><p>Example: Incline dumbbell press | 3 | 8–10 | 45 | 90</p><small>Exercise names on their own also work and receive safe defaults.</small></section>
          <label className="coach-paste"><span>Coach workout</span><textarea rows={11} value={coachText} onChange={(event) => { setCoachText(event.target.value); setImportError(""); }} placeholder={"Incline dumbbell press | 3 | 8–10 | 45 | 90\nLat pulldown | 3 | 10–12 | 125 | 75"} /></label>
          {importError && <p className="form-error">{importError}</p>}
          <button className="primary-button" onClick={importCoachWorkout}><ClipboardPaste size={16} /> Import and review</button>
        </section>
      )}

      {screen === "check-in" && (
        <section className="screen check-in-screen">
          <button className="back-button" onClick={() => setScreen("today")}><ArrowLeft size={17} /> Today</button>
          <p className="eyebrow">DAILY CHECK-IN</p>
          <h1>How are you arriving?</h1>
          <p className="lead">There is no right answer. This gives North context before it offers direction.</p>
          <section className="check-in-form">
            <div className="activity-form-grid">
              <label><span>Bodyweight</span><div className="unit-input"><input inputMode="decimal" value={draftCheckIn.weight} onChange={(event) => { const weight = event.target.value; if (/^\d*\.?\d*$/.test(weight)) setDraftCheckIn((value) => ({ ...value, weight })); }} placeholder="190" aria-label={`Bodyweight in ${bodyWeightUnit}`} /><small>{bodyWeightUnit}</small></div></label>
              <label><span>Sleep</span><div className="unit-input"><input inputMode="decimal" value={draftCheckIn.sleep} onChange={(event) => setDraftCheckIn((value) => ({ ...value, sleep: event.target.value }))} /><small>hrs</small></div></label>
            </div>
            <Rating label="Energy" value={draftCheckIn.energy} onChange={(energy) => setDraftCheckIn((value) => ({ ...value, energy }))} />
            <Rating label="Soreness" value={draftCheckIn.soreness} onChange={(soreness) => setDraftCheckIn((value) => ({ ...value, soreness }))} />
            <label><span>Anything worth knowing?</span><textarea rows={4} value={draftCheckIn.note} onChange={(event) => setDraftCheckIn((value) => ({ ...value, note: event.target.value }))} placeholder="Mood, pain, stress, motivation, or what today feels like." /></label>
          </section>
          <section className="nova-note review-nova"><div className="nova-label"><Compass size={14} /> NOVA</div><p>I’ll use this as context, not a score. One difficult morning does not define the direction of your week.</p></section>
          <button className="primary-button" onClick={saveCheckIn}><Check size={16} /> Save check-in</button>
        </section>
      )}

      {screen === "weekly-review" && (
        <section className="screen weekly-review-screen">
          <button className="back-button" onClick={() => setScreen("training")}><ArrowLeft size={17} /> Training</button>
          <p className="eyebrow">WEEKLY REVIEW</p>
          <h1>What did this week teach you?</h1>
          <p className="lead">Reflection is not a scorecard. It is how effort becomes understanding.</p>
          <section className="week-review-summary"><div><strong>{weeklyPlan.filter((item) => item.status === "completed").length}</strong><span>planned days completed</span></div><div><strong>{history.filter((item) => item.finishedAt && item.finishedAt.slice(0, 10) >= weeklyPlan[0].date && item.finishedAt.slice(0, 10) <= weeklyPlan[6].date).reduce((total, item) => total + sessionSetCount(item), 0)}</strong><span>working sets</span></div><div><strong>{activities.filter((item) => item.date >= weeklyPlan[0].date && item.date <= weeklyPlan[6].date).reduce((total, item) => total + (Number.parseFloat(item.distance) || 0), 0).toFixed(1)}</strong><span>kilometres</span></div></section>
          <section className="reflection-fields">
            <label><span>What are you proud of?</span><textarea rows={3} value={draftReview.proud} onChange={(event) => setDraftReview((value) => ({ ...value, proud: event.target.value }))} placeholder="Showing up, adapting, resting, trying again…" /></label>
            <label><span>What did you learn?</span><textarea rows={3} value={draftReview.learned} onChange={(event) => setDraftReview((value) => ({ ...value, learned: event.target.value }))} placeholder="Something about your body, routine, or mindset." /></label>
            <label><span>What direction feels right next?</span><textarea rows={3} value={draftReview.next} onChange={(event) => setDraftReview((value) => ({ ...value, next: event.target.value }))} placeholder="One useful focus for the week ahead." /></label>
          </section>
          <button className="primary-button" onClick={saveWeeklyReview}><Check size={16} /> Save weekly reflection</button>
        </section>
      )}

      {screen === "test-log" && (
        <section className="screen test-log-screen">
          <button className="back-button" onClick={() => setScreen(testReturnScreen)}><ArrowLeft size={17} /> Back</button>
          <p className="eyebrow">GYM TEST</p>
          <h1>What got in the way?</h1>
          <p className="lead">Capture the friction while it is fresh. Short and honest is more useful than polished.</p>
          <section className="test-note-form">
            <div className="kind-picker">{(["confusing", "slow", "missing", "bug"] as TestNote["category"][]).map((category) => <button key={category} className={draftTestNote.category === category ? "active" : ""} onClick={() => setDraftTestNote((value) => ({ ...value, category }))}>{category}</button>)}</div>
            <textarea rows={5} autoFocus value={draftTestNote.text} onChange={(event) => setDraftTestNote((value) => ({ ...value, text: event.target.value }))} placeholder="Example: I needed two taps to log a set while holding the dumbbell." />
            <button className="primary-button" onClick={saveTestNote} disabled={!draftTestNote.text.trim()}>Save observation</button>
          </section>
          {testNotes.length > 0 && <><div className="section-heading"><div><p className="eyebrow">RECORDED</p><h2>Test observations</h2></div></div><section className="test-notes-list">{testNotes.map((item) => <button key={item.id} className={item.resolved ? "resolved" : ""} onClick={() => toggleTestNote(item.id)}><span>{item.resolved ? <Check size={14} /> : <Bug size={14} />}</span><div><strong>{item.category} · {item.source}</strong><p>{item.text}</p><small>{formatSessionDate(item.createdAt)} · tap to mark {item.resolved ? "open" : "resolved"}</small></div></button>)}</section></>}
        </section>
      )}

      {progressionTransaction?.appliedAt && !progressionTransaction.undoneAt && !progressionTransaction.dismissedAt && <aside className="recommendation-undo" role="status"><span><Check size={16} /></span><div><strong>Recommendation applied</strong><small>{progressionTransaction.suggestion.title}</small></div><button onClick={undoProgressionTransaction}><RotateCcw size={14} /> Undo</button><button aria-label="Dismiss undo" onClick={() => setProgressionTransaction((transaction) => transaction ? { ...transaction, dismissedAt: new Date().toISOString() } : transaction)}><X size={15} /></button></aside>}
      {releaseNotesV4Open && !activeTourStep && createPortal(<div className="release-notes-backdrop" role="presentation"><section className="release-notes release-notes-v4" role="dialog" aria-modal="true" aria-labelledby="release-notes-v4-title"><header><div><p className="eyebrow">NORTH 0.4 · NOVA WAKES UP</p><h2 id="release-notes-v4-title">Your coach now<br/>knows your direction.</h2></div><button onClick={closeReleaseNotes} aria-label="Close updates"><X size={18}/></button></header><p className="release-notes-intro"><strong>North already knew how to record the work.</strong> Now Nova can understand the story behind it, talk it through with you and prepare real changes—without ever silently taking control.</p><ul><li><strong>Talk like a person. Get a real answer.</strong><span>Ask about today’s plan, recovery, progress, exercises or what to do next. Nova answers from your saved North records, not a generic fitness script.</span></li><li><strong>Your goals have a home.</strong><span>Create, pause, complete and refine your direction in a private goal ledger that belongs only to your account.</span></li><li><strong>You control what Nova remembers.</strong><span>Review what Nova knows, confirm useful context, pause its influence or erase it completely.</span></li><li><strong>Changes come with a preview.</strong><span>Goals, check-ins, reflections and workout decisions require your approval. Nothing meaningful moves behind your back.</span></li><li><strong>One conversation on every device.</strong><span>Your Nova thread now follows your signed-in account from desktop to phone, just like your workouts and plans.</span></li><li><strong>Evidence, confidence and receipts.</strong><span>See what informed a response, where the limits are and exactly what was saved after you approve an action.</span></li></ul><p className="release-notes-thanks"><strong>This is Nova’s foundation—not the finish line.</strong><br/>Bring the messy day, the big goal or the “what now?” North 0.4 is ready to think it through with you.</p><details className="release-history"><summary><span>Previous update</span><strong>See what North 0.3 added</strong><ChevronDown size={17}/></summary><div><p className="eyebrow">NORTH 0.3 · BUILT TO MOVE</p><ul><li><strong>784 real exercises</strong><span>A deep searchable library spanning strength, cardio, mobility, machines, free weights and bodyweight training.</span></li><li><strong>Interactive muscle activation</strong><span>Front-and-back anatomy with distinct primary, secondary and supporting roles.</span></li><li><strong>Movement-aware recording</strong><span>The right controls for weighted sets, unilateral work, timed holds, carries, intervals and cardio.</span></li><li><strong>Smarter progress and substitutions</strong><span>Exercise-specific PR logic plus stable progressions, regressions and alternatives.</span></li></ul></div></details><label className="release-notes-dismiss"><input type="checkbox" checked={dismissReleaseNotes} onChange={(event) => setDismissReleaseNotes(event.target.checked)}/><strong>Don’t show again until the next update</strong></label><button className="primary-button" onClick={closeReleaseNotes}>Meet the new Nova <Sparkles size={16}/></button></section></div>,document.body)}
      {releaseNotesOpen && !activeTourStep && createPortal(<div className="release-notes-backdrop" role="presentation"><section className="release-notes release-notes-v3" role="dialog" aria-modal="true" aria-labelledby="release-notes-title"><header><div><p className="eyebrow">NORTH 0.3 · BUILT TO MOVE</p><h2 id="release-notes-title">Your training system<br />just got seriously stronger.</h2></div><button onClick={closeReleaseNotes} aria-label="Close updates"><X size={18} /></button></header><p className="release-notes-intro"><strong>0.2 gave you better builders, themes and cross-device control.</strong> Now 0.3 powers up the engine underneath it all. More movements. Better records. Smarter muscle detail. Let’s work. 💪</p><ul><li><strong>784 real exercises. One serious library.</strong><span>Strength, cardio, mobility, calisthenics, machines, free weights, timed holds and more—searchable by muscle, equipment, movement, difficulty and training style.</span></li><li><strong>Muscles you can actually explore</strong><span>Every reviewed movement connects to North’s interactive front-and-back muscle system, with primary, secondary and supporting roles kept visually distinct.</span></li><li><strong>A recorder built for the gym floor</strong><span>Log weight and reps, left and right sides, timed holds, carries, distance, intervals and cardio using the right controls for the movement—not one generic form.</span></li><li><strong>Pull-up and push-up holds are in</strong><span>Top, midpoint, bottom, 90-degree and multi-position hold variations are ready with proper timed-set tracking.</span></li><li><strong>Progress that understands the exercise</strong><span>PRs and trends now respect the tracking style. North won’t pretend a plank has a one-rep max or judge a run like a bench press.</span></li><li><strong>Swap without losing direction</strong><span>Progressions, regressions and equipment alternatives connect through stable exercise records, so a busy machine doesn’t wreck the session.</span></li><li><strong>Old workouts still belong here</strong><span>Existing records remain compatible while new sessions gain richer detail. Your history stays yours.</span></li></ul><p className="release-notes-thanks"><strong>This is the biggest training-engine upgrade North has had yet.</strong><br />Pick something hard. Record it properly. Watch the story build. North 0.3 is ready. ⚡</p><details className="release-history"><summary><span>Previous updates</span><strong>See what North 0.2 added</strong><ChevronDown size={17} /></summary><div><p className="eyebrow">NORTH 0.2 · BUILD YOUR WAY</p><ul><li><strong>Build with Nova</strong><span>Set your goal, available time, equipment and location, then build a guided workout one movement at a time.</span></li><li><strong>A cleaner workout library</strong><span>Clearer names, honest time estimates including rest, useful sorting and focused filters.</span></li><li><strong>Plan the right day</strong><span>Choose an exact day before adding a workout without accidentally reshuffling the week.</span></li><li><strong>Preview before adding</strong><span>Open an exercise profile before committing it to your workout.</span></li><li><strong>Cross-device account control</strong><span>Your account copy became the source of truth when devices disagreed, with safer syncing and conflict handling.</span></li><li><strong>More personal North</strong><span>New themes, refined cards, clearer measurements, improved labels and better navigation.</span></li></ul></div></details><label className="release-notes-dismiss"><input type="checkbox" checked={dismissReleaseNotes} onChange={(event) => setDismissReleaseNotes(event.target.checked)} /><strong>Don't show again until the next update</strong></label><button className="primary-button" onClick={closeReleaseNotes}>Let’s go</button></section></div>, document.body)}
      {releaseNotesV4Open && !activeTourStep && (() => {
        const releaseIndex = releaseNotes.findIndex((release) => release.version === releaseNotesVersion);
        const release = releaseNotes[releaseIndex];
        const newerRelease = releaseNotes[releaseIndex - 1];
        const olderRelease = releaseNotes[releaseIndex + 1];
        return createPortal(<div className="release-notes-backdrop release-carousel-backdrop" role="presentation"><section className={`release-notes release-notes-carousel release-notes-v${release.version.replace(".", "-")}`} role="dialog" aria-modal="true" aria-labelledby="release-notes-title"><header><div><p className="eyebrow">{release.eyebrow}</p><h2 id="release-notes-title">{release.title}</h2></div><button onClick={closeReleaseNotes} aria-label="Close updates"><X size={18}/></button></header><nav className="release-carousel-tabs" aria-label="North release history">{releaseNotes.map((item) => <button key={item.version} className={item.version === release.version ? "active" : ""} aria-current={item.version === release.version ? "page" : undefined} onClick={() => setReleaseNotesVersion(item.version)}>North {item.version}</button>)}</nav><div className="release-carousel-stage" key={release.version}><p className="release-notes-intro"><strong>{release.introLead}</strong> {release.intro}</p><ul>{release.items.map((item) => <li key={item.title}><strong>{item.title}</strong><span>{item.detail}</span></li>)}</ul><p className="release-notes-thanks"><strong>{release.thanksLead}</strong><br/>{release.thanks}</p></div><footer className="release-carousel-controls"><button className="release-carousel-nav" onClick={() => newerRelease && setReleaseNotesVersion(newerRelease.version)} disabled={!newerRelease}><ArrowLeft size={16}/> {newerRelease ? `North ${newerRelease.version}` : "Newest release"}</button><span>Release {releaseIndex + 1} of {releaseNotes.length}</span><button className="release-carousel-nav" onClick={() => olderRelease && setReleaseNotesVersion(olderRelease.version)} disabled={!olderRelease}>{olderRelease ? `North ${olderRelease.version}` : "First release"} <ArrowRight size={16}/></button></footer><label className="release-notes-dismiss"><input type="checkbox" checked={dismissReleaseNotes} onChange={(event) => setDismissReleaseNotes(event.target.checked)}/><strong>Don’t show again until the next update</strong></label><button className="primary-button" onClick={closeReleaseNotes}>{release.action} {release.version === "0.4" && <Sparkles size={16}/>}</button></section></div>, document.body);
      })()}
      {activeTourStep && <div className="product-tour" role="dialog" aria-modal="true" aria-labelledby="north-tour-title"><button className="tour-scrim" onClick={closeProductTour} aria-label="Skip product tour" /><article><header><div className="onboarding-brand"><span><Compass size={21} /></span><strong>NORTH</strong></div><button onClick={closeProductTour}>Skip</button></header><div className="tour-progress" aria-label={`Tour step ${tourStep + 1} of ${productTourSteps.length}`}>{productTourSteps.map((step, index) => <i key={step.screen} className={index <= tourStep ? "active" : ""} />)}</div><span className="tour-icon">{activeTourStep.screen === "today" ? <CalendarDays /> : activeTourStep.screen === "training" ? <Dumbbell /> : activeTourStep.screen === "nova" ? <Sparkles /> : activeTourStep.screen === "journey" ? <MapIcon /> : <UserRound />}</span><p className="onboarding-kicker">{activeTourStep.eyebrow}</p><h2 id="north-tour-title">{activeTourStep.title}</h2><p>{activeTourStep.body}</p><footer>{tourStep > 0 ? <button onClick={() => { const previous = tourStep - 1; setTourStep(previous); setScreen(productTourSteps[previous].screen); }}><ArrowLeft size={15} /> Back</button> : <span />}<button onClick={advanceProductTour}>{activeTourStep.action}<ArrowRight size={16} /></button></footer></article></div>}
      {coreScreen && !activeTourStep && <BottomNav screen={screen} onNavigate={setScreen} />}
      {syncVisible && <aside className="north-sync-loader"><BrandLoader label="Syncing your North" compact /></aside>}
      {loginReveal && <LoginBrandReveal onDone={() => setLoginReveal(false)} />}
    </main>
  );
}

function BottomNav({ screen, onNavigate }: { screen: Screen; onNavigate: (screen: Screen) => void }) {
  const items: Array<{ id: Screen; label: string; icon: typeof CalendarDays; desktopOnly?: boolean }> = [
    { id: "today", label: "Today", icon: CalendarDays },
    { id: "journey", label: "Journey", icon: MapIcon },
    { id: "training", label: "Training", icon: Dumbbell },
    { id: "nova-workout-builder", label: "Build workout", icon: Sparkles, desktopOnly: true },
    { id: "nova", label: "Nova", icon: MessageCircle },
    { id: "you", label: "You", icon: UserRound },
  ];
  return createPortal(<nav className="primary-nav" aria-label="Primary navigation">{items.map((item) => { const Icon = item.icon; return <button key={item.id} className={`${screen === item.id ? "active" : ""}${item.desktopOnly ? " desktop-only-nav-item" : ""}`} onClick={() => onNavigate(item.id)}><Icon size={21} /><span>{item.label}</span></button>; })}</nav>, document.body);
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <section className="rating-row">
      <span>{label}</span>
      <div>{[1, 2, 3, 4, 5].map((score) => <button key={score} className={score === value ? "active" : ""} onClick={() => onChange(score)}>{score}</button>)}</div>
    </section>
  );
}

export default App;
