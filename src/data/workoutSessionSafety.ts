export function activeWorkoutConflictsWithTemplate(input: {
  startedAt: string | null;
  finishedAt: string | null;
  activePlanDayId?: string;
  activeDate: string;
  targetPlanDayId: string;
  targetDate: string;
  startsImmediately: boolean;
}) {
  if (!input.startedAt || input.finishedAt) return false;
  if (input.startsImmediately) return true;
  return input.activePlanDayId
    ? input.activePlanDayId === input.targetPlanDayId
    : input.activeDate === input.targetDate;
}

type WorkoutTiming = {
  startedAt: string | null;
  finishedAt: string | null;
  pausedAt?: string;
  pausedDurationMs?: number;
};

export function totalPausedDurationMs(session: WorkoutTiming, referenceTime: number) {
  const completedPauses = Math.max(0, session.pausedDurationMs ?? 0);
  if (!session.pausedAt) return completedPauses;
  return completedPauses + Math.max(0, referenceTime - new Date(session.pausedAt).getTime());
}

export function activeWorkoutSecondsAt(session: WorkoutTiming, referenceTime: number) {
  if (!session.startedAt) return 0;
  const effectiveEnd = session.finishedAt ? new Date(session.finishedAt).getTime() : referenceTime;
  return Math.max(0, Math.floor((effectiveEnd - new Date(session.startedAt).getTime() - totalPausedDurationMs(session, effectiveEnd)) / 1000));
}

export function pauseWorkoutTiming<T extends WorkoutTiming>(session: T, pausedAt: string): T {
  if (!session.startedAt || session.finishedAt || session.pausedAt) return session;
  return { ...session, pausedAt };
}

export function resumeWorkoutTiming<T extends WorkoutTiming>(session: T, resumedAt: string): T {
  if (!session.pausedAt) return session;
  return {
    ...session,
    pausedAt: undefined,
    pausedDurationMs: totalPausedDurationMs(session, new Date(resumedAt).getTime()),
  };
}