import { Fragment, type ChangeEvent, type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
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
import { workoutFocuses, workoutGoals, workoutLevels, workoutTemplates, type WorkoutTemplate } from "./data/workouts";
import { programs, type ProgramDefinition } from "./data/programs";
import { milestoneCategories, milestoneDefinitions, type MilestoneMetric } from "./data/milestones";
import { deriveEarnedMoments } from "./data/celebrations";
import { combineMuscleActivations, getMuscleActivation } from "./data/muscleActivations";
import { getExerciseGuidance } from "./data/exerciseGuidance";
import { migrateLegacyStorage, northRepository, type SyncConflict } from "./data/northDb";
import { logoutNorthAccount, NORTH_API_BASE, northDeviceHeaders, readNorthSession, withFreshAccess } from "./data/account";
import { resolveConflict, syncNorth, type SyncResult } from "./data/sync";
import Onboarding, { type OnboardingResult } from "./Onboarding";
import SyncCentre from "./SyncCentre";
import { getApprovedExerciseDemo, getExerciseMedia } from "./data/exerciseMedia";
import AnatomyMap from "./components/AnatomyMap";
import { BrandLoader, LoginBrandReveal } from "./components/BrandMotion";
import "./components/AnatomyMap.css";

type Screen = "today" | "journey" | "training" | "week-plan" | "nova" | "you" | "account" | "settings" | "prepare" | "exercise-detail" | "workout" | "review" | "workout-library" | "workout-template" | "programs" | "program-detail" | "progression" | "workout-history" | "session-detail" | "activity-log" | "coach-import" | "check-in" | "weekly-review" | "test-log";

type ActivityKind = "strength" | "bike" | "walk" | "run" | "recovery" | "rest";
type SessionRole = "warm-up" | "secondary" | "recovery" | "optional";
type PlannedSession = { id: string; kind: Exclude<ActivityKind, "rest">; title: string; role: SessionRole; duration: string; distance: string; note: string; status: "planned" | "completed" | "skipped" };
type PlanDay = { id: string; date: string; label: string; kind: ActivityKind; title: string; note: string; status: "planned" | "completed" | "skipped"; workout?: Exercise[]; sessions?: PlannedSession[] };
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
type TodayAdjustment = { kind: "shorter" | "easier" | "recovery"; title: string; explanation: string };
type NovaAction = "open-today" | "open-week" | "check-in" | "progression" | "weekly-review";
type NovaPlanProposal = { id: string; planDayId: string; kind: "shorter" | "lower-stress" | "recovery"; summary: string; before: PlanDay; after: PlanDay };
type NovaProgramProposal = { id: string; summary: string; beforeProgram: ActiveProgram; afterProgram: ActiveProgram; beforePlan: PlanDay[]; afterPlan: PlanDay[] };
type NovaMessage = { id: string; role: "user" | "nova"; text: string; createdAt: string; evidence?: string[]; confidence?: "High" | "Moderate" | "Limited"; action?: NovaAction; actionLabel?: string; proposal?: NovaPlanProposal; programProposal?: NovaProgramProposal; appliedAt?: string; undoneAt?: string };
type ProfileSettings = { name: string; direction: string; targetDate: string; trainingDays: number; height: string; units: "imperial" | "metric"; bodyWeightUnit: "lb" | "kg"; distanceUnit: "mi" | "km"; language: string; tone: string; notifications: boolean; memoryEnabled: boolean; reducedMotion: boolean; largeText: boolean; highContrast: boolean; connectedServices: string[]; dismissedInsights: string[]; memoryCorrections: Record<string, string> };
type AccountDevice = { id: string; name: string; user_agent?: string; last_ip?: string; last_seen_at: string; created_at: string; revoked_at?: string; active_sessions: number };
type HealthConnection = { provider: "health_connect" | "apple_health"; status: string; scopes: string[]; source_apps: string[]; last_sync_at?: string; last_error?: string };
type HealthSummary = { days: number; types: Array<{ record_type: string; records: number; first_record: string; latest_record: string }> };
type HealthActivity = { id: string; started_at: string; ended_at: string; title?: string; kind: "bike" | "run" | "walk" | "workout"; exercise_type: number; distance_metres: number; duration_minutes: number; source_app: string };
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type SetResult = { weight: string; reps: string; complete: boolean };
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

function buildExercise(template: ExerciseDefinition, id = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`): Exercise {
  const setCount = Number(template.target.match(/^\d+/)?.[0] ?? 1);
  return {
    id,
    name: template.name,
    target: template.target,
    rest: template.rest,
    previous: template.previous,
    cue: template.cue,
    sets: Array.from({ length: setCount }, () => ({ weight: template.weight, reps: "", complete: false })),
    note: "",
    passed: false,
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
  return date.toISOString().slice(0, 10);
}

function initialWeekPlan(): PlanDay[] {
  const today = new Date();
  const monday = new Date(today);
  const day = today.getDay() || 7;
  monday.setDate(today.getDate() - day + 1);
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

function readPlan(): PlanDay[] {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAN_KEY) ?? "null") as PlanDay[] | null;
    if (!saved?.length || saved.length !== 7) return initialWeekPlan();
    const defaults = initialWeekPlan();
    return saved.map((item, index) => ({ ...item, status: item.status ?? "planned", sessions: Array.isArray(item.sessions) ? item.sessions : [], workout: item.kind === "strength" ? (item.workout?.length ? item.workout : defaults[index].workout ?? resetExercises(starterExercises)) : undefined }));
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
  const [tourStep, setTourStep] = useState(() => readNorthSession() && !localStorage.getItem(productTourStorageKey()) ? 0 : -1);
  const [screen, setScreen] = useState<Screen>(() => new URLSearchParams(location.search).get("open") === "training" ? "training" : "today");
  const [trainingDetailsOpen, setTrainingDetailsOpen] = useState(false);
  const [exerciseDetailReturn, setExerciseDetailReturn] = useState<"prepare" | "workout">("prepare");
  const [session, setSession] = useState<Session>(readSession);
  const [night, setNight] = useState(() => localStorage.getItem("north-theme") === "night");
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [workoutClock, setWorkoutClock] = useState(() => Date.now());
  const [recorderStatus, setRecorderStatus] = useState("");
  const sessionRef = useRef(session);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [builderPickerOpen, setBuilderPickerOpen] = useState(false);
  const [builderStatus, setBuilderStatus] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [exerciseCategory, setExerciseCategory] = useState("All");
  const [exerciseEquipmentFilter, setExerciseEquipmentFilter] = useState("All");
  const [novaInput, setNovaInput] = useState("");
  const [novaMessages, setNovaMessages] = useState<NovaMessage[]>(readNovaMessages);
  const [novaThinking, setNovaThinking] = useState(false);
  const [novaError, setNovaError] = useState("");
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
  const [selectedTemplateId, setSelectedTemplateId] = useState(workoutTemplates[0].id);
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
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [backfillSearch, setBackfillSearch] = useState("");
  const [journeyPhotos, setJourneyPhotos] = useState<JourneyPhoto[]>(readJourneyPhotos);
  const [photoCaption, setPhotoCaption] = useState("");
  const [milestoneFilter, setMilestoneFilter] = useState("All");
  const [weather, setWeather] = useState<WeatherContext | null>(readWeatherCache);
  const [weatherStatus, setWeatherStatus] = useState("");
  const [todayNovaInput, setTodayNovaInput] = useState("");
  const [todayAdjustment, setTodayAdjustment] = useState<TodayAdjustment | null>(null);
  const [profile, setProfile] = useState<ProfileSettings>(readProfile);
  const [profileEditing, setProfileEditing] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [weeklyPlan, setWeeklyPlan] = useState<PlanDay[]>(readPlan);
  const [selectedPlanDayId, setSelectedPlanDayId] = useState(() => readPlan().find((item) => item.date === isoDate(new Date()))?.id ?? readPlan()[0].id);
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
  const [muscleView, setMuscleView] = useState<"primary" | "all">("all");
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installStatus, setInstallStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(localStorage.getItem("north-last-sync-at") || "");
  const [syncError, setSyncError] = useState("");
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);
  const syncLock = useRef(false);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [testNotes, setTestNotes] = useState<TestNote[]>(readTestNotes);
  const [testReturnScreen, setTestReturnScreen] = useState<Screen>("workout");
  const [draftTestNote, setDraftTestNote] = useState<{ category: TestNote["category"]; text: string }>({ category: "confusing", text: "" });

  useEffect(() => {
    sessionRef.current = session;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    void northRepository.put("active-session", "primary", session);
  }, [session]);

  useEffect(() => {
    const preserve = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionRef.current));
    window.addEventListener("pagehide", preserve);
    document.addEventListener("visibilitychange", preserve);
    return () => { window.removeEventListener("pagehide", preserve); document.removeEventListener("visibilitychange", preserve); };
  }, []);

  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); void northRepository.put("workouts", "primary", history); }, [history]);

  useEffect(() => { void migrateLegacyStorage(); }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = night ? "night" : "morning";
    localStorage.setItem("north-theme", night ? "night" : "morning");
    void northRepository.put("settings", "theme", night ? "night" : "morning");
  }, [night]);

  useEffect(() => {
    const heading = document.querySelector<HTMLElement>(".screen h1");
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [screen]);

  useEffect(() => { localStorage.setItem(PLAN_KEY, JSON.stringify(weeklyPlan)); void northRepository.put("week-plan", "primary", weeklyPlan); }, [weeklyPlan]);
  useEffect(() => { localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities)); void northRepository.put("activities", "primary", activities); }, [activities]);
  useEffect(() => { localStorage.setItem(ACTIVITY_DRAFT_KEY, JSON.stringify(draftActivity)); }, [draftActivity]);
  useEffect(() => { localStorage.setItem(CHECK_INS_KEY, JSON.stringify(checkIns)); void northRepository.put("check-ins", "primary", checkIns); }, [checkIns]);
  useEffect(() => { localStorage.setItem(REVIEWS_KEY, JSON.stringify(weeklyReviews)); void northRepository.put("reviews", "primary", weeklyReviews); }, [weeklyReviews]);
  useEffect(() => { localStorage.setItem(TEST_NOTES_KEY, JSON.stringify(testNotes)); void northRepository.put("test-notes", "primary", testNotes); }, [testNotes]);
  useEffect(() => { localStorage.setItem(PERSONAL_TEMPLATES_KEY, JSON.stringify(personalTemplates)); void northRepository.put("personal-workouts", "primary", personalTemplates); }, [personalTemplates]);
  useEffect(() => { localStorage.setItem("north-favorite-workouts-v1", JSON.stringify(favoriteTemplateIds)); void northRepository.put("favorite-workouts", "primary", favoriteTemplateIds); }, [favoriteTemplateIds]);
  useEffect(() => { localStorage.setItem("north-favorite-exercises-v1", JSON.stringify(favoriteExerciseNames)); void northRepository.put("favorite-exercises", "primary", favoriteExerciseNames); }, [favoriteExerciseNames]);
  useEffect(() => { localStorage.setItem("north-recent-workouts-v1", JSON.stringify(recentTemplateIds)); }, [recentTemplateIds]);
  useEffect(() => { if (activeProgram) { localStorage.setItem(ACTIVE_PROGRAM_KEY, JSON.stringify(activeProgram)); void northRepository.put("active-program", "primary", activeProgram); } else { localStorage.removeItem(ACTIVE_PROGRAM_KEY); void northRepository.remove("active-program", "primary"); } }, [activeProgram]);
  useEffect(() => { localStorage.setItem("north-calorie-estimates", calorieEstimates ? "on" : "off"); void northRepository.put("settings", "calorie-estimates", calorieEstimates); }, [calorieEstimates]);
  useEffect(() => { localStorage.setItem(JOURNEY_PHOTOS_KEY, JSON.stringify(journeyPhotos)); void northRepository.put("journey-photos", "primary", journeyPhotos); }, [journeyPhotos]);
  useEffect(() => { localStorage.setItem(NOVA_MESSAGES_KEY, JSON.stringify(novaMessages)); void northRepository.put("nova-conversations", "primary", novaMessages); }, [novaMessages]);
  useEffect(() => { if (progressionTransaction) { localStorage.setItem(PROGRESSION_TRANSACTION_KEY, JSON.stringify(progressionTransaction)); void northRepository.put("progression-transaction", "primary", progressionTransaction); } else { localStorage.removeItem(PROGRESSION_TRANSACTION_KEY); void northRepository.remove("progression-transaction", "primary"); } }, [progressionTransaction]);
  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    void northRepository.put("profile", "primary", profile);
    document.documentElement.dataset.motion = profile.reducedMotion ? "reduced" : "full";
    document.documentElement.dataset.text = profile.largeText ? "large" : "standard";
    document.documentElement.dataset.contrast = profile.highContrast ? "high" : "standard";
  }, [profile]);

  useEffect(() => {
    if (!entryComplete || !readNorthSession()) return;
    const initial = window.setTimeout(() => { void runAccountSync(); }, 1500);
    const periodic = window.setInterval(() => { if (navigator.onLine && document.visibilityState === "visible") void runAccountSync(); }, 30000);
    const handleOnline = () => { setOnline(true); void runAccountSync(); };
    const handleOffline = () => { setOnline(false); void refreshLocalSyncState(); };
    const handleVisibility = () => { if (document.visibilityState === "visible" && navigator.onLine) void runAccountSync(); };
    window.addEventListener("online", handleOnline); window.addEventListener("offline", handleOffline); document.addEventListener("visibilitychange", handleVisibility);
    void refreshLocalSyncState();
    return () => { window.clearTimeout(initial); window.clearInterval(periodic); window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [entryComplete]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const selectedHistory = history.find((item) => item.finishedAt === selectedHistoryId) ?? null;
  const selectedPlanDay = weeklyPlan.find((item) => item.id === selectedPlanDayId) ?? weeklyPlan[0];
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
  const weekDayMinutes = weeklyPlan.map((day) => weekSessions.filter((workout) => isoDate(new Date(workoutRecordDate(workout) || 0)) === day.date).reduce((total, workout) => total + (sessionMinutes(workout) ?? 0), 0) + weekActivities.filter((activity) => activity.date === day.date).reduce((total, activity) => total + (Number.parseFloat(activity.duration) || 0), 0));
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
  const filteredTimeline = timelineItems.filter((item) => (timelineFilter === "All" || item.type === timelineFilter) && (!timelineDate || isoDate(new Date(item.date)) === timelineDate));
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
  const filteredMilestones = milestoneResults.filter((milestone) => milestoneFilter === "All" || milestone.category === milestoneFilter);
  const earnedIdentities = unlockedMilestones.filter((milestone) => milestone.identity).map((milestone) => milestone.identity as string);
  const exerciseProgress = useMemo(() => {
    const progress = new Map<string, { name: string; bestWeight: number; sets: number; sessions: Set<string> }>();
    history.forEach((workout) => workout.exercises.forEach((exercise) => {
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

  function previousPerformance(exercise: Exercise) {
    const before = new Date(session.performedAt ?? new Date()).getTime();
    for (const workout of [...historyChronological].reverse().filter((item) => new Date(workoutRecordDate(item)).getTime() < before)) {
      const match = workout.exercises.find((item) => item.name.toLowerCase() === exercise.name.toLowerCase());
      if (!match) continue;
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
    if (session.planDayId) setWeeklyPlan((days) => days.map((day) => day.id === session.planDayId ? { ...day, workout: resetExercises(session.exercises) } : day));
    setSession((value) => ({ ...value, startedAt: value.startedAt ?? new Date().toISOString() }));
    setRecorderStatus("Workout started. Every entry saves automatically.");
    setScreen("workout");
  }

  function leavePreparation() {
    if (session.planDayId) setWeeklyPlan((days) => days.map((day) => day.id === session.planDayId ? { ...day, workout: resetExercises(session.exercises) } : day));
    setScreen(session.addedLater ? "journey" : "training");
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
    const definition = exerciseLibrary.find((item) => item.name === replacementName);
    if (!definition) return;
    setSession((value) => ({
      ...value,
      exercises: value.exercises.map((item) => item.id === id ? { ...buildExercise(definition, id), note: item.note } : item),
      currentId: value.currentId === id ? id : value.currentId,
    }));
  }

  function substitutionsFor(name: string) {
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
    const sets = current.sets.map((set, index) => (index === setIndex ? { ...set, ...patch } : set));
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
    const finished = { ...session, finishedAt: savedAt, recordedAt: session.recordedAt ?? savedAt };
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

  function sendToNova(prompt?: string) {
    const text = (prompt ?? novaInput).trim();
    if (!text || novaThinking) return;
    const userMessage: NovaMessage = { id: crypto.randomUUID(), role: "user", text, createdAt: new Date().toISOString() };
    setNovaMessages((messages) => [...messages, userMessage].slice(-80));
    setNovaInput(""); setNovaError(""); setNovaThinking(true);
    window.setTimeout(() => {
      try {
        const reply = novaReply(text);
        const novaMessage: NovaMessage = { ...reply, id: crypto.randomUUID(), role: "nova", createdAt: new Date().toISOString() };
        setNovaMessages((messages) => [...messages, novaMessage].slice(-80));
      } catch { setNovaError("Nova couldn’t form a response. Your message is still saved."); }
      finally { setNovaThinking(false); }
    }, profile.reducedMotion ? 0 : 450);
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

  function clearNovaConversation() {
    if (!novaMessages.length || window.confirm("Clear this Nova conversation? Your workout and Journey records will not be changed.")) setNovaMessages([]);
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
    setWeeklyPlan((value) => value.map((item) => item.id === selectedPlanDay.id ? { ...item, ...patch } : item));
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
    setSelectedPlanDayId(weeklyPlan[target].id);
  }

  function beginPlannedDay() {
    if (selectedPlanDay.kind === "strength") {
      if (hasProgress && session.planDayId === selectedPlanDay.id) {
        setScreen("workout");
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

  function applyWorkoutTemplate(template: WorkoutTemplate, prepareNow = false) {
    setRecentTemplateIds((ids) => [template.id, ...ids.filter((id) => id !== template.id)].slice(0, 8));
    const exercises = exercisesFromTemplate(template);
    setSelectedTemplateId(template.id);
    setWeeklyPlan((days) => days.map((day) => day.id === selectedPlanDay.id ? { ...day, kind: "strength", title: template.name, workout: exercises, status: "planned" } : day));
    if (prepareNow) {
      setSession(initialSession(exercises, selectedPlanDay.id));
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

  function saveWeeklyReview() {
    const entry: WeeklyReview = { id: `${weeklyPlan[0].date}-${Date.now()}`, weekStart: weeklyPlan[0].date, ...draftReview, createdAt: new Date().toISOString() };
    setWeeklyReviews((value) => [entry, ...value.filter((item) => item.weekStart !== entry.weekStart)].slice(0, 52));
    setScreen("journey");
  }

  function exportNorthData() {
    const backup = {
      northBackupVersion: 1,
      exportedAt: new Date().toISOString(),
      data: { session, history, weeklyPlan, activities, checkIns, weeklyReviews, testNotes, personalTemplates, activeProgram, journeyPhotos, profile, novaMessages, progressionTransaction, calorieEstimates, theme: night ? "night" : "morning" },
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.session ?? initialSession()));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(data.history));
      localStorage.setItem(PLAN_KEY, JSON.stringify(data.weeklyPlan));
      localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(Array.isArray(data.activities) ? data.activities : []));
      localStorage.setItem(CHECK_INS_KEY, JSON.stringify(Array.isArray(data.checkIns) ? data.checkIns : []));
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(Array.isArray(data.weeklyReviews) ? data.weeklyReviews : []));
      localStorage.setItem(TEST_NOTES_KEY, JSON.stringify(Array.isArray(data.testNotes) ? data.testNotes : []));
      localStorage.setItem(PERSONAL_TEMPLATES_KEY, JSON.stringify(Array.isArray(data.personalTemplates) ? data.personalTemplates : []));
      if (data.activeProgram) localStorage.setItem(ACTIVE_PROGRAM_KEY, JSON.stringify(data.activeProgram));
      localStorage.setItem(JOURNEY_PHOTOS_KEY, JSON.stringify(Array.isArray(data.journeyPhotos) ? data.journeyPhotos : []));
      if (data.profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
      localStorage.setItem(NOVA_MESSAGES_KEY, JSON.stringify(Array.isArray(data.novaMessages) ? data.novaMessages : []));
      if (data.progressionTransaction) localStorage.setItem(PROGRESSION_TRANSACTION_KEY, JSON.stringify(data.progressionTransaction));
      localStorage.setItem("north-calorie-estimates", data.calorieEstimates ? "on" : "off");
      localStorage.setItem("north-theme", data.theme === "night" ? "night" : "morning");
      window.location.reload();
    } catch {
      setDataStatus("That file is not a valid North backup");
      event.target.value = "";
    }
  }

  function resetNorthData() {
    if (!window.confirm("Erase all North data stored in this browser? Export a backup first if you may want it later.")) return;
    [STORAGE_KEY, HISTORY_KEY, PLAN_KEY, ACTIVITIES_KEY, CHECK_INS_KEY, REVIEWS_KEY, TEST_NOTES_KEY, PERSONAL_TEMPLATES_KEY, ACTIVE_PROGRAM_KEY, JOURNEY_PHOTOS_KEY, PROFILE_KEY, NOVA_MESSAGES_KEY, PROGRESSION_TRANSACTION_KEY, "north-calorie-estimates", "north-theme"].forEach((key) => localStorage.removeItem(key));
    window.location.reload();
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

  function askNovaAboutToday() {
    const message = todayNovaInput.trim().toLowerCase();
    if (!message) return;
    if (/short|time|quick|rush/.test(message)) setTodayAdjustment({ kind: "shorter", title: "Shorten today without deleting the plan", explanation: "Remove the final exercise from today's working copy. The rest of the week and completed history stay unchanged." });
    else if (/tired|sore|easier|low energy|fatigue/.test(message)) setTodayAdjustment({ kind: "easier", title: "Reduce today’s working sets", explanation: "Keep the movements but remove one set from exercises that currently have more than two sets." });
    else if (/rest|recovery|skip/.test(message)) setTodayAdjustment({ kind: "recovery", title: "Make today a recovery day", explanation: "Replace today’s planned session with recovery and mobility. This is a plan change, not a failed workout." });
    else setTodayAdjustment({ kind: "shorter", title: "I need one more detail", explanation: "Try telling Nova that you are short on time, feeling tired or sore, or want a recovery day. North will show the exact change before applying it." });
    setTodayNovaInput("");
  }

  function applyTodayAdjustment() {
    if (!todayAdjustment || todayAdjustment.explanation.startsWith("Try telling")) return;
    const before = structuredClone(todayPlan);
    let after = structuredClone(todayPlan);
    if (todayAdjustment.kind === "recovery") after = { ...after, kind: "recovery", title: "Recovery and mobility", workout: undefined, status: "planned", note: `${after.note ? `${after.note} · ` : ""}Adjusted with Nova after confirmation.` };
    else if (after.workout && todayAdjustment.kind === "shorter") after = { ...after, workout: after.workout.slice(0, Math.max(1, after.workout.length - 1)), note: `${after.note ? `${after.note} · ` : ""}Shortened with Nova after confirmation.` };
    else if (after.workout) after = { ...after, workout: after.workout.map((exercise) => ({ ...exercise, sets: exercise.sets.slice(0, Math.max(2, exercise.sets.length - 1)) })), note: `${after.note ? `${after.note} · ` : ""}Working sets reduced with Nova after confirmation.` };
    const proposal: NovaPlanProposal = { id: crypto.randomUUID(), planDayId: todayPlan.id, kind: todayAdjustment.kind === "easier" ? "lower-stress" : todayAdjustment.kind, summary: todayAdjustment.title, before, after };
    const userMessage: NovaMessage = { id: crypto.randomUUID(), role: "user", text: todayNovaInput.trim() || todayAdjustment.title, createdAt: new Date().toISOString() };
    const novaMessage: NovaMessage = { id: crypto.randomUUID(), role: "nova", text: todayAdjustment.explanation, createdAt: new Date().toISOString(), confidence: "Moderate", evidence: [checkIns[0]?.date === isoDate(new Date()) ? `Today’s check-in: energy ${checkIns[0].energy}/5 · soreness ${checkIns[0].soreness}/5` : "No same-day check-in is available.", `Current plan: ${todayPlan.title}`], proposal };
    setNovaMessages((messages) => [...messages, userMessage, novaMessage].slice(-80));
    setTodayAdjustment(null);
    setTodayNovaInput("");
    setScreen("nova");
  }

  function openTodayWorkout() {
    setSelectedPlanDayId(todayPlan.id);
    if (todayPlan.kind === "strength") {
      if (hasProgress && session.planDayId === todayPlan.id) setScreen("workout");
      else { setSession(initialSession(todayPlan.workout?.length ? todayPlan.workout : starterExercises, todayPlan.id)); setScreen("prepare"); }
    } else if (todayPlan.kind !== "rest") {
      setDraftActivity({ id: "", date: todayPlan.date, kind: todayPlan.kind, duration: "", distance: "", effort: 3, note: todayPlan.note });
      setScreen("activity-log");
    } else setScreen("training");
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

  async function runAccountSync() {
    if (syncLock.current || !readNorthSession()) return;
    setOnline(navigator.onLine);
    if (!navigator.onLine) { setSyncError("You are offline. Changes are safely queued on this device."); await refreshLocalSyncState(); return; }
    syncLock.current = true; setSyncing(true); setSyncError("");
    try {
      const result = await withFreshAccess((token) => syncNorth(NORTH_API_BASE, token));
      setSyncResult(result);
      if (result.failed === 0) { const now = new Date().toISOString(); localStorage.setItem("north-last-sync-at", now); setLastSyncedAt(now); }
      else setSyncError(`${result.failed} change${result.failed === 1 ? "" : "s"} could not sync yet. North will retry automatically.`);
      await refreshLocalSyncState();
    } catch (reason) { setSyncError(reason instanceof Error ? reason.message : "Sync could not complete. Your local changes remain safe."); await refreshLocalSyncState(); }
    finally { syncLock.current = false; setSyncing(false); }
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

  const coreScreen = ["today", "journey", "training", "nova", "you"].includes(screen);
  const activeTourStep = tourStep >= 0 ? productTourSteps[tourStep] : null;

  if (!entryComplete) return <Onboarding onComplete={completeOnboarding} onLocalPreview={import.meta.env.DEV ? () => setEntryComplete(true) : undefined} />;

  return (
    <main className="app-shell" id="north-content" tabIndex={-1}>
      <a className="skip-link" href="#north-content">Skip to main content</a>
      <header className="topbar">
        <button className="brand" onClick={() => setScreen("today")} aria-label="North home">
          <img className="brand-lockup brand-lockup-light" src="/png/transparent/lockup-horizontal-teal.png" alt="" />
          <img className="brand-lockup brand-lockup-dark" src="/png/transparent/lockup-horizontal-offwhite.png" alt="" />
        </button>
        <div className="topbar-actions">
          {screen === "today" && <button className="weather-icon-button" onClick={() => loadLocalWeather()} aria-label={weather ? `Refresh weather, currently ${Math.round(weather.temperature)} degrees Celsius` : "Load local weather"} title={weather ? "Refresh local weather" : "Load local weather"}><span className="header-weather-date">{new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric" }).format(new Date()).toUpperCase()}</span>{weather ? <WeatherMark code={weather.weatherCode} size={20} /> : <CloudSun size={20} />}{weather && <span className="header-weather-temperature">{Math.round(weather.temperature)}°</span>}</button>}
          {readNorthSession() && <button className={`icon-button ${syncing ? "spinning" : ""}`} onClick={() => void runAccountSync()} disabled={syncing || !online} aria-label={syncing ? "Refreshing North" : "Refresh North"} title="Refresh North"><RotateCcw size={18} /></button>}
          <button className="icon-button" onClick={() => setNight((value) => !value)} aria-label="Toggle appearance">{night ? <Sun size={19} /> : <Moon size={19} />}</button>
          {readNorthSession() && !coreScreen && <button className={`topbar-account-button ${screen === "account" ? "active" : ""}`} onClick={() => setScreen("account")} aria-label="Open account and settings"><UserRound size={18} /><span>{(profile.name || readNorthSession()?.user.displayName || "N").slice(0,1).toUpperCase()}</span></button>}
        </div>
      </header>

      {!online && <div className="offline-banner" role="status" aria-live="polite"><Database size={15}/><span><strong>Offline mode</strong> Your workout and edits are saved on this device and will sync when connection returns.</span></div>}

      {readNorthSession() && ["you", "account"].includes(screen) && (Boolean(syncError) || syncConflicts.length > 0) && <SyncCentre expanded online={online} syncing={syncing} error={syncError} result={syncResult} conflicts={syncConflicts} lastSyncedAt={lastSyncedAt} onSync={() => void runAccountSync()} onResolve={(conflict, choice) => void chooseSyncConflict(conflict, choice)} />}

      {screen === "today" && (
        <section className="screen today-screen" id="north-primary-screen">
          <section className="today-intro">
            <div><p className="today-greeting">Good morning,</p><h1>{profile.name || "North"}</h1><p className="lead">What direction are we heading in today?</p></div>
          </section>

          <section className="direction-panel">
            <div>
              <p className="eyebrow">TODAY’S DIRECTION</p>
              <h2>{todayPlan.title}</h2>
              <p>{todayPlan.kind === "strength" && todayPlan.workout ? `${todayPlan.workout.length} exercises · ≈${plannedMinutes(todayPlan.workout)} minutes · ${plannedIntensity(todayPlan.workout)}` : todayPlan.note || `${todayPlan.kind} day`}</p>
            </div>
            <span className="direction-mark">{todayPlan.kind === "strength" ? <Dumbbell size={24} /> : todayPlan.kind === "bike" ? <Bike size={24} /> : todayPlan.kind === "walk" || todayPlan.kind === "run" ? <Footprints size={24} /> : todayPlan.kind === "recovery" ? <HeartPulse size={24} /> : todayPlan.kind === "rest" ? <Moon size={24} /> : <Compass size={24} />}</span>
          </section>
          {weatherStatus && <p className="weather-status" role="status">{weatherStatus}</p>}

          <section className="session-card">
            <div className="session-topline">
              <span className="activity-icon">{todayPlan.kind === "strength" ? <Dumbbell size={20} /> : todayPlan.kind === "bike" ? <Bike size={20} /> : <PersonStanding size={20} />}</span>
              <span>{todayPlan.kind.toUpperCase()} · {todayPlan.status.toUpperCase()}</span>
            </div>
            <h2>{todayPlan.title}</h2>
            <p>{todayPlan.kind === "strength" && todayPlan.workout ? `${todayPlan.workout.length} exercises · ${todayPlan.workout.reduce((sum, exercise) => sum + exercise.sets.length, 0)} working sets` : todayPlan.note || "Open today to add the details that matter."}</p>
            {hasProgress && (
              <div className="resume-progress">
                <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
                <span>{progress}% complete</span>
              </div>
            )}
            <button className="primary-button" onClick={openTodayWorkout}>
              {hasProgress && session.planDayId === todayPlan.id ? "Resume workout" : todayPlan.kind === "strength" ? "View today’s workout" : `Open ${todayPlan.kind}`}<ArrowRight size={18} />
            </button>
          </section>

          {(todayPlan.sessions?.length ?? 0) > 0 && <section className="day-session-stack compact"><header><div><p className="eyebrow">TODAY'S SESSION STACK</p><h2>Main focus plus supporting work</h2></div><span>{1 + (todayPlan.sessions?.length ?? 0)} sessions</span></header><article className="primary-session"><i>1</i><div><small>MAIN FOCUS</small><strong>{todayPlan.title}</strong><span>{todayPlan.kind}</span></div></article>{todayPlan.sessions?.map((item, index) => <article key={item.id} className={item.status}><i>{index + 2}</i><div><small>{item.role.toUpperCase()}</small><strong>{item.title}</strong><span>{[item.distance ? `${displayDistance(item.distance).toFixed(1)} ${distanceUnit}` : "", item.duration ? `${item.duration} min` : "", item.kind].filter(Boolean).join(" · ")}</span></div></article>)}</section>}

          <button className="daily-check-in" onClick={() => { setDraftCheckIn({ id: "", date: isoDate(new Date()), weight: checkIns[0]?.weight ? displayBodyWeight(checkIns[0].weight).toFixed(1).replace(/\.0$/, "") : "", sleep: "", energy: 3, soreness: 2, note: "" }); setScreen("check-in"); }}><HeartPulse size={19} /><div><strong>{checkIns[0]?.date === isoDate(new Date()) ? "Today is checked in" : "How are you arriving today?"}</strong><small>{checkIns[0]?.date === isoDate(new Date()) ? `Energy ${checkIns[0].energy}/5 · Soreness ${checkIns[0].soreness}/5` : "Energy, recovery, sleep, and anything worth knowing"}</small></div><ArrowRight size={16} /></button>

          <div className="section-heading"><div><p className="eyebrow">START TODAY</p><h2>Quick movement</h2></div></div><section className="today-shortcuts"><button className="activity-workout" onClick={() => openTodayWorkout()}><Dumbbell size={17} />Plan</button><button className="activity-bike" onClick={() => openActivity("bike")}><Bike size={17} />Bike</button><button className="activity-walk" onClick={() => openActivity("walk")}><PersonStanding size={17} />Walk</button><button className="activity-run" onClick={() => openActivity("run")}><PersonStanding size={17} />Run</button></section>

          <section className="today-snapshot"><p className="eyebrow">JOURNEY SNAPSHOT</p><div><span><TrendingUp size={16} /></span><div><small>THIS WEEK</small><strong>{weekTrainingMinutes} minutes · {weekSessions.length + weekActivities.length} sessions</strong></div></div><div><span><History size={16} /></span><div><small>LAST WORKOUT</small><strong>{history[0] ? `${formatSessionDate(history[0].finishedAt)} · ${sessionSetCount(history[0])} sets` : "Your first workout is ahead"}</strong></div></div><div><span><Compass size={16} /></span><div><small>NEXT MILESTONE</small><strong>{upcomingMilestones[0] ? `${upcomingMilestones[0].title} · ${upcomingMilestones[0].progress}%` : "Current milestones complete"}</strong></div></div><div><span><PersonStanding size={16} /></span><div><small>TODAY’S ACTIVITY</small><strong>{todayActivities.length ? todayActivities.map((item) => `${item.kind} ${item.duration || "—"}m`).join(" · ") : "No additional activity logged"}</strong></div></div></section>

          <section className="today-nova-adjust"><div className="nova-label"><Sparkles size={14} /> ADJUST WITH NOVA</div><p>Tell Nova if time, energy, soreness, or recovery changed. You will see the exact edit before anything moves.</p><div><input value={todayNovaInput} onChange={(event) => setTodayNovaInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && askNovaAboutToday()} placeholder="I’m short on time…" aria-label="Tell Nova what changed today" /><button onClick={askNovaAboutToday} aria-label="Ask Nova about today"><Send size={15} /></button></div>{todayAdjustment && <article><strong>{todayAdjustment.title}</strong><p>{todayAdjustment.explanation}</p>{!todayAdjustment.explanation.startsWith("Try telling") && <button onClick={applyTodayAdjustment}>Review and apply <ArrowRight size={13} /></button>}</article>}</section>

          <p className="quiet-copy">Head North. Every day.</p>
        </section>
      )}

      {screen === "journey" && (
        <section className="screen destination-screen journey-destination">
          <header className="journey-page-header"><div><p className="eyebrow">YOUR JOURNEY</p><h1>See how far you’ve come.</h1><p>Progress is more than a number. It is the story of choosing to continue.</p></div><span><MapIcon size={22} /></span></header>
          <nav className="journey-tabs">{(["timeline", "milestones", "insights", "this-day"] as const).map((tab) => <button key={tab} className={journeyTab === tab ? "active" : ""} onClick={() => setJourneyTab(tab)}>{tab === "this-day" ? "This Day" : tab[0].toUpperCase() + tab.slice(1)}</button>)}</nav>
          {journeyTab === "timeline" && <>
            <section className="momentum-panel"><div><span>THIS WEEK</span><strong>{weeklyPlan.filter((item) => item.status === "completed").length}/{weeklyPlan.filter((item) => item.kind !== "rest").length} planned days complete</strong><p>{weekTrainingMinutes} minutes · {Math.round(displayWeight(weekTonnage)).toLocaleString()} {weightUnit} volume · {displayDistance(weekDistance).toFixed(1)} {distanceUnit} preserved this week.</p></div><TrendingUp size={27} /></section>
            <section className="journey-stats"><div><strong>{history.length}</strong><span>workouts</span></div><div><strong>{history.reduce((total, item) => total + sessionSetCount(item), 0)}</strong><span>sets</span></div><div><strong>{displayDistance(activities.reduce((total, item) => total + (Number.parseFloat(item.distance) || 0), 0)).toFixed(1)}</strong><span>{distanceUnit}</span></div><div><strong>{checkIns[0]?.weight ? displayWeight(checkIns[0].weight).toFixed(1) : "—"}</strong><span>latest {weightUnit}</span></div></section>
            <section className="journey-calendar-card"><header><button onClick={() => setHistoryCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))} aria-label="Previous Journey month"><ChevronLeft /></button><div><small>YOUR TRAINING CALENDAR</small><h2>{new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric" }).format(historyCalendarMonth)}</h2></div><button onClick={() => setHistoryCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))} aria-label="Next Journey month"><ChevronRight /></button></header><div className="journey-calendar-weekdays">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="journey-calendar-grid">{historyCalendarDays.map((date) => { const key = isoDate(date); const workouts = historyByDate[key]?.length ?? 0; const meaningful = workouts + activities.filter((activity) => activity.date === key).length + checkIns.filter((entry) => entry.date === key).length + weeklyReviews.filter((review) => isoDate(new Date(review.createdAt)) === key).length; return <button key={key} className={`${date.getMonth() !== historyCalendarMonth.getMonth() ? "outside " : ""}${timelineDate === key ? "selected " : ""}${meaningful ? "has-records" : ""}`} onClick={() => setTimelineDate((selected) => selected === key ? "" : key)} aria-label={`${formatSessionDate(`${key}T12:00:00`)}${meaningful ? `, ${meaningful} records` : ", no records"}`}><time>{date.getDate()}</time>{meaningful > 0 && <span>{workouts > 0 && <i className="workout" />}{activities.some((activity) => activity.date === key) && <i className="activity" />}{checkIns.some((entry) => entry.date === key) && <i className="checkin" />}</span>}</button>; })}</div><footer><span><i className="workout" /> Workout</span><span><i className="activity" /> Activity</span><span><i className="checkin" /> Check-in</span>{timelineDate && <button onClick={() => setTimelineDate("")}>Show all dates</button>}</footer></section>
            {timelineDate && timelineDate <= isoDate(new Date()) && <section className="journey-backfill"><button className="journey-backfill-launch" onClick={() => setBackfillOpen((open) => !open)}><span><Plus size={19}/></span><div><small>{timelineDate < isoDate(new Date()) ? "MISSING SOMETHING?" : "ADD TO TODAY"}</small><strong>{timelineDate < isoDate(new Date()) ? "Add a workout performed this day" : "Add another workout"}</strong><p>North will preserve when it happened and when it was entered.</p></div><ChevronDown className={backfillOpen ? "open" : ""}/></button>{backfillOpen && <div className="journey-backfill-picker"><header><div><p className="eyebrow">BACKFILL WORKOUT</p><h2>{formatSessionDate(`${timelineDate}T12:00:00`)}</h2></div><button onClick={() => setBackfillOpen(false)} aria-label="Close backfill options"><X/></button></header>{weeklyPlan.find((day) => day.date === timelineDate && day.kind === "strength") && (() => { const day = weeklyPlan.find((item) => item.date === timelineDate)!; return <button className="backfill-planned" onClick={() => prepareBackfill(day.workout?.length ? day.workout : starterExercises, day.title, day.id)}><CalendarDays/><div><small>PLANNED FOR THIS DAY</small><strong>Complete {day.title}</strong><span>{day.workout?.length ?? starterExercises.length} exercises</span></div><ArrowRight/></button>; })()}<button className="backfill-blank" onClick={() => prepareBackfill([], "Custom workout")}><Plus/><div><strong>Build from scratch</strong><span>Start empty and add only what you performed</span></div><ArrowRight/></button><label className="backfill-search"><Search/><input value={backfillSearch} onChange={(event) => setBackfillSearch(event.target.value)} placeholder="Search premade and My Workouts" /></label><div className="backfill-template-groups"><section><h3>MY WORKOUTS</h3>{personalTemplates.filter((template) => !backfillSearch || `${template.name} ${template.focus}`.toLowerCase().includes(backfillSearch.toLowerCase())).slice(0,6).map((template) => <button key={template.id} onClick={() => prepareBackfill(exercisesFromTemplate(template), template.name)}><Heart/><span><strong>{template.name}</strong><small>{template.duration} min · {template.exercises.length} exercises</small></span><ArrowRight/></button>)}{personalTemplates.length === 0 && <p>Saved personal workouts will appear here.</p>}</section><section><h3>NORTH WORKOUTS</h3>{workoutTemplates.filter((template) => !backfillSearch || `${template.name} ${template.focus} ${template.goal}`.toLowerCase().includes(backfillSearch.toLowerCase())).slice(0,8).map((template) => <button key={template.id} onClick={() => prepareBackfill(exercisesFromTemplate(template), template.name)}><Dumbbell/><span><strong>{template.name}</strong><small>{template.focus} · {template.duration} min</small></span><ArrowRight/></button>)}</section></div></div>}</section>}
            <button className="weekly-review-callout" onClick={() => { const existing = weeklyReviews.find((item) => item.weekStart === weeklyPlan[0].date); setDraftReview(existing ? { proud: existing.proud, learned: existing.learned, next: existing.next } : { proud: "", learned: "", next: "" }); setScreen("weekly-review"); }}><Compass size={20} /><div><strong>{weeklyReviews.some((item) => item.weekStart === weeklyPlan[0].date) ? "Revisit this week" : "Reflect on this week"}</strong><small>{weeklyPlan.filter((item) => item.status === "completed").length} planned days completed · make the learning visible</small></div><ArrowRight size={16} /></button>
            <section className="timeline-controls"><div className="picker-filters">{["All", "Workouts", "Activities", "Check-ins", "Reflections", "Photos"].map((filter) => <button key={filter} className={timelineFilter === filter ? "active" : ""} onClick={() => setTimelineFilter(filter)}>{filter}</button>)}</div><label><CalendarDays size={15} /><input type="date" value={timelineDate} onChange={(event) => setTimelineDate(event.target.value)} /><button onClick={() => setTimelineDate("")} disabled={!timelineDate}>Clear</button></label></section>
            <section className="photo-add"><div><strong>Add a private Journey photo</strong><small>Stored only in this browser and your exported backup · maximum 2 MB.</small></div><input value={photoCaption} onChange={(event) => setPhotoCaption(event.target.value)} placeholder="Optional caption" /><label><Plus size={14} /> Choose photo<input type="file" accept="image/*" onChange={addJourneyPhoto} /></label></section>
            <div className="section-heading"><div><p className="eyebrow">TIMELINE</p><h2>{timelineDate ? formatSessionDate(`${timelineDate}T12:00:00`) : "Your moments"}</h2></div><span>{filteredTimeline.length}</span></div>
            <section className="timeline unified-timeline">{filteredTimeline.map((item) => {
              const content = <><span>{journeyMomentIcon(item)}</span><div><small>{item.type.toUpperCase()} · {formatSessionDate(item.date).toUpperCase()}</small><h3>{item.title}</h3>{"photo" in item && item.photo && <img src={item.photo.dataUrl} alt={item.photo.caption || "Journey memory"} />}<p>{item.summary}</p>{"photo" in item && item.photo && <button className="photo-delete" onClick={() => removeJourneyPhoto(item.photo.id)}>Remove photo</button>}</div></>;
              return "workout" in item && item.workout ? <button className={`timeline-entry ${journeyMomentTone(item)}`} key={item.id} onClick={() => openHistory(item.workout, "journey")}>{content}</button> : <article className={journeyMomentTone(item)} key={item.id}>{content}</article>;
            })}{filteredTimeline.length === 0 && <article><span><Compass size={16} /></span><div><small>NO MATCHING MOMENTS</small><h3>Your record is still here.</h3><p>Clear the date or choose another filter.</p></div></article>}<article><span><Compass size={16} /></span><div><small>YOUR BEGINNING</small><h3>You chose a direction.</h3><p>Every journey needs somewhere honest to begin.</p></div></article></section>
          </>}
          {journeyTab === "insights" && <>
            <section className="momentum-panel"><div><span>LAST FOUR WEEKS</span><strong>You’re building a record, not a score.</strong><p>{fourWeekTrends.reduce((sum, week) => sum + week.workouts, 0)} workouts · {fourWeekTrends.reduce((sum, week) => sum + week.minutes, 0)} minutes · {Math.round(displayWeight(fourWeekTrends.reduce((sum, week) => sum + week.volume, 0))).toLocaleString()} {weightUnit} volume.</p></div><TrendingUp size={27} /></section>
            <section className="four-week-chart">{fourWeekTrends.map((week) => <article key={week.label}><div><i style={{ height: `${Math.max(5, Math.min(90, week.minutes))}px` }} /></div><strong>{week.workouts}</strong><span>{week.label}</span><small>{week.minutes}m</small></article>)}</section>
            <div className="section-heading"><div><p className="eyebrow">FOCUS AREAS</p><h2>Muscle-group volume</h2></div></div>
            <section className="insight-muscles">{fourWeekMuscleDistribution.length ? fourWeekMuscleDistribution.map(([category, sets]) => <div key={category}><span>{category}</span><div><i style={{ width: `${Math.round(sets / fourWeekMuscleDistribution[0][1] * 100)}%` }} /></div><strong>{sets} sets</strong></div>) : <p>Complete workouts to reveal four-week muscle-group distribution.</p>}</section>
            <div className="section-heading"><div><p className="eyebrow">STRENGTH TREND</p><h2>Estimated rep-max direction</h2></div></div>
            <section className="exercise-trend-list">{exerciseTrends.map((item) => <article key={item.name}><div><strong>{item.name}</strong><small>{item.points.length} recorded sessions · volume {item.volumeChange >= 0 ? "+" : ""}{Math.round(displayWeight(item.volumeChange)).toLocaleString()} {weightUnit}</small></div><b className={item.change >= 0 ? "positive" : "negative"}>{item.change >= 0 ? "+" : ""}{displayWeight(item.change).toFixed(1)} {weightUnit}</b><span>estimated max</span></article>)}{exerciseTrends.length === 0 && <p>Repeat an exercise in two completed workouts to see its direction.</p>}</section>
            <div className="section-heading"><div><p className="eyebrow">ACTIVITY TREND</p><h2>Pace and speed</h2></div></div>
            <section className="activity-trend-list">{activityTrends.map((item) => <div key={item.id}><span>{item.kind === "bike" ? <Bike size={14} /> : <PersonStanding size={14} />}</span><div><strong>{item.kind === "bike" ? "Bike" : item.kind === "run" ? "Run" : "Walk"}</strong><small>{formatSessionDate(`${item.date}T12:00:00`)} · {displayDistance(item.distance).toFixed(1)} {distanceUnit} · {item.duration} min</small></div><b>{item.kind === "bike" ? `${displayDistance(item.pace).toFixed(1)} ${distanceUnit}/h` : `${(item.pace / (distanceUnit === "km" ? 1 : 0.621371)).toFixed(1)} min/${distanceUnit}`}</b></div>)}{activityTrends.length === 0 && <p>Add duration and distance to activity logs to calculate pace or speed.</p>}</section>
            <section className="recovery-evidence"><p className="eyebrow">RECOVERY CONTEXT</p>{recoveryComparison ? <><strong>{recoveryComparison.count} same-day check-in/workout pairs</strong><p>{recoveryComparison.lowDifficulty !== null ? `Low-energy days average ${recoveryComparison.lowDifficulty.toFixed(1)}/5 workout difficulty. ` : ""}{recoveryComparison.highDifficulty !== null ? `Higher-energy days average ${recoveryComparison.highDifficulty.toFixed(1)}/5. ` : ""}This is an association in your records, not proof that energy caused workout difficulty.</p></> : <><strong>More paired days are needed</strong><p>North needs at least three dates containing both a check-in and a completed workout before comparing recovery context.</p></>}</section>
            <div className="section-heading"><div><p className="eyebrow">PERSONAL BESTS</p><h2>Recent progress</h2></div></div><section className="pr-list">{personalRecords.slice(0, 6).map((record) => <div key={record.id}><span><TrendingUp size={14} /></span><div><strong>{record.exerciseName}</strong><small>{formatSessionDate(record.date)} · previous {displayWeight(record.previous).toFixed(1)} {weightUnit}</small></div><b>{displayWeight(record.weight).toFixed(1)} {weightUnit}</b></div>)}{personalRecords.length === 0 && <p>New load records appear after a movement has a previous result to compare.</p>}</section>
            <div className="section-heading"><div><p className="eyebrow">WHAT NORTH HAS LEARNED</p><h2>Evidence and limits</h2></div></div><section className="learned-list">{visibleLearnedInsights.map((insight) => <button key={insight.id} className={expandedInsightId === insight.id ? "expanded" : ""} onClick={() => setExpandedInsightId((value) => value === insight.id ? null : insight.id)}><span>{insight.icon}</span><div><strong>{insight.title}</strong><small>{insight.summary}</small>{expandedInsightId === insight.id && <p>{insight.evidence}</p>}</div>{expandedInsightId === insight.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>)}</section>
          </>}
          {journeyTab === "this-day" && <><section className="momentum-panel"><div><span>THIS DAY, ACROSS TIME</span><strong>{thisDayItems.length ? `${thisDayItems.length} ${thisDayItems.length === 1 ? "memory" : "memories"} to revisit` : "A memory will meet you here"}</strong><p>North looks for moments from one week, one month, six months, and one year ago. Nothing is invented when no memory exists.</p></div><CalendarDays size={27} /></section><section className="timeline unified-timeline">{thisDayItems.map((item) => <article className={journeyMomentTone(item)} key={`${item.id}-${item.interval}`}><span>{journeyMomentIcon(item)}</span><div><small>{item.interval} · {formatSessionDate(item.date).toUpperCase()}</small><h3>{item.title}</h3><p>{item.summary}</p></div></article>)}{thisDayItems.length === 0 && <article><span><CalendarDays size={16} /></span><div><small>NO MEMORY AT THESE INTERVALS YET</small><h3>Today is becoming part of the story.</h3><p>When you log a moment one week, month, six months, or year from now, North can bring it back here.</p></div></article>}</section></>}
          {journeyTab === "milestones" && <><section className="milestone-summary"><div><small>YOUR JOURNEY MARK</small><strong>Chapter {Math.floor(unlockedMilestones.length / 4) + 1}</strong><span>{unlockedMilestones.length}/{milestoneResults.length} milestones unlocked</span></div><div className="milestone-ring" style={{ "--milestone-progress": `${Math.round(unlockedMilestones.length / milestoneResults.length * 360)}deg` } as CSSProperties}><b>{Math.round(unlockedMilestones.length / milestoneResults.length * 100)}%</b></div></section>{earnedIdentities.length > 0 && <section className="earned-identities"><p className="eyebrow">QUIETLY EARNED</p><div>{earnedIdentities.map((identity) => <span key={identity}>{identity}</span>)}</div><small>These describe records you have built. Missing one is never treated as failure.</small></section>}<div className="picker-filters milestone-filters">{milestoneCategories.map((category) => <button key={category} className={milestoneFilter === category ? "active" : ""} onClick={() => setMilestoneFilter(category)}>{category}</button>)}</div><div className="section-heading"><div><p className="eyebrow">UNLOCKED</p><h2>Evidence of showing up</h2></div><span>{unlockedMilestones.length}</span></div><section className="milestone-list unlocked">{filteredMilestones.filter((milestone) => milestone.unlocked).map((milestone) => <article key={milestone.id}><span><Check size={15} /></span><div><strong>{milestone.title}</strong><p>{milestone.description}</p><small>{milestone.achievedAt ? formatSessionDate(milestone.achievedAt) : "Unlocked"} · {milestone.category}</small></div></article>)}{filteredMilestones.filter((milestone) => milestone.unlocked).length === 0 && <p>No unlocked milestones in this category yet.</p>}</section><div className="section-heading"><div><p className="eyebrow">IN PROGRESS</p><h2>What is taking shape</h2></div></div><section className="milestone-list upcoming">{filteredMilestones.filter((milestone) => !milestone.unlocked).sort((a, b) => b.progress - a.progress).map((milestone) => <article key={milestone.id}><span>{milestone.progress}%</span><div><strong>{milestone.title}</strong><p>{milestone.description}</p><div className="milestone-progress"><i style={{ width: `${milestone.progress}%` }} /></div><small>{milestone.value.toLocaleString()} / {milestone.target.toLocaleString()} · {milestone.category}</small></div></article>)}{upcomingMilestones.length === 0 && <p>Every current milestone is unlocked. More can be added without moving the goalposts behind you.</p>}</section></>}
        </section>
      )}

      {screen === "training" && (
        <section className="screen destination-screen training-destination">
          <header className="training-page-header"><div><p className="eyebrow">TRAINING</p><h1>Own the work.</h1><p>Your plan. Your progress. Your strength.</p></div><button aria-label="Open full week" onClick={() => setScreen("week-plan")}><CalendarDays size={22} /></button></header>
          <div className="section-heading training-rhythm-heading"><div><p className="eyebrow">THIS WEEK</p><h2>Your rhythm</h2></div><button className="text-button" onClick={() => setScreen("week-plan")}>Full week <ArrowRight size={14} /></button></div>
          <section className="week-strip training-rhythm-strip">
            {weeklyPlan.map((day) => <button key={day.id} onClick={() => setSelectedPlanDayId(day.id)} className={`${day.id === selectedPlanDay.id ? "selected" : ""} ${day.date === isoDate(new Date()) ? "today" : ""} ${day.status}`}><span>{day.label.slice(0, 1)}</span><small>{Number(day.date.slice(-2))}</small><i>{day.status === "completed" ? "✓" : day.status === "skipped" ? "×" : day.kind === "strength" ? "●" : day.kind === "rest" ? "—" : "·"}</i></button>)}
          </section>
          <section className="nova-note training-note"><span className="nova-orbit"><Compass size={18} /></span><div><div className="nova-label">NOVA · TODAY'S CALL</div><p>Your last upper-body session moved well. Start controlled today and adjust only if the first working set says you should.</p></div><button onClick={() => setScreen("nova")}>Ask Nova <ArrowRight size={14} /></button></section>
          <section className={`training-hero ${selectedPlanDay.kind}`}>
            <div className="training-hero-copy"><p className="eyebrow">TODAY’S TRAINING</p><h2>{selectedPlanDay.title}</h2><div className="training-muscle-tags">{selectedPlanDay.kind === "strength" ? Array.from(new Set(selectedWorkout.map((item) => exerciseLibrary.find((entry) => entry.name === item.name)?.category).filter(Boolean))).slice(0, 3).map((group) => <span key={group}>{group}</span>) : <span>{selectedPlanDay.kind}</span>}</div><div className="training-hero-metrics"><span><Clock3 size={16} /><strong>{selectedPlanDay.kind === "strength" ? `${plannedMinutes(selectedWorkout)} min` : "Open"}</strong><small>EST. TIME</small></span><span><TrendingUp size={16} /><strong>{selectedPlanDay.kind === "strength" ? plannedIntensity(selectedWorkout) : "Steady"}</strong><small>INTENSITY</small></span><span><Dumbbell size={16} /><strong>{selectedPlanDay.kind === "strength" ? selectedWorkout.flatMap((item) => item.sets).length : "—"}</strong><small>SETS</small></span></div></div>
            <div className="training-body-state" aria-hidden="true"><AnatomyMap compact showBack={false} {...selectedMuscleActivation} /></div>
            {selectedPlanDay.kind !== "rest" && <div className="training-hero-actions"><button className="primary-button" onClick={beginPlannedDay}><Play size={17} />{hasProgress && session.planDayId === selectedPlanDay.id ? "Resume workout" : "Start workout"}</button><button className="secondary-button" onClick={() => setTrainingDetailsOpen((open) => !open)}>{trainingDetailsOpen ? "Hide details" : "View details"}<ArrowRight size={16} /></button></div>}
          </section>
          {(selectedPlanDay.sessions?.length ?? 0) > 0 && !trainingDetailsOpen && <section className="day-session-stack compact training-session-preview"><header><div><p className="eyebrow">ALSO TODAY</p><h2>Your session stack</h2></div><button onClick={() => setTrainingDetailsOpen(true)}>Edit day <ArrowRight size={13}/></button></header>{selectedPlanDay.sessions?.map((item, index) => <article key={item.id} className={item.status}><i>{index + 2}</i><div><small>{item.role.toUpperCase()}</small><strong>{item.title}</strong><span>{[item.distance ? `${displayDistance(item.distance).toFixed(1)} ${distanceUnit}` : "", item.duration ? `${item.duration} min` : "", item.kind].filter(Boolean).join(" · ")}</span></div><button className="session-preview-action" onClick={() => openPlannedSession(item)}>{item.kind === "strength" ? "Prepare" : "Log"}</button></article>)}</section>}
          {trainingDetailsOpen && <section className="plan-editor training-details-drawer">
            <div className="plan-date"><div><p className="eyebrow">{selectedPlanDay.label.toUpperCase()} · {formatSessionDate(`${selectedPlanDay.date}T12:00:00`).toUpperCase()}</p><h3>{selectedPlanDay.title}</h3></div><span>{selectedPlanDay.status}</span></div>
            {selectedPlanDay.kind === "strength" && <section className="workout-edit-station"><header><div><p className="eyebrow">WORKOUT EDIT STATION</p><h3>Choose it. Build it. Make it yours.</h3></div><SlidersHorizontal size={20} /></header><div><button onClick={() => { setTemplateSource("north"); setScreen("workout-library"); }}><Sparkles size={17} /><span><strong>Premade workouts</strong><small>Browse by area, goal or time</small></span><ArrowRight size={15} /></button><button onClick={() => { setTemplateSource("personal"); setScreen("workout-library"); }}><Heart size={17} /><span><strong>My workouts</strong><small>Saved, favourite and custom</small></span><ArrowRight size={15} /></button></div><p>Your current movements stay editable below. Choosing a workout replaces only this selected day.</p></section>}
            <div className="kind-picker">
              {(["strength", "bike", "walk", "run", "recovery", "rest"] as ActivityKind[]).map((kind) => <button key={kind} className={selectedPlanDay.kind === kind ? "active" : ""} onClick={() => patchPlanDay({ kind, title: kind === "strength" ? "Strength session" : kind === "bike" ? "Bike ride" : kind === "walk" ? "Walk" : kind === "run" ? "Run" : kind === "recovery" ? "Recovery and mobility" : "Rest", workout: kind === "strength" ? (selectedPlanDay.workout?.length ? selectedPlanDay.workout : resetExercises(starterExercises)) : undefined })}>{kind}</button>)}
            </div>
            <label><span>Session</span><input value={selectedPlanDay.title} onChange={(event) => patchPlanDay({ title: event.target.value })} /></label>
            <label><span>Plan note</span><textarea rows={2} value={selectedPlanDay.note} onChange={(event) => patchPlanDay({ note: event.target.value })} placeholder="Anything worth knowing before the day begins?" /></label>
            {selectedPlanDay.kind === "strength" && <div className="planned-workout-summary"><strong>{selectedWorkout.length} exercises planned</strong><small>{selectedWorkout.map((exercise) => exercise.name).join(" · ")}</small></div>}
            <section className="day-session-stack">
              <header><div><p className="eyebrow">SESSION STACK</p><h3>Everything planned today</h3></div><button type="button" onClick={() => setStackComposerOpen((open) => !open)}><Plus size={14} /> Add session</button></header>
              <article className="primary-session"><i>1</i><div><small>MAIN FOCUS</small><strong>{selectedPlanDay.title}</strong><span>{selectedPlanDay.kind}</span></div></article>
              {(selectedPlanDay.sessions ?? []).map((item, index) => <article key={item.id} className={item.status}><i>{index + 2}</i><div><small>{item.role.toUpperCase()}</small><strong>{item.title}</strong><span>{[item.distance ? `${displayDistance(item.distance).toFixed(1)} ${distanceUnit}` : "", item.duration ? `${item.duration} min` : "", item.kind].filter(Boolean).join(" · ")}</span></div><div className="stack-actions"><button type="button" onClick={() => openPlannedSession(item)}>{item.kind === "strength" ? "Prepare" : "Log"}</button><button type="button" onClick={() => patchPlannedSession(item.id, { status: item.status === "skipped" ? "planned" : "skipped" })}>{item.status === "skipped" ? "Restore" : "Skip"}</button><button type="button" aria-label={`Remove ${item.title}`} onClick={() => removePlannedSession(item.id)}><X size={14} /></button></div></article>)}
              {stackComposerOpen && <div className="stack-composer"><div><label><span>Type</span><select value={draftPlannedSession.kind} onChange={(event) => { const kind = event.target.value as PlannedSession["kind"]; setDraftPlannedSession((value) => ({ ...value, kind, title: kind === "bike" ? "Zone 2 bike ride" : kind === "strength" ? "Strength session" : kind === "walk" ? "Walk" : kind === "run" ? "Run" : "Recovery session" })); }}><option value="bike">Bike</option><option value="strength">Strength</option><option value="walk">Walk</option><option value="run">Run</option><option value="recovery">Recovery</option></select></label><label><span>Purpose</span><select value={draftPlannedSession.role} onChange={(event) => setDraftPlannedSession((value) => ({ ...value, role: event.target.value as SessionRole }))}><option value="warm-up">Warm-up</option><option value="secondary">Secondary</option><option value="recovery">Recovery</option><option value="optional">Optional</option></select></label></div><label><span>Session name</span><input value={draftPlannedSession.title} onChange={(event) => setDraftPlannedSession((value) => ({ ...value, title: event.target.value }))} /></label><div><label><span>Distance ({distanceUnit})</span><DeferredUnitInput storedValue={draftPlannedSession.distance} formatValue={displayDistance} storeValue={storeDistance} onCommit={(distance) => setDraftPlannedSession((value) => ({ ...value, distance }))} label={`Planned distance in ${distanceUnit}`} /></label><label><span>Duration (min)</span><input inputMode="numeric" value={draftPlannedSession.duration} onChange={(event) => setDraftPlannedSession((value) => ({ ...value, duration: event.target.value }))} /></label></div><label><span>Notes or intensity</span><input value={draftPlannedSession.note} onChange={(event) => setDraftPlannedSession((value) => ({ ...value, note: event.target.value }))} placeholder="Zone 2, easy pace, route…" /></label><button type="button" className="primary-button" onClick={addPlannedSession}>Add to this day</button></div>}
            </section>
            <div className="plan-actions"><button onClick={() => movePlanDay(-1)} disabled={weeklyPlan[0].id === selectedPlanDay.id}><ArrowLeft size={13} /> Earlier</button><button onClick={() => movePlanDay(1)} disabled={weeklyPlan[weeklyPlan.length - 1].id === selectedPlanDay.id}>Later <ArrowRight size={13} /></button><button onClick={() => patchPlanDay({ status: selectedPlanDay.status === "skipped" ? "planned" : "skipped" })}>{selectedPlanDay.status === "skipped" ? "Restore" : "Skip"}</button></div>
            {selectedPlanDay.kind !== "rest" && <button className="primary-button" onClick={beginPlannedDay}>{selectedPlanDay.kind === "strength" ? "Prepare this workout" : `Log ${selectedPlanDay.kind}`}<ArrowRight size={16} /></button>}
            {selectedPlanDay.kind === "rest" && <p className="rest-message"><BedDouble size={17} /> Rest is part of the plan, not a missed day.</p>}
          </section>}
          <details className="training-tools-drawer"><summary><span><Plus size={17}/></span><div><strong>More training tools</strong><small>Quick log, programs, workouts and coach imports</small></div><ChevronDown size={17}/></summary><div className="training-tools-content">
          <div className="section-heading"><div><p className="eyebrow">QUICK LOG</p><h2>Move outside the plan</h2></div></div>
          <section className="activity-shortcuts">
            <button className="activity-bike" onClick={() => openActivity("bike")}><Bike size={18} />Bike</button>
            <button className="activity-walk" onClick={() => openActivity("walk")}><PersonStanding size={18} />Walk</button>
            <button className="activity-run" onClick={() => openActivity("run")}><PersonStanding size={18} />Run</button>
            <button className="activity-recovery" onClick={() => openActivity("recovery")}><HeartPulse size={18} />Recovery</button>
          </section>
          {currentProgram && activeProgram && <section className="active-program-card"><div><p className="eyebrow">ACTIVE PROGRAM</p><h3>{currentProgram.name}</h3><span>Week {activeProgram.currentWeek} of {currentProgram.weeks} · {programCompletedThisWeek}/{activeProgram.daysPerWeek} sessions complete · {programAdherence}% adherence</span>{activeProgram.changes.length > 0 && <span>{activeProgram.changes.length} confirmed program change{activeProgram.changes.length === 1 ? "" : "s"}</span>}</div><div className="program-progress"><i style={{ width: `${Math.round((activeProgram.currentWeek / currentProgram.weeks) * 100)}%` }} /></div><button onClick={advanceProgramWeek} disabled={activeProgram.currentWeek >= currentProgram.weeks || programCompletedThisWeek < activeProgram.daysPerWeek}>Generate next week <ArrowRight size={14} /></button></section>}
          <button className="import-coach-button" onClick={() => setScreen("progression")}><TrendingUp size={17} /><div><strong>Progression and personal records</strong><small>{personalRecords.length} detected records · {progressionSuggestions.length} current suggestions</small></div><ArrowRight size={16} /></button>
          <button className="import-coach-button" onClick={() => setScreen("programs")}><MapIcon size={17} /><div><strong>Choose a training program</strong><small>{programs.length} multi-week paths with flexible schedules</small></div><ArrowRight size={16} /></button>
          <button className="import-coach-button" onClick={() => setScreen("workout-library")}><Dumbbell size={17} /><div><strong>Explore premade workouts</strong><small>{workoutTemplates.length} sessions by goal, body area, time, level, and equipment</small></div><ArrowRight size={16} /></button>
          <button className="import-coach-button" onClick={() => setScreen("coach-import")}><ClipboardPaste size={17} /><div><strong>Import from coach</strong><small>Paste a workout and review it before training</small></div><ArrowRight size={16} /></button>
          </div></details>
          <div className="section-heading"><div><p className="eyebrow">RECENT</p><h2>Completed sessions</h2></div></div>
          <section className="recent-sessions">
            {history.length === 0 ? (
              <div className="quiet-row"><History size={19} /><div><strong>No sessions yet</strong><small>Your completed workouts will collect here.</small></div></div>
            ) : history.slice(0, 3).map((item) => (
              <button key={item.finishedAt} onClick={() => openHistory(item, "training")}><span><Dumbbell size={17} /></span><div><strong>{formatSessionDate(item.finishedAt)}</strong><small>{sessionSetCount(item)} sets{sessionMinutes(item) ? ` · ${sessionMinutes(item)} min` : ""} · Energy {item.energy}/5</small></div><ArrowRight size={16} /></button>
            ))}
          </section>
          {history.length > 0 && <button className="text-wide-button" onClick={() => setScreen("workout-history")}>View all workouts <ArrowRight size={16} /></button>}
          <div className="section-heading"><div><p className="eyebrow">WEEKLY LOAD</p><h2>What actually happened</h2></div></div>
          <section className="weekly-load-card">
            <div className="weekly-load-metrics"><div><strong>{weekSessions.length + weekActivities.length}</strong><span>sessions</span></div><div><strong>{weekTrainingMinutes}</strong><span>minutes</span></div><div><strong>{weekReps}</strong><span>reps</span></div><div><strong>{Math.round(displayWeight(weekTonnage)).toLocaleString()}</strong><span>{weightUnit} volume</span></div><div><strong>{displayDistance(weekDistance).toFixed(1)}</strong><span>{distanceUnit}</span></div></div>
            <div className="week-bars">{weekDayMinutes.map((minutes, index) => <div key={weeklyPlan[index].id}><i style={{ height: `${Math.max(4, Math.min(56, minutes))}px` }} /><span>{weeklyPlan[index].label.slice(0, 1)}</span></div>)}</div>
            {muscleDistribution.length > 0 && <div className="muscle-summary">{muscleDistribution.slice(0, 5).map(([category, sets]) => <span key={category}>{category} <b>{sets} sets</b></span>)}</div>}
            {calorieEstimates && <p className="calorie-assumption">{estimatedWeekCalories ? `≈${estimatedWeekCalories.toLocaleString()} active kcal estimated using your latest recorded bodyweight and standard activity MET values.` : "Add bodyweight in a check-in to calculate an estimate."} Estimates are optional and are not measurements.</p>}
            <button className="estimate-toggle" onClick={() => setCalorieEstimates((enabled) => !enabled)}>{calorieEstimates ? "Hide calorie estimate" : "Show optional calorie estimate"}</button>
          </section>
        </section>
      )}

      {screen === "week-plan" && (
        <section className="screen week-plan-screen">
          <button className="back-button" onClick={() => setScreen("training")}><ArrowLeft size={17} /> Training</button>
          <p className="eyebrow">FULL WEEK</p>
          <h1>Plan the rhythm.</h1>
          <p className="lead">See every day, preview the real prescription, then open any day to edit it.</p>
          <section className="expanded-week-list">{weeklyPlan.map((day) => {
            const workout = day.workout ?? [];
            return <article key={day.id} className={`${day.kind} ${day.status}`}><button onClick={() => { setSelectedPlanDayId(day.id); setScreen("training"); }}><div className="expanded-day-date"><span>{day.label}</span><strong>{Number(day.date.slice(-2))}</strong></div><div className="expanded-day-content"><small>{day.kind.toUpperCase()} · {day.status}{day.sessions?.length ? ` · ${day.sessions.length + 1} sessions` : ""}</small><h3>{day.title}</h3>{day.kind === "strength" && workout.length > 0 ? <><p>{workout.map((exercise) => exercise.name).join(" · ")}{day.sessions?.length ? ` · then ${day.sessions.map((item) => item.title).join(" · ")}` : ""}</p><div><span><Clock3 size={12} /> ≈{plannedMinutes(workout)} min</span><span><Dumbbell size={12} /> {workout.reduce((sum, exercise) => sum + exercise.sets.length, 0)} sets</span><span><TrendingUp size={12} /> {plannedIntensity(workout)}</span></div></> : <p>{day.note || (day.kind === "rest" ? "Recovery is part of the plan." : "Open the day to add details.")}</p>}</div><ArrowRight size={16} /></button></article>;
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
          <section className="pr-list">{personalRecords.map((record) => <div key={record.id}><span><TrendingUp size={14} /></span><div><strong>{record.exerciseName}</strong><small>{formatSessionDate(record.date)} · previous {displayWeight(record.previous).toFixed(1)} {weightUnit}</small></div><b>{displayWeight(record.weight).toFixed(1)} {weightUnit}</b></div>)}{personalRecords.length === 0 && <p>Personal records appear after an exercise has at least two recorded loads.</p>}</section>
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
          <label className="search-field template-search"><Search size={17} /><input value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Search workouts, exercises, or equipment" /></label>
          <div className="filter-label">LIBRARY</div>
          <div className="picker-filters"><button className={templateSource === "All" ? "active" : ""} onClick={() => setTemplateSource("All")}>All</button><button className={templateSource === "personal" ? "active" : ""} onClick={() => setTemplateSource("personal")}>My workouts ({myWorkoutCount})</button><button className={templateSource === "recent" ? "active" : ""} onClick={() => setTemplateSource("recent")}>Recent ({recentTemplateIds.length})</button><button className={templateSource === "north" ? "active" : ""} onClick={() => setTemplateSource("north")}>North</button></div>
          <div className="filter-label">BODY AREA OR STYLE</div>
          <div className="picker-filters">{workoutFocuses.map((focus) => <button key={focus} className={templateFocus === focus ? "active" : ""} onClick={() => setTemplateFocus(focus)}>{focus}</button>)}</div>
          <div className="filter-label">GOAL</div>
          <div className="picker-filters">{workoutGoals.map((goal) => <button key={goal} className={templateGoal === goal ? "active" : ""} onClick={() => setTemplateGoal(goal)}>{goal}</button>)}</div>
          <div className="filter-label">LEVEL</div>
          <div className="picker-filters">{workoutLevels.map((level) => <button key={level} className={templateLevel === level ? "active" : ""} onClick={() => setTemplateLevel(level)}>{level}</button>)}</div>
          <div className="filter-label">TIME</div>
          <div className="picker-filters">{["All", "15", "20", "30", "45", "60", "75"].map((duration) => <button key={duration} className={templateDuration === duration ? "active" : ""} onClick={() => setTemplateDuration(duration)}>{duration === "All" ? duration : `${duration} min`}</button>)}</div>
          <p className="result-count">{filteredTemplates.length} matching workout{filteredTemplates.length === 1 ? "" : "s"}</p>
          <section className="template-grid">
            {filteredTemplates.map((template) => <article key={template.id}><button className="template-open" onClick={() => openWorkoutTemplate(template)}><div className="template-card-top"><span>{template.source === "personal" ? "My workout" : template.focus}</span><small>{template.duration} min</small></div><strong>{template.name}</strong><p>{template.level} · {template.goal}</p><small>{template.exercises.length} exercises · {template.equipment.join(" · ")}</small></button><button className={`template-favorite ${favoriteTemplateIds.includes(template.id) ? "active" : ""}`} onClick={() => toggleFavoriteTemplate(template.id)} aria-label={`${favoriteTemplateIds.includes(template.id) ? "Remove" : "Add"} ${template.name} ${favoriteTemplateIds.includes(template.id) ? "from" : "to"} My workouts`}><Heart size={18} fill={favoriteTemplateIds.includes(template.id) ? "currentColor" : "none"} /></button><div className="template-quick-actions"><button onClick={() => openWorkoutTemplate(template)}>Preview</button><button onClick={() => applyWorkoutTemplate(template)}>Schedule</button><button onClick={() => applyWorkoutTemplate(template, true)}><Play size={13} /> Start</button></div></article>)}
            {filteredTemplates.length === 0 && <div className="empty-search"><Search size={20} /><p>No workouts match those filters.</p></div>}
          </section>
        </section>
      )}

      {screen === "workout-template" && (
        <section className="screen workout-template-screen">
          <button className="back-button" onClick={() => setScreen("workout-library")}><ArrowLeft size={17} /> Library</button>
          <p className="eyebrow">{selectedTemplate.focus.toUpperCase()} · {selectedTemplate.level.toUpperCase()}</p>
          {templateEditing && selectedTemplate.source === "personal" ? <><div className="template-title-editor"><input value={selectedTemplate.name} onChange={(event) => patchPersonalTemplate({ name: event.target.value })} aria-label="Workout name" /><textarea rows={2} value={selectedTemplate.description} onChange={(event) => patchPersonalTemplate({ description: event.target.value })} aria-label="Workout description" /></div><section className="routine-builder-settings"><label><span>Focus</span><input value={selectedTemplate.focus} onChange={(event) => patchPersonalTemplate({ focus: event.target.value })}/></label><label><span>Goal</span><select value={selectedTemplate.goal} onChange={(event) => patchPersonalTemplate({ goal: event.target.value as WorkoutTemplate["goal"] })}>{workoutGoals.filter((goal) => goal !== "All").map((goal) => <option key={goal}>{goal}</option>)}</select></label><label><span>Level</span><select value={selectedTemplate.level} onChange={(event) => patchPersonalTemplate({ level: event.target.value as WorkoutTemplate["level"] })}>{workoutLevels.filter((level) => level !== "All").map((goal) => <option key={goal}>{goal}</option>)}</select></label><label><span>Duration</span><DeferredIntegerInput value={selectedTemplate.duration} min={5} max={240} onCommit={(duration) => patchPersonalTemplate({ duration })} label="Workout duration in minutes" /></label><label><span>Location</span><select value={selectedTemplate.location} onChange={(event) => patchPersonalTemplate({ location: event.target.value as WorkoutTemplate["location"] })}><option>Gym</option><option>Home</option><option>Anywhere</option></select></label><div className="routine-equipment-field"><span>Available equipment</span><details className="equipment-multiselect"><summary>{selectedTemplate.equipment.join(" · ")}</summary><div>{exerciseEquipment.map((equipment) => <label key={equipment}><input type="checkbox" checked={selectedTemplate.equipment.includes(equipment)} onChange={() => toggleTemplateEquipment(equipment)} /><span>{equipment}</span></label>)}</div></details></div></section></> : <><h1>{selectedTemplate.name}</h1><p className="lead">{selectedTemplate.description}</p></>}
          <div className="template-owner-actions">
            {selectedTemplate.source === "personal" ? <><button onClick={() => setTemplateEditing((editing) => !editing)}><Save size={14} /> {templateEditing ? "Done editing" : "Edit workout"}</button><button onClick={() => copyToPersonal(selectedTemplate)}><Copy size={14} /> Duplicate</button></> : <button onClick={() => { copyToPersonal(selectedTemplate); setTemplateEditing(true); }}><Plus size={14} /> Save and customize</button>}
          </div>
          <section className="template-metrics"><div><span>TIME</span><strong>{selectedTemplate.duration} min</strong></div><div><span>GOAL</span><strong>{selectedTemplate.goal}</strong></div><div><span>PLACE</span><strong>{selectedTemplate.location}</strong></div></section>
          <p className="equipment-line"><strong>Equipment:</strong> {selectedTemplate.equipment.join(", ")}</p>
          <section className="template-exercises">
            {selectedTemplate.exercises.map((exercise, index) => { const definition = exerciseLibrary.find((item) => item.name === exercise.exerciseName); return <article key={`${exercise.exerciseName}-${index}`} className={templateEditing ? "editing" : ""}><span>{String(index + 1).padStart(2, "0")}</span>{templateEditing && selectedTemplate.source === "personal" ? <div className="template-exercise-editor"><div className="routine-movement-name"><strong>{exercise.exerciseName}</strong><small>{definition ? `${definition.category} · ${definition.equipment} · ${definition.movementPattern}` : "Choose a library movement"}</small></div><div><label>Sets<DeferredIntegerInput value={exercise.sets} min={1} max={10} onCommit={(sets) => patchTemplateExercise(index, { sets })} label={`${exercise.exerciseName} sets`} /></label><label>Reps<input value={exercise.reps} onChange={(event) => patchTemplateExercise(index, { reps: event.target.value })} /></label><label>Rest<DeferredIntegerInput value={exercise.rest} min={0} max={600} onCommit={(rest) => patchTemplateExercise(index, { rest })} label={`${exercise.exerciseName} rest seconds`} /></label></div><div className="template-row-actions"><button onClick={() => moveTemplateExercise(index, -1)} disabled={index === 0}>↑</button><button onClick={() => moveTemplateExercise(index, 1)} disabled={index === selectedTemplate.exercises.length - 1}>↓</button><button onClick={() => removeTemplateExercise(index)} disabled={selectedTemplate.exercises.length === 1}><Trash2 size={13} /></button></div></div> : <div><strong>{exercise.exerciseName}</strong><small>{exercise.sets} sets · {exercise.reps}{exercise.reps.includes("sec") ? "" : " reps"} · {exercise.rest}s rest</small></div>}</article>; })}
          </section>
          {templateEditing && selectedTemplate.source === "personal" && <><button className="add-template-row" onClick={() => setBuilderPickerOpen((open) => !open)}>{builderPickerOpen ? <X size={14} /> : <Plus size={14} />} {builderPickerOpen ? "Close exercise picker" : "Find and add exercises"}</button>{builderPickerOpen && <section className="routine-exercise-picker"><label className="search-field"><Search size={17}/><input value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder={`Search ${exerciseLibrary.length} exercises`} /></label><div className="filter-label">BODY AREA</div><div className="picker-filters">{exerciseCategories.map((category) => <button key={category} className={exerciseCategory === category ? "active" : ""} onClick={() => setExerciseCategory(category)}>{category}</button>)}</div><div className="filter-label">EQUIPMENT</div><div className="picker-filters">{exerciseEquipment.map((equipment) => <button key={equipment} className={exerciseEquipmentFilter === equipment ? "active" : ""} onClick={() => setExerciseEquipmentFilter(equipment)}>{equipment}</button>)}</div><p className="result-count">{filteredLibrary.length} matching movement{filteredLibrary.length === 1 ? "" : "s"}</p><div className="routine-picker-results">{filteredLibrary.slice(0, 80).map((definition) => { const added = selectedTemplate.exercises.some((exercise) => exercise.exerciseName === definition.name); return <button key={definition.name} disabled={added} onClick={() => addTemplateExercise(definition)}><span><strong>{definition.name}</strong><small>{definition.category} · {definition.equipment} · {definition.target}</small></span>{added ? <Check size={17}/> : <Plus size={17}/>}</button>; })}</div></section>}<p className="routine-save-state"><Check size={14}/>{builderStatus || "Every change saves automatically to My Workouts."}</p>{selectedTemplateIssues.length > 0 && <div className="routine-validation">{selectedTemplateIssues.map((issue) => <p key={issue}>{issue}</p>)}</div>}</>}
          <p className="apply-day-note">Add this to {selectedPlanDay.label}, {formatSessionDate(`${selectedPlanDay.date}T12:00:00`)}. You can edit every movement before starting.</p>
          <button className="primary-button" disabled={selectedTemplateIssues.length > 0} onClick={() => addTemplateToSelectedDay(true)}>Use and prepare now <Play size={16} /></button>
          <button className="secondary-button" disabled={selectedTemplateIssues.length > 0} onClick={() => addTemplateToSelectedDay(false)}>Add to selected day</button>
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
          <div className="nova-page-heading"><div><p className="eyebrow">NOVA</p><h1>Let’s figure it out together.</h1></div>{novaMessages.length > 0 && <button onClick={clearNovaConversation}>Clear conversation</button>}</div>
          <div className="nova-line living" />
          <section className="conversation-surface">
            {novaMessages.length === 0 && <><div className="nova-message"><small>NOVA</small><p>{visibleLearnedInsights[0]?.novaPrompt ?? "Memory is off or no current learned observations are available. I can still help with the plan in front of you."}</p></div><div className="nova-starters">{["What is planned today?", "How does my week look?", "Help me reflect on this week", activeProgram ? `Adjust my program to ${Math.max(2, activeProgram.daysPerWeek - 1)} days a week` : "Am I ready to progress?", "I’m sore and low on energy"].map((prompt) => <button key={prompt} onClick={() => sendToNova(prompt)}>{prompt}</button>)}</div></>}
            {novaMessages.map((message) => <article className={message.role === "user" ? "user-message" : "nova-message"} key={message.id}><small>{message.role === "user" ? "YOU" : "NOVA"}<time>{new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit" }).format(new Date(message.createdAt))}</time></small><p>{message.text}</p>{message.role === "nova" && message.evidence?.length ? <details className="nova-evidence"><summary>Evidence and limits <span>{message.confidence} confidence</span></summary><ul>{message.evidence.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}{message.proposal && <section className={`nova-proposal ${message.appliedAt && !message.undoneAt ? "applied" : message.undoneAt ? "undone" : ""}`}><header><span>{message.appliedAt && !message.undoneAt ? <Check size={15} /> : message.undoneAt ? <RotateCcw size={15} /> : <SlidersHorizontal size={15} />}</span><div><small>PROPOSED PLAN CHANGE</small><strong>{message.proposal.summary}</strong></div></header><div className="nova-plan-compare"><div><span>BEFORE</span><strong>{message.proposal.before.title}</strong><small>{message.proposal.before.kind}{message.proposal.before.workout ? ` · ${message.proposal.before.workout.length} exercises · ${message.proposal.before.workout.reduce((sum, exercise) => sum + exercise.sets.length, 0)} sets` : ""}</small></div><ArrowRight size={16} /><div><span>AFTER</span><strong>{message.proposal.after.title}</strong><small>{message.proposal.after.kind}{message.proposal.after.workout ? ` · ${message.proposal.after.workout.length} exercises · ${message.proposal.after.workout.reduce((sum, exercise) => sum + exercise.sets.length, 0)} sets` : ""}</small></div></div>{!message.appliedAt || message.undoneAt ? <div className="nova-proposal-actions"><button onClick={() => correctNovaProposal(message)}>Correct it</button><button onClick={() => applyNovaProposal(message)} disabled={Boolean(message.undoneAt)}>Confirm change</button></div> : <div className="nova-proposal-actions"><span>Applied to {message.proposal.before.label}</span><button onClick={() => undoNovaProposal(message)}><RotateCcw size={13} /> Undo</button></div>}</section>}{message.programProposal && <section className={`nova-proposal ${message.appliedAt && !message.undoneAt ? "applied" : message.undoneAt ? "undone" : ""}`}><header><span><MapIcon size={15} /></span><div><small>PROPOSED PROGRAM CHANGE</small><strong>{message.programProposal.summary}</strong></div></header><div className="nova-plan-compare"><div><span>BEFORE</span><strong>{message.programProposal.beforeProgram.daysPerWeek} days</strong><small>{message.programProposal.beforeProgram.duration} minutes · {message.programProposal.beforeProgram.trainingDayIndexes.map((index) => message.programProposal!.beforePlan[index].label).join(" · ")}</small></div><ArrowRight size={16} /><div><span>AFTER</span><strong>{message.programProposal.afterProgram.daysPerWeek} days</strong><small>{message.programProposal.afterProgram.duration} minutes · {message.programProposal.afterProgram.trainingDayIndexes.map((index) => message.programProposal!.afterPlan[index].label).join(" · ")}</small></div></div>{!message.appliedAt || message.undoneAt ? <div className="nova-proposal-actions"><button onClick={() => correctNovaProposal(message)}>Correct it</button><button onClick={() => applyNovaProgramProposal(message)} disabled={Boolean(message.undoneAt)}>Confirm program change</button></div> : <div className="nova-proposal-actions"><span>Program and week updated</span><button onClick={() => undoNovaProgramProposal(message)}><RotateCcw size={13} /> Undo</button></div>}</section>}{message.action && !message.proposal && !message.programProposal && <button className="nova-tool-action" onClick={() => followNovaAction(message.action)}>{message.actionLabel}<ArrowRight size={14} /></button>}</article>)}
            {novaThinking && <div className="nova-thinking"><BrandLoader label="Nova is checking your North records…" /></div>}
            {novaError && <div className="nova-error" role="alert"><span>{novaError}</span><button onClick={() => { const last = [...novaMessages].reverse().find((message) => message.role === "user"); if (last) sendToNova(last.text); }}>Retry</button></div>}
          </section>
          <div className="nova-input"><input value={novaInput} disabled={novaThinking} onChange={(event) => setNovaInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendToNova()} placeholder="Ask about today, recovery, or your week" /><button disabled={novaThinking || !novaInput.trim()} onClick={() => sendToNova()} aria-label="Send to Nova"><Send size={18} /></button></div>
          <p className="nova-safety-note">Nova supports training decisions from your saved records. It does not diagnose injuries or replace medical care.</p>
        </section>
      )}

      {screen === "account" && (
        <section className="screen destination-screen account-screen">
          <button className="back-button" onClick={() => setScreen("you")}><ArrowLeft size={17} /> You</button>
          <header className="account-screen-header"><span><UserRound size={26} /></span><div><p className="eyebrow">ACCOUNT</p><h1>Your North.</h1><p>Sign-in, sync, and trusted devices live here—not in your personal story.</p></div></header>
          {readNorthSession() && <section className="account-panel"><div className="account-identity"><span><UserRound size={19} /></span><div><strong>{readNorthSession()?.user.displayName}</strong><small>@{readNorthSession()?.user.username} · synced account</small></div>{readNorthSession()?.user.username === "druwbi" && <a href="/admin">Owner console</a>}</div><div className="account-device-list">{accountDevices.map((device) => <article key={device.id}><span className={device.id === currentDeviceId ? "current" : ""}><Database size={16} /></span><div><strong>{device.name}{device.id === currentDeviceId ? " · This device" : ""}</strong><small>Last active {formatSessionDate(device.last_seen_at)} · {device.active_sessions} active session{device.active_sessions === 1 ? "" : "s"}</small></div>{device.revoked_at ? <b>Signed out</b> : <button onClick={() => void revokeAccountDevice(device)}>Sign out</button>}</article>)}</div>{accountStatus && <p className="account-status" role="status">{accountStatus}</p>}<button className="account-signout" onClick={signOutAccount}>Sign out of this device</button></section>}
          <section className="account-menu-grid"><button onClick={() => setScreen("settings")}><SlidersHorizontal size={19}/><span><strong>App settings & preferences</strong><small>Units, coaching, privacy, installation and sharing</small></span><ArrowRight size={15}/></button><button onClick={() => void runAccountSync()}><RotateCcw size={19}/><span><strong>Sync & devices</strong><small>{lastSyncedAt ? `Last synced ${formatSessionDate(lastSyncedAt)}` : "Keep every device current"}</small></span><ArrowRight size={15}/></button></section>
          {healthSummary && healthSummary.types.length > 0 && <section className="health-summary-card"><header><div><p className="eyebrow">CONNECTED SERVICES</p><h2>Samsung Health</h2><p>{healthSummary.types.reduce((sum, item) => sum + item.records, 0).toLocaleString()} imported records. Wearable development remains paused while the core app is rebuilt.</p></div><HeartPulse size={24} /></header></section>}
        </section>
      )}

      {screen === "settings" && (
        <section className="screen destination-screen settings-screen">
          <button className="back-button" onClick={() => setScreen(readNorthSession() ? "account" : "you")}><ArrowLeft size={17}/>{readNorthSession() ? "Account" : "You"}</button><p className="eyebrow">APP SETTINGS</p><h1>Make North yours.</h1><p className="lead">Your measurements, coaching, accessibility, privacy and app controls.</p>
          <div className="section-heading"><div><p className="eyebrow">NORTH APP</p><h2>Keep North close</h2></div></div>
          <section className="install-app-card"><span><Download size={20} /></span><div><p className="eyebrow">NORTH ON YOUR PHONE</p><h2>{window.matchMedia("(display-mode: standalone)").matches ? "Installed and ready." : "Install North as an app."}</h2><p>Launch from your home screen in a clean full-screen window. Your account and synchronized plan remain the same.</p>{installStatus && <small role="status">{installStatus}</small>}</div><button onClick={() => void installNorth()}>{window.matchMedia("(display-mode: standalone)").matches ? "Installed" : "Install North"}</button></section>
          <section className="share-north-card"><span><Share2 size={22} /></span><div><p className="eyebrow">BRING SOMEONE WITH YOU</p><h2>Recommend North</h2><p>Send a thoughtful “try this out” link to someone who would value a steadier training practice.</p>{shareStatus && <small role="status">{shareStatus}</small>}</div><button onClick={() => void shareNorth()}><Share2 size={17} /> Share North</button></section>
          <div className="section-heading"><div><p className="eyebrow">MEASUREMENTS & COACHING</p><h2>Independent preferences</h2></div></div><section className="preference-panel"><label><span>Lifting weight</span><select value={profile.units} onChange={(event) => setProfile((value) => ({ ...value, units: event.target.value as ProfileSettings["units"] }))}><option value="imperial">Pounds (lb)</option><option value="metric">Kilograms (kg)</option></select></label><label><span>Body weight</span><select value={profile.bodyWeightUnit} onChange={(event) => setProfile((value) => ({ ...value, bodyWeightUnit: event.target.value as ProfileSettings["bodyWeightUnit"] }))}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></label><label><span>Distance</span><select value={profile.distanceUnit} onChange={(event) => setProfile((value) => ({ ...value, distanceUnit: event.target.value as ProfileSettings["distanceUnit"] }))}><option value="mi">Miles</option><option value="km">Kilometres</option></select></label><label><span>Language</span><select value={profile.language} onChange={(event) => setProfile((value) => ({ ...value, language: event.target.value }))}><option>English</option><option>English (UK)</option><option>French</option><option>Spanish</option></select></label><label><span>Coaching tone</span><select value={profile.tone} onChange={(event) => setProfile((value) => ({ ...value, tone: event.target.value }))}><option>Encouraging and direct</option><option>Quiet and concise</option><option>Detailed and educational</option></select></label><label className="toggle-setting"><div><strong>Notifications</strong><small>Preference saved; delivery begins only after permission is granted.</small></div><input type="checkbox" checked={profile.notifications} onChange={(event) => setProfile((value) => ({ ...value, notifications: event.target.checked }))}/></label></section>
          <div className="section-heading"><div><p className="eyebrow">ACCESSIBILITY</p><h2>Comfort and clarity</h2></div></div><section className="preference-panel"><label className="toggle-setting"><div><strong>Reduce motion</strong><small>Turns off decorative transitions and animation.</small></div><input type="checkbox" checked={profile.reducedMotion} onChange={(event) => setProfile((value) => ({ ...value, reducedMotion: event.target.checked }))}/></label><label className="toggle-setting"><div><strong>Larger text</strong><small>Increases base interface text size.</small></div><input type="checkbox" checked={profile.largeText} onChange={(event) => setProfile((value) => ({ ...value, largeText: event.target.checked }))}/></label><label className="toggle-setting"><div><strong>Higher contrast</strong><small>Strengthens borders and secondary text.</small></div><input type="checkbox" checked={profile.highContrast} onChange={(event) => setProfile((value) => ({ ...value, highContrast: event.target.checked }))}/></label></section>
          <div className="section-heading"><div><p className="eyebrow">PRIVACY & SERVICES</p><h2>Nothing connects silently</h2></div></div><section className="privacy-panel"><div><strong>Local-first data</strong><p>Workouts, photos, preferences and memories remain account-private.</p></div><div><strong>Connected services</strong><p>Health access is granted category by category and can be revoked.</p><section className="service-controls"><button className={healthConnections.some((item) => item.provider === "health_connect" && item.status === "connected") ? "connected" : ""} onClick={() => { window.location.href = "intent://connect#Intent;scheme=northhealth;package=io.bodhix.north.health;S.browser_fallback_url=https%3A%2F%2Fnorth.bodhix.io%2Fnorth-health.apk;end"; }}><span>Samsung Health · Health Connect</span><small>{healthConnections.find((item) => item.provider === "health_connect")?.status === "connected" ? `Connected · last sync ${formatSessionDate(healthConnections.find((item) => item.provider === "health_connect")?.last_sync_at)}` : "Not connected"}</small></button><button disabled><span>Apple Health</span><small>Deferred</small></button></section></div><div><strong>Help & support</strong><p>Replay the product tour or record a gym-floor issue.</p><button className="replay-tour-button" onClick={replayProductTour}><Compass size={15}/> Replay the North tour</button></div></section>
          <div className="section-heading"><div><p className="eyebrow">YOUR DATA</p><h2>Ownership and recovery</h2></div></div><section className="data-controls"><button onClick={exportNorthData}><Download size={18}/><div><strong>Export North backup</strong><small>{history.length} workouts · {activities.length} activities · {checkIns.length} check-ins</small></div><ArrowRight size={15}/></button><label><Upload size={18}/><div><strong>Restore a backup</strong><small>Replace this browser’s North data from a backup file</small></div><ArrowRight size={15}/><input type="file" accept="application/json,.json" onChange={importNorthData}/></label><button className="reset-data" onClick={resetNorthData}><Database size={18}/><div><strong>Erase local data</strong><small>Remove workouts, plans, activities and check-ins</small></div><ArrowRight size={15}/></button></section>{dataStatus && <p className="data-status">{dataStatus}</p>}<button className="test-log-link" onClick={() => openTestLog("settings")}><NotebookPen size={18}/><div><strong>Gym test notes</strong><small>{testNotes.filter((item) => !item.resolved).length} open observations</small></div><ArrowRight size={15}/></button>
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
            <div className="body-status-card"><div><small>CURRENT WEIGHT</small><strong>{latestBodyWeight === null ? "Add a check-in" : `${latestBodyWeight.toFixed(1)} ${bodyWeightUnit}`}</strong><span>{bodyWeightChange === null ? `${bodyWeightCheckIns.length} recorded check-in${bodyWeightCheckIns.length === 1 ? "" : "s"}` : `${bodyWeightChange > 0 ? "+" : ""}${bodyWeightChange.toFixed(1)} ${bodyWeightUnit} since first record`}</span></div><label><span>HEIGHT</span><input value={profile.height} onChange={(event) => setProfile((value) => ({ ...value, height: event.target.value }))} placeholder="Add height" aria-label="Height" /></label></div>
            <div className="personal-record-grid"><article><strong>{history.length}</strong><span>workouts</span></article><article><strong>{recordedSets}</strong><span>working sets</span></article><article><strong>{recordedVolume ? `${Math.round(displayWeight(recordedVolume)).toLocaleString()} ${weightUnit}` : "—"}</strong><span>volume</span></article><article><strong>{personalRecords.length}</strong><span>personal bests</span></article></div>
          </section>
          <section className="direction-statement"><div className="direction-heading"><p className="eyebrow">YOUR DIRECTION</p><button onClick={() => setProfileEditing((editing) => !editing)}>{profileEditing ? "Done" : "Edit"}</button></div>{profileEditing ? <div className="profile-editor"><label><span>Name</span><input value={profile.name} onChange={(event) => setProfile((value) => ({ ...value, name: event.target.value }))} placeholder="What should North call you?" /></label><label><span>Direction</span><textarea rows={3} value={profile.direction} onChange={(event) => setProfile((value) => ({ ...value, direction: event.target.value }))} /></label><div><label><span>Training rhythm</span><select value={profile.trainingDays} onChange={(event) => setProfile((value) => ({ ...value, trainingDays: Number(event.target.value) }))}>{[2,3,4,5,6].map((days) => <option key={days} value={days}>{days} days / week</option>)}</select></label><label><span>Target date</span><input type="date" value={profile.targetDate} onChange={(event) => setProfile((value) => ({ ...value, targetDate: event.target.value }))} /></label></div></div> : <><h2>{profile.direction}</h2><small>{profile.trainingDays} planned training days per week{profile.targetDate ? ` · target ${formatSessionDate(`${profile.targetDate}T12:00:00`)}` : ""} · Chapter {Math.floor(unlockedMilestones.length / 4) + 1}</small></>}</section>
          {earnedIdentities.length > 0 && <section className="earned-identities"><p className="eyebrow">QUIETLY EARNED</p><div>{earnedIdentities.map((identity) => <span key={identity}>{identity}</span>)}</div></section>}
          <div className="section-heading"><div><p className="eyebrow">WHAT NORTH HAS LEARNED</p><h2>A clearer picture of you</h2></div></div>
          <section className="memory-controls"><label><div><strong>Permissioned memory</strong><small>{profile.memoryEnabled ? "North may surface observations derived from your records." : "Learned observations are hidden from North and Nova."}</small></div><input type="checkbox" checked={profile.memoryEnabled} onChange={(event) => setProfile((value) => ({ ...value, memoryEnabled: event.target.checked }))} /></label>{profile.memoryEnabled && visibleLearnedInsights.map((insight) => <article key={insight.id}><span>{insight.icon}</span><div><strong>{insight.title}</strong><small>{profile.memoryCorrections[insight.id] || insight.summary}</small><p>{insight.evidence}</p><input value={profile.memoryCorrections[insight.id] ?? ""} onChange={(event) => setProfile((value) => ({ ...value, memoryCorrections: { ...value.memoryCorrections, [insight.id]: event.target.value } }))} placeholder="Correct how North describes this…" /></div><button onClick={() => setProfile((value) => ({ ...value, dismissedInsights: [...value.dismissedInsights, insight.id] }))}>Forget</button></article>)}{profile.dismissedInsights.length > 0 && <button className="restore-memory" onClick={() => setProfile((value) => ({ ...value, dismissedInsights: [] }))}>Restore {profile.dismissedInsights.length} forgotten observation{profile.dismissedInsights.length === 1 ? "" : "s"}</button>}</section>
          <div className="section-heading"><div><p className="eyebrow">ACCOUNT & APP</p><h2>Keep North close</h2></div></div>
          <section className="account-menu-grid you-account-menu"><button onClick={() => setScreen("settings")}><SlidersHorizontal size={19}/><span><strong>App settings</strong><small>Preferences, privacy, installation and sharing</small></span><ArrowRight size={15}/></button>{readNorthSession() && <button onClick={() => setScreen("account")}><UserRound size={19}/><span><strong>Account & devices</strong><small>Sync, connected devices and sign-in</small></span><ArrowRight size={15}/></button>}</section>
          <div className="section-heading"><div><p className="eyebrow">PERSONALISATION</p><h2>How North meets you</h2></div></div><section className="preference-panel"><label><span>Lifting weight</span><select value={profile.units} onChange={(event) => setProfile((value) => ({ ...value, units: event.target.value as ProfileSettings["units"] }))}><option value="imperial">Pounds (lb)</option><option value="metric">Kilograms (kg)</option></select></label><label><span>Body weight</span><select value={profile.bodyWeightUnit} onChange={(event) => setProfile((value) => ({ ...value, bodyWeightUnit: event.target.value as ProfileSettings["bodyWeightUnit"] }))}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></label><label><span>Distance</span><select value={profile.distanceUnit} onChange={(event) => setProfile((value) => ({ ...value, distanceUnit: event.target.value as ProfileSettings["distanceUnit"] }))}><option value="mi">Miles</option><option value="km">Kilometres</option></select></label><label><span>Language</span><select value={profile.language} onChange={(event) => setProfile((value) => ({ ...value, language: event.target.value }))}><option>English</option><option>English (UK)</option><option>French</option><option>Spanish</option></select></label><label><span>Coaching tone</span><select value={profile.tone} onChange={(event) => setProfile((value) => ({ ...value, tone: event.target.value }))}><option>Encouraging and direct</option><option>Quiet and concise</option><option>Detailed and educational</option></select></label><label className="toggle-setting"><div><strong>Notifications</strong><small>Preference saved; delivery begins when accounts and notification permission are implemented.</small></div><input type="checkbox" checked={profile.notifications} onChange={(event) => setProfile((value) => ({ ...value, notifications: event.target.checked }))} /></label></section>
          <div className="section-heading"><div><p className="eyebrow">ACCESSIBILITY</p><h2>Comfort and clarity</h2></div></div><section className="preference-panel"><label className="toggle-setting"><div><strong>Reduce motion</strong><small>Turns off decorative transitions and animation.</small></div><input type="checkbox" checked={profile.reducedMotion} onChange={(event) => setProfile((value) => ({ ...value, reducedMotion: event.target.checked }))} /></label><label className="toggle-setting"><div><strong>Larger text</strong><small>Increases base interface text size.</small></div><input type="checkbox" checked={profile.largeText} onChange={(event) => setProfile((value) => ({ ...value, largeText: event.target.checked }))} /></label><label className="toggle-setting"><div><strong>Higher contrast</strong><small>Strengthens borders and secondary text.</small></div><input type="checkbox" checked={profile.highContrast} onChange={(event) => setProfile((value) => ({ ...value, highContrast: event.target.checked }))} /></label></section>
          <div className="section-heading"><div><p className="eyebrow">PRIVACY & SERVICES</p><h2>Nothing connects silently</h2></div></div><section className="privacy-panel"><div><strong>Local-first data</strong><p>Workouts, photos, preferences, and memories remain account-private. Weather coordinates are sent only to Open-Meteo when you request weather and are not saved by North.</p></div><div><strong>Connected services</strong><p>Health access is granted on the phone, category by category. North records scopes, source apps, last sync, pause and revocation state.</p><section className="service-controls"><button className={healthConnections.some((item) => item.provider === "health_connect" && item.status === "connected") ? "connected" : ""} onClick={() => { window.location.href = "intent://connect#Intent;scheme=northhealth;package=io.bodhix.north.health;S.browser_fallback_url=https%3A%2F%2Fnorth.bodhix.io%2Fnorth-health.apk;end"; }}><span>Samsung Health · Health Connect</span><small>{healthConnections.find((item) => item.provider === "health_connect")?.status === "connected" ? `Connected · last sync ${formatSessionDate(healthConnections.find((item) => item.provider === "health_connect")?.last_sync_at)} · Tap to sync` : "Tap to connect through the North Health app"}</small></button><button disabled><span>Apple Health</span><small>Not connected · iPhone bridge next</small></button><button disabled><span>Strava</span><small>Not connected</small></button></section></div><div><strong>Help & support</strong><p>Use Gym test notes to preserve confusing, slow, missing, or broken moments. Emergency and medical guidance are outside North’s role.</p><button className="replay-tour-button" onClick={replayProductTour}><Compass size={15} /> Replay the North tour</button></div></section>
          <div className="section-heading"><div><p className="eyebrow">YOUR DATA</p><h2>Ownership and recovery</h2></div></div>
          <section className="data-controls">
            <button onClick={exportNorthData}><Download size={18} /><div><strong>Export North backup</strong><small>{history.length} workouts · {activities.length} activities · {checkIns.length} check-ins</small></div><ArrowRight size={15} /></button>
            <label><Upload size={18} /><div><strong>Restore a backup</strong><small>Replace this browser’s North data from a backup file</small></div><ArrowRight size={15} /><input type="file" accept="application/json,.json" onChange={importNorthData} /></label>
            <button className="reset-data" onClick={resetNorthData}><Database size={18} /><div><strong>Erase local data</strong><small>Remove workouts, plans, activities, and check-ins</small></div><ArrowRight size={15} /></button>
          </section>
          {dataStatus && <p className="data-status">{dataStatus}</p>}
          <button className="test-log-link" onClick={() => openTestLog("you")}><NotebookPen size={18} /><div><strong>Gym test notes</strong><small>{testNotes.filter((item) => !item.resolved).length} open observations</small></div><ArrowRight size={15} /></button>
        </section>
      )}

      {screen === "exercise-detail" && current && (() => {
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
        return <section className="screen exercise-detail-screen">
          <header className="exercise-detail-nav"><button className="back-button" onClick={() => setScreen(exerciseDetailReturn)}><ArrowLeft size={18} /> Workout</button><div><button className={favoriteExerciseNames.includes(current.name) ? "active" : ""} onClick={() => setFavoriteExerciseNames((names) => names.includes(current.name) ? names.filter((name) => name !== current.name) : [...names, current.name])} aria-label={`${favoriteExerciseNames.includes(current.name) ? "Remove" : "Add"} ${current.name} ${favoriteExerciseNames.includes(current.name) ? "from" : "to"} favourites`}><Heart size={20} fill={favoriteExerciseNames.includes(current.name) ? "currentColor" : "none"}/></button><button onClick={() => document.getElementById("exercise-technique")?.scrollIntoView({ behavior: profile.reducedMotion ? "auto" : "smooth" })} aria-label="Open exercise technique"><SlidersHorizontal size={20} /></button></div></header>
          <section className="exercise-identity"><span><Dumbbell size={25} /></span><div><p className="eyebrow">EXERCISE PROFILE</p><h1>{current.name}</h1><div>{[definition?.movementPattern, definition?.category, definition?.equipment].filter(Boolean).map((tag, index) => <b className={`tag-${index}`} key={tag}>{tag}</b>)}</div></div></section>
          <section className="exercise-demo-card"><div className="exercise-demo-tabs"><button className="active"><Play size={15} /> Demo</button><button onClick={() => document.getElementById("exercise-technique")?.scrollIntoView({ behavior: profile.reducedMotion ? "auto" : "smooth" })}>Technique</button><button onClick={() => document.getElementById("exercise-muscles")?.scrollIntoView({ behavior: profile.reducedMotion ? "auto" : "smooth" })}>Muscles</button></div>{exerciseDemo ? <img src={exerciseDemo} alt={exerciseMedia?.alt ?? `Start and finish demonstration for ${current.name}`} /> : <div className="exercise-demo-fallback"><span><Dumbbell size={42}/></span><strong>Technique guide ready</strong><p>{exerciseMedia ? "This priority demonstration is at the form-review gate." : "A verified start-and-finish demonstration has not been published yet."} North will never show the wrong movement as a placeholder.</p></div>}<div className="exercise-demo-caption"><span>01</span><p><strong>{exerciseDemo ? "Controlled start and finish" : "Read the movement before loading"}</strong><small>{definition?.equipment ?? "Equipment"} · {definition?.movementPattern ?? "Controlled movement"}</small></p>{exerciseDemo && <button aria-label="Play demonstration"><Play size={18} /></button>}</div></section>
          <section className="exercise-muscle-card" id="exercise-muscles"><header><div><p className="eyebrow">MUSCLE ACTIVATION</p><h2>What does the work</h2></div><div><button className={muscleView === "primary" ? "active" : ""} onClick={() => setMuscleView("primary")}>Primary</button><button className={muscleView === "all" ? "active" : ""} onClick={() => setMuscleView("all")}>All</button></div></header><AnatomyMap {...getMuscleActivation(definition)} visibility={muscleView} /></section>
          <section className="exercise-performance-card"><header><div><p className="eyebrow">YOUR PERFORMANCE</p><h2>Your numbers</h2></div>{progressRecord?.bestWeight ? <span><TrendingUp size={15}/> PR TRACKED</span> : null}</header><div className="performance-kpis"><article><small>LAST TIME</small><strong>{latestSet?.weight ? `${displayWeight(latestSet.weight).toFixed(1)} ${weightUnit}` : "—"}</strong><span>{latestSet?.reps ? `${latestSet.reps} reps` : "No result yet"}</span></article><article className="pr"><small>PERSONAL BEST</small><strong>{progressRecord?.bestWeight ? `${displayWeight(progressRecord.bestWeight).toFixed(1)} ${weightUnit}` : "—"}</strong><span>{progressRecord?.sets ?? 0} sets logged</span></article><article><small>SESSIONS</small><strong>{completedForExercise.length}</strong><span>times performed</span></article></div>{performancePoints.length > 0 ? <div className="mini-strength-chart" aria-label={`Recent ${current.name} working-weight trend`}>{performancePoints.map((point, index) => <i key={`${point}-${index}`} style={{ height: `${Math.max(12, Math.round(point / performancePeak * 100))}%` }}/>)}</div> : <p className="exercise-no-history">Complete this movement to begin its personal trend.</p>}</section>
          <section className="exercise-prescription-card"><header><div><p className="eyebrow">TODAY'S PRESCRIPTION</p><h2>{current.sets.length} working sets</h2></div><span>{current.target}</span></header>{current.sets.map((set, index) => <article key={`${current.id}-detail-${index}`}><span>{index + 1}</span><div><small>TODAY</small><strong>{set.weight ? `${displayWeight(set.weight).toFixed(1)} ${weightUnit}` : `Choose ${weightUnit}`} × {set.reps || prescribedResult(current.target)}</strong></div><div><small>LAST TIME</small><strong>{latestSet?.weight ? `${displayWeight(latestSet.weight).toFixed(1)} × ${latestSet.reps}` : "—"}</strong></div></article>)}<button className="primary-button" onClick={() => setScreen(exerciseDetailReturn)}>Back to workout <ArrowRight size={17}/></button></section>
          <section className="exercise-coaching-card"><span><Sparkles size={20}/></span><div><p className="eyebrow">NOVA'S TIP</p><h3>Control down. Drive up.</h3><p>{current.cue}</p></div></section>
          <section className="exercise-technique-card" id="exercise-technique"><header><p className="eyebrow">TECHNIQUE</p><h2>Make every rep repeatable</h2></header><div className="technique-columns"><article><strong>SETUP</strong><ol>{guidance.setup.map((step) => <li key={step}>{step}</li>)}</ol></article><article><strong>EXECUTION</strong><ol>{guidance.execution.map((step) => <li key={step}>{step}</li>)}</ol></article></div><article className="breathing-cue"><strong>BREATHING</strong><p>{guidance.breathing}</p></article><article className="common-mistakes"><strong>COMMON MISTAKES</strong><ul>{guidance.mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul></article><aside><strong>SAFETY</strong><p>{definition?.safetyNote ?? "Use a controlled range you can own. Stop for sharp pain, dizziness, numbness, or sudden loss of control."}</p></aside></section>
          <button className="exercise-alternative-button" onClick={() => { setScreen(exerciseDetailReturn); setEditingExerciseId(current.id); }}><RotateCcw size={18}/><div><strong>Equipment busy?</strong><small>See safe alternatives for today</small></div><ArrowRight size={17}/></button>
        </section>;
      })()}

      {screen === "prepare" && (
        <section className="screen">
          <button className="back-button" onClick={leavePreparation}><ArrowLeft size={17} /> {session.addedLater ? "Journey" : "Training"}</button>
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
                    <small>Last time: {previousPerformance(exercise)}</small>
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
            </section>
          )}
          <button className="primary-button sticky-action" onClick={beginWorkout}>Start workout <Play size={17} fill="currentColor" /></button>
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

          <section className="previous-strip">
            <span>LAST TIME</span>
            <strong>{previousPerformance(current)}</strong>
          </section>

          <section className="cue"><Compass size={18} /><p>{current.cue}</p></section>
          {substitutionsFor(current.name).length > 0 && <section className="live-alternatives"><button onClick={() => setEditingExerciseId((value) => value === current.id ? null : current.id)}><RotateCcw size={14} /> Equipment busy? See alternatives <ChevronDown size={14} /></button>{editingExerciseId === current.id && <div>{substitutionsFor(current.name).map((name) => <button key={name} onClick={() => { substituteExercise(current.id, name); setEditingExerciseId(null); }}>{name}<ArrowRight size={13} /></button>)}</div>}</section>}

          <div className="sets-table">
            <div className="set-row set-head"><span>SET</span><span>WEIGHT</span><span>REPS</span><span>DONE</span></div>
            {current.sets.map((set, index) => (
              <Fragment key={index}><div className={`set-row ${set.complete ? "set-complete" : ""}`}>
                <strong>{index + 1}</strong>
                <div className="set-value-control weight"><button onClick={() => adjustWorkingSet(index,"weight",-1)} aria-label={`Reduce set ${index + 1} weight`}>−</button><label><DeferredUnitInput storedValue={set.weight} formatValue={displayWeight} storeValue={storeWeight} onCommit={(weight) => updateSet(index, { weight })} label={`Set ${index + 1} weight in ${weightUnit}`} /><small>{weightUnit}</small></label><button onClick={() => adjustWorkingSet(index,"weight",1)} aria-label={`Increase set ${index + 1} weight`}>+</button></div>
                <div className="set-value-control reps"><button onClick={() => adjustWorkingSet(index,"reps",-1)} aria-label={`Reduce set ${index + 1} repetitions`}>−</button><input inputMode="numeric" placeholder="—" value={set.reps} onChange={(event) => updateSet(index, { reps: event.target.value })} aria-label={`Set ${index + 1} reps`} /><button onClick={() => adjustWorkingSet(index,"reps",1)} aria-label={`Increase set ${index + 1} repetitions`}>+</button></div>
                <button className="set-check" onClick={() => updateSet(index, { complete: !set.complete })} aria-label={`Complete set ${index + 1}`}>{set.complete && <Check size={18} />}</button>
              </div><small className="set-history-hint">Set {index + 1} last time: <strong>{previousSetPerformance(current,index)}</strong></small></Fragment>
            ))}
          </div>
          <section className="gym-set-controls"><button className="complete-next-set" onClick={completeNextSet} disabled={current.sets.every((set) => set.complete)}><Check size={19}/><span><strong>{current.sets.every((set) => set.complete) ? "All sets complete" : `Complete set ${current.sets.findIndex((set) => !set.complete) + 1}`}</strong><small>One tap starts the rest timer</small></span></button><div><button onClick={addWorkingSet}><Plus size={15}/> Add set</button><button onClick={removeLastWorkingSet} disabled={current.sets.length <= 1}><Trash2 size={14}/> Remove last</button></div></section>
          <p className="recorder-status" role="status" aria-live="polite">{recorderStatus || "Every change is saved automatically."}</p>

          <label className="note-field">
            <span>Quick note</span>
            <textarea value={current.note} onChange={(event) => patchExercise(current.id, { note: event.target.value })} placeholder="How did that feel?" rows={2} />
          </label>

          {timer > 0 && (
            <section className="timer-panel">
              <div><TimerReset size={20} /><span>REST</span><strong>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</strong></div>
              <button onClick={() => setTimer((value) => Math.max(0, value - 15))} aria-label="Remove 15 seconds from rest">−15</button>
              <button onClick={() => setTimerRunning((value) => !value)}>{timerRunning ? <Pause size={18} /> : <Play size={18} />}</button>
              <button onClick={() => setTimer((value) => value + 15)} aria-label="Add 15 seconds to rest">+15</button>
              <button onClick={() => setTimer(0)}>Skip</button>
            </section>
          )}

          <div className="workout-actions">
            <button className="secondary-button" onClick={passCurrent}><SkipForward size={17} /> Pass for now</button>
            <button className="primary-button" onClick={finishExercise}>{current.sets.every((set) => set.complete) ? "Next exercise" : "Continue with logged sets"} <Check size={17} /></button>
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
              <article key={exercise.id}><header><span className={exercise.sets.every((set) => set.complete) ? "done-dot" : "open-dot"} /><div><strong>{exercise.name}</strong><small>{exercise.sets.filter((set) => set.complete).length}/{exercise.sets.length} sets completed</small></div></header><div className="review-set-receipts">{exercise.sets.map((set, index) => { const target = Number(prescribedResult(exercise.target)); const hit = set.complete && (!target || Number(set.reps) >= target); return <span className={!set.complete ? "not-done" : hit ? "hit" : "under"} key={index}><small>Set {index + 1}</small><strong>{set.complete ? `${set.weight ? `${displayWeight(set.weight).toFixed(1)} ${weightUnit}` : "Bodyweight"} × ${set.reps || "—"}` : "Not completed"}</strong><em>{set.complete ? hit ? "Target hit" : "Below target" : "Missed"}</em></span>; })}</div>{exercise.note && <blockquote>“{exercise.note}”</blockquote>}</article>
            ))}
          </section>

          <Rating label="Energy today" value={session.energy} onChange={(energy) => setSession((value) => ({ ...value, energy }))} />
          <Rating label="Session difficulty" value={session.difficulty} onChange={(difficulty) => setSession((value) => ({ ...value, difficulty }))} />
          <label className="note-field"><span>Anything worth remembering?</span><textarea rows={3} value={session.reflection} onChange={(event) => setSession((value) => ({ ...value, reflection: event.target.value }))} placeholder="What should Nova know next time?" /></label>

          <section className="nova-note review-nova"><div className="nova-label"><Compass size={14} /> NOVA</div><p>You kept the session moving and captured what happened. That gives us something real to build the next workout from.</p></section>

          {!session.finishedAt ? (
            <button className="primary-button submit-record-button" onClick={saveReview}>Submit to Nova &amp; Records <Check size={17} /></button>
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
                <div className="history-sets">
                  {exercise.sets.map((set, setIndex) => (
                    <div key={setIndex} className={!set.complete ? "incomplete" : ""}><span>Set {setIndex + 1}</span>{historyEditing ? <><DeferredUnitInput storedValue={set.weight} formatValue={displayWeight} storeValue={storeWeight} onCommit={(weight) => { const exercises = selectedHistory.exercises.map((item, index) => index === exerciseIndex ? { ...item, sets: item.sets.map((entry, position) => position === setIndex ? { ...entry, weight } : entry) } : item); updateHistorySession({ ...selectedHistory, exercises }); }} label={`${exercise.name} set ${setIndex + 1} weight in ${weightUnit}`} /><small>{weightUnit}</small><input value={set.reps} onChange={(event) => { const exercises = selectedHistory.exercises.map((item, index) => index === exerciseIndex ? { ...item, sets: item.sets.map((entry, position) => position === setIndex ? { ...entry, reps: event.target.value } : entry) } : item); updateHistorySession({ ...selectedHistory, exercises }); }} aria-label={`${exercise.name} set ${setIndex + 1} reps`} /><small>reps</small></> : <strong>{set.complete ? `${set.weight ? displayWeight(set.weight).toFixed(1) : "—"} ${weightUnit} × ${set.reps || "—"}` : "Not completed"}</strong>}</div>
                  ))}
                </div>
                {historyEditing ? <textarea rows={2} value={exercise.note} onChange={(event) => { const exercises = selectedHistory.exercises.map((item, index) => index === exerciseIndex ? { ...item, note: event.target.value } : item); updateHistorySession({ ...selectedHistory, exercises }); }} placeholder="Exercise note" /> : exercise.note && <p className="history-note">“{exercise.note}”</p>}
              </article>
            ))}
          </section>
          <section className="session-reflection"><p className="eyebrow">REFLECTION</p>{historyEditing ? <textarea rows={3} value={selectedHistory.reflection} onChange={(event) => updateHistorySession({ ...selectedHistory, reflection: event.target.value })} placeholder="What should North remember?" /> : <p>{selectedHistory.reflection || "No reflection was added for this session."}</p>}</section>
          <button className="primary-button" onClick={copyCoachReport}><Copy size={16} /> {copyStatus || "Copy for coach"}</button>
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
          <button className="back-button" onClick={() => setScreen("journey")}><ArrowLeft size={17} /> Journey</button>
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
      {activeTourStep && <div className="product-tour" role="dialog" aria-modal="true" aria-labelledby="north-tour-title"><button className="tour-scrim" onClick={closeProductTour} aria-label="Skip product tour" /><article><header><div className="onboarding-brand"><span><Compass size={21} /></span><strong>NORTH</strong></div><button onClick={closeProductTour}>Skip</button></header><div className="tour-progress" aria-label={`Tour step ${tourStep + 1} of ${productTourSteps.length}`}>{productTourSteps.map((step, index) => <i key={step.screen} className={index <= tourStep ? "active" : ""} />)}</div><span className="tour-icon">{activeTourStep.screen === "today" ? <CalendarDays /> : activeTourStep.screen === "training" ? <Dumbbell /> : activeTourStep.screen === "nova" ? <Sparkles /> : activeTourStep.screen === "journey" ? <MapIcon /> : <UserRound />}</span><p className="onboarding-kicker">{activeTourStep.eyebrow}</p><h2 id="north-tour-title">{activeTourStep.title}</h2><p>{activeTourStep.body}</p><footer>{tourStep > 0 ? <button onClick={() => { const previous = tourStep - 1; setTourStep(previous); setScreen(productTourSteps[previous].screen); }}><ArrowLeft size={15} /> Back</button> : <span />}<button onClick={advanceProductTour}>{activeTourStep.action}<ArrowRight size={16} /></button></footer></article></div>}
      {coreScreen && !activeTourStep && <BottomNav screen={screen} onNavigate={setScreen} />}
      {syncing && <aside className="north-sync-loader"><BrandLoader label="Syncing your North" compact /></aside>}
      {loginReveal && <LoginBrandReveal onDone={() => setLoginReveal(false)} />}
    </main>
  );
}

function BottomNav({ screen, onNavigate }: { screen: Screen; onNavigate: (screen: Screen) => void }) {
  const items: { id: Screen; label: string; icon: typeof CalendarDays }[] = [
    { id: "today", label: "Today", icon: CalendarDays },
    { id: "journey", label: "Journey", icon: MapIcon },
    { id: "training", label: "Training", icon: Dumbbell },
    { id: "nova", label: "Nova", icon: MessageCircle },
    { id: "you", label: "You", icon: UserRound },
  ];
  return createPortal(<nav className="bottom-nav" aria-label="Primary navigation">{items.map((item) => { const Icon = item.icon; return <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => onNavigate(item.id)}><Icon size={21} /><span>{item.label}</span></button>; })}</nav>, document.body);
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
