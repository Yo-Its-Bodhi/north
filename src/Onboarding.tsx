import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Compass, Copy, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { loginNorthAccount, NORTH_API_BASE, readNorthSession, recoverNorthAccount, registerNorthAccount, type NorthSession } from "./data/account";
import { pullNorth } from "./data/sync";

export type OnboardingResult = {
  name: string; direction: string; trainingDays: number; units: "imperial" | "metric"; tone: string;
  experience: string; duration: number; equipment: string[]; activities: string[]; memoryEnabled: boolean; trainingDayIndexes: number[];
};

type Props = { onComplete: (result: OnboardingResult) => void; onLocalPreview?: () => void };
const ONBOARDING_KEY = "north-onboarding-draft-v1";
const suggestedDays = (count: number) => ({ 2: [1, 4], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] } as Record<number, number[]>)[count] ?? [0, 2, 4];

function readDraft() {
  try { return JSON.parse(localStorage.getItem(ONBOARDING_KEY) || "{}") as Partial<OnboardingResult>; } catch { return {}; }
}

export default function Onboarding({ onComplete, onLocalPreview }: Props) {
  const existing = readNorthSession();
  const draft = readDraft();
  const [mode, setMode] = useState<"welcome" | "register" | "login" | "recover">(existing ? "register" : "welcome");
  const [session, setSession] = useState<NorthSession | null>(existing);
  const [step, setStep] = useState(existing ? (existing.recoveryCode ? 1 : 2) : 0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [name, setName] = useState(draft.name || "");
  const [recoveryCode, setRecoveryCode] = useState(existing?.recoveryCode || "");
  const [recoverySaved, setRecoverySaved] = useState(false);
  const [direction, setDirection] = useState(draft.direction || "Build strength and consistency");
  const [experience, setExperience] = useState(draft.experience || "Getting started");
  const [trainingDays, setTrainingDays] = useState(draft.trainingDays || 3);
  const [trainingDayIndexes, setTrainingDayIndexes] = useState<number[]>(draft.trainingDayIndexes || suggestedDays(draft.trainingDays || 3));
  const [duration, setDuration] = useState(draft.duration || 45);
  const [equipment, setEquipment] = useState<string[]>(draft.equipment || ["Bodyweight"]);
  const [activities, setActivities] = useState<string[]>(draft.activities || ["Strength"]);
  const [units, setUnits] = useState<"imperial" | "metric">(draft.units || "imperial");
  const [tone, setTone] = useState(draft.tone || "Encouraging and direct");
  const [memoryEnabled, setMemoryEnabled] = useState(draft.memoryEnabled ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const plan = useMemo(() => {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => ({ day, index, training: trainingDayIndexes.includes(index) }));
  }, [trainingDayIndexes]);

  const saveDraft = () => localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ name, direction, experience, trainingDays, trainingDayIndexes, duration, equipment, activities, units, tone, memoryEnabled }));
  const toggle = (value: string, values: string[], update: (next: string[]) => void) => update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);

  async function authenticate(kind: "register" | "login" | "recover") {
    setBusy(true); setError("");
    try {
      const next = kind === "register" ? await registerNorthAccount(username, password, name, accessCode) : kind === "login" ? await loginNorthAccount(username, password) : await recoverNorthAccount(username, recoveryCode, password);
      setSession(next); setName((value) => value || next.user.displayName); setRecoveryCode(next.recoveryCode || "");
      if (kind === "login") {
        const restored = await pullNorth(NORTH_API_BASE, next.accessToken);
        if (restored.restored > 0) {
          localStorage.setItem(`north-onboarding-complete:${next.user.id}`, new Date().toISOString());
          location.reload();
          return;
        }
      }
      setStep(next.recoveryCode ? 1 : 2);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "North could not complete that request."); }
    finally { setBusy(false); }
  }

  function nextStep() { saveDraft(); setStep((value) => Math.min(6, value + 1)); }
  function finish() {
    const result = { name, direction, experience, trainingDays, trainingDayIndexes, duration, equipment, activities, units, tone, memoryEnabled };
    localStorage.setItem(`north-onboarding-complete:${session?.user.id}`, new Date().toISOString());
    localStorage.removeItem(ONBOARDING_KEY);
    onComplete(result);
  }

  if (!session && step === 0) return <main className="onboarding-shell"><section className="onboarding-card auth-card">
    {mode === "welcome" ? <><div className="welcome-brand"><div className="welcome-lockup" aria-label="North"><img className="welcome-lockup-light" src="/png/transparent/footprint-clean-teal.png" alt="North" /><img className="welcome-lockup-dark" src="/png/transparent/footprint-clean-offwhite.png" alt="North" /></div><p className="welcome-tagline"><span>Find your</span> <span>direction.</span></p></div><div className="welcome-content"><p className="welcome-heading">Welcome</p><p className="onboarding-kicker">YOUR TRAINING. YOUR STORY.</p><p className="onboarding-lead">North turns your real workouts, recovery and daily life into a plan you can understand and trust.</p><div className="welcome-points"><div><Check />Plan a week that fits real life</div><div><Check />Track strength, walks, runs and rides</div><div><Check />Let Nova guide—never silently decide</div></div></div><div className="welcome-actions"><button className="onboarding-primary" onClick={() => setMode("register")}>Create your North <ArrowRight /></button><button className="onboarding-secondary" onClick={() => setMode("login")}>I already have an account</button>{onLocalPreview && <button className="onboarding-preview" onClick={onLocalPreview}>Preview locally</button>}</div></> : <>
      <div className="auth-brand-lockup"><img className="auth-brand-lockup-light" src="/png/transparent/lockup-horizontal-teal.png" alt="North" /><img className="auth-brand-lockup-dark" src="/png/transparent/lockup-horizontal-offwhite.png" alt="North" /></div>
      <button className="onboarding-back" onClick={() => setMode("welcome")}><ArrowLeft /> Back</button>
      <p className="onboarding-kicker">{mode === "register" ? "BEGIN YOUR JOURNEY" : mode === "login" ? "WELCOME BACK" : "ACCOUNT RECOVERY"}</p>
      <h1>{mode === "register" ? "Create your North." : mode === "login" ? "Continue your journey." : "Recover your North."}</h1>
      {mode === "register" && <label><span>What should North call you?</span><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>}
      <label><span>Username</span><input autoCapitalize="none" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} placeholder="3–30 letters, numbers, _ or -" /></label>
      {mode === "register" && <label><span>Access code <small>Only required during private access</small></span><input autoCapitalize="characters" autoComplete="off" value={accessCode} onChange={(event) => setAccessCode(event.target.value.toUpperCase())} placeholder="Optional unless North is invite-only" /></label>}
      {mode === "recover" && <label><span>Recovery code</span><input value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())} /></label>}
      <label><span>{mode === "recover" ? "New password" : "Password"}</span><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" /></label>
      {error && <p className="onboarding-error" role="alert">{error}</p>}
      <button className="onboarding-primary" disabled={busy || username.length < 3 || password.length < 10 || (mode === "register" && !name.trim())} onClick={() => authenticate(mode === "recover" ? "recover" : mode)}>{busy ? "Working…" : mode === "register" ? "Create account" : mode === "login" ? "Sign in" : "Recover account"}<ArrowRight /></button>
      {mode === "login" && <button className="onboarding-secondary" onClick={() => setMode("recover")}>Use my recovery code</button>}
    </>}
  </section></main>;

  return <main className="onboarding-shell"><section className="onboarding-card setup-card">
    <header><div className="onboarding-brand"><span><img src="/png/transparent/footprint-clean-teal.png" alt="" /></span><strong>NORTH</strong></div><small>{step === 1 ? "SECURE YOUR ACCOUNT" : `SETUP ${Math.max(1, step - 1)} OF 5`}</small></header>
    <div className="onboarding-progress"><i style={{ width: `${Math.max(10, (step / 6) * 100)}%` }} /></div>
    {step === 1 && <div className="recovery-step"><span className="setup-icon"><KeyRound /></span><p className="onboarding-kicker">YOUR RECOVERY KEY</p><h1>Save this somewhere safe.</h1><p className="onboarding-lead">There is no email recovery. This one-time code is the only way to reset a forgotten password. North stores only a protected fingerprint of it.</p><div className="recovery-code"><code>{recoveryCode}</code><button onClick={() => navigator.clipboard.writeText(recoveryCode)} aria-label="Copy recovery code"><Copy /></button></div><label className="recovery-confirm"><input type="checkbox" checked={recoverySaved} onChange={(event) => setRecoverySaved(event.target.checked)} /><span>I saved my recovery code somewhere secure.</span></label><button className="onboarding-primary" disabled={!recoverySaved} onClick={nextStep}>I saved it <ShieldCheck /></button></div>}
    {step === 2 && <div><span className="setup-icon"><Compass /></span><p className="onboarding-kicker">YOUR DIRECTION</p><h1>What are we moving toward?</h1><div className="choice-grid">{["Build strength and consistency", "Build muscle", "Move more and feel better", "Improve fitness and endurance", "Return to training steadily"].map((item) => <button className={direction === item ? "selected" : ""} onClick={() => setDirection(item)} key={item}>{item}<Check /></button>)}</div><label><span>Experience</span><select value={experience} onChange={(event) => setExperience(event.target.value)}><option>Getting started</option><option>Some experience</option><option>Experienced</option></select></label></div>}
    {step === 3 && <div><span className="setup-icon"><Sparkles /></span><p className="onboarding-kicker">YOUR REAL WEEK</p><h1>Make the plan fit your life.</h1><label><span>Training days</span><div className="number-choices">{[2,3,4,5,6].map((value) => <button className={trainingDays === value ? "selected" : ""} onClick={() => { setTrainingDays(value); setTrainingDayIndexes(suggestedDays(value)); }} key={value}>{value}</button>)}</div></label><label><span>Time per session</span><div className="number-choices">{[20,30,45,60,75].map((value) => <button className={duration === value ? "selected" : ""} onClick={() => setDuration(value)} key={value}>{value}m</button>)}</div></label></div>}
    {step === 4 && <div><p className="onboarding-kicker">WHAT YOU ENJOY</p><h1>Where and how do you move?</h1><label><span>Available equipment</span><div className="chip-choices">{["Bodyweight", "Dumbbells", "Barbell", "Kettlebells", "Cables", "Machines", "Bands"].map((item) => <button className={equipment.includes(item) ? "selected" : ""} onClick={() => toggle(item, equipment, setEquipment)} key={item}>{item}</button>)}</div></label><label><span>Activities</span><div className="chip-choices">{["Strength", "Walking", "Running", "Cycling", "Mobility"].map((item) => <button className={activities.includes(item) ? "selected" : ""} onClick={() => toggle(item, activities, setActivities)} key={item}>{item}</button>)}</div></label></div>}
    {step === 5 && <div><p className="onboarding-kicker">HOW NORTH MEETS YOU</p><h1>Keep it comfortable and yours.</h1><label><span>Units</span><select value={units} onChange={(event) => setUnits(event.target.value as "imperial" | "metric")}><option value="imperial">Imperial (lb, mi)</option><option value="metric">Metric (kg, km)</option></select></label><label><span>Nova’s tone</span><select value={tone} onChange={(event) => setTone(event.target.value)}><option>Encouraging and direct</option><option>Quiet and concise</option><option>Detailed and educational</option></select></label><label className="memory-choice"><input type="checkbox" checked={memoryEnabled} onChange={(event) => setMemoryEnabled(event.target.checked)} /><span><strong>Permissioned memory</strong><small>Allow North to surface evidence-backed observations from your own records. You can review or forget them anytime.</small></span></label></div>}
    {step === 6 && <div><p className="onboarding-kicker">YOUR FIRST WEEK</p><h1>A steady place to begin.</h1><p className="onboarding-lead">Choose the exact {trainingDays} days you want to train. North has suggested a balanced rhythm, but your real week comes first.</p><div className="first-week editable">{plan.map((day) => <button type="button" aria-pressed={day.training} className={day.training ? "training" : "recovery"} onClick={() => setTrainingDayIndexes((current) => current.includes(day.index) ? current.filter((index) => index !== day.index) : current.length < trainingDays ? [...current, day.index].sort() : current)} key={day.day}><strong>{day.day}</strong><span>{day.training ? "Train" : "Off"}</span></button>)}</div><p className={`day-count ${trainingDayIndexes.length === trainingDays ? "complete" : ""}`}>{trainingDayIndexes.length} of {trainingDays} training days selected{trainingDayIndexes.length === trainingDays ? " — ready" : ` — choose ${trainingDays - trainingDayIndexes.length} more`}</p><div className="plan-reason"><Sparkles /><p><strong>Your week, your rhythm</strong><span>Tap a selected day to make it an off day, then choose another. You can edit this again anytime.</span></p></div><div className="review-actions"><button className="onboarding-secondary" onClick={() => setStep(3)}><ArrowLeft /> Edit setup</button><button className="onboarding-primary" disabled={trainingDayIndexes.length !== trainingDays} onClick={finish}>Use this direction <ArrowRight /></button></div></div>}
    {step >= 2 && step <= 5 && <footer><button className="onboarding-secondary" onClick={() => setStep((value) => value - 1)}><ArrowLeft /> Back</button><button className="onboarding-primary" onClick={nextStep}>Continue <ArrowRight /></button></footer>}
  </section></main>;
}
