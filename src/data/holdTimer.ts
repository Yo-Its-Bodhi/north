export type HoldTimerPhase = "ready" | "preparing" | "holding";

export type HoldTimerState = {
  exerciseId: string;
  setIndex: number;
  phase: HoldTimerPhase;
  remaining: number;
  goal: number;
  previous: number;
  elapsed: number;
  startedAt: number | null;
};

export function advanceHoldTimer(state: HoldTimerState, now: number): HoldTimerState {
  if (state.phase === "preparing") {
    if (state.remaining > 1) return { ...state, remaining: state.remaining - 1 };
    return { ...state, phase: "holding", remaining: 0, elapsed: 0, startedAt: now };
  }
  if (state.phase !== "holding" || state.startedAt === null) return state;
  return { ...state, elapsed: Math.max(state.elapsed, Math.floor((now - state.startedAt) / 1000)) };
}

export function completedHoldSeconds(state: HoldTimerState, now: number): number {
  if (state.phase !== "holding" || state.startedAt === null) return 0;
  return Math.max(1, Math.floor((now - state.startedAt) / 1000));
}

export function holdImprovementSeconds(state: HoldTimerState): number {
  return state.previous > 0 ? Math.max(0, state.elapsed - state.previous) : 0;
}
