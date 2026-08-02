const activeRecordingMethods = new Set(["actively_recorded", "manual_entry"]);

export function recordingMethodName(value) {
  if (value === 1 || value === "1") return "actively_recorded";
  if (value === 2 || value === "2") return "automatically_recorded";
  if (value === 3 || value === "3") return "manual_entry";
  return typeof value === "string" && value ? value : "unknown";
}

export function recordStartsAfterConnection(startedAt, importFrom) {
  const started = new Date(startedAt).valueOf();
  const boundary = new Date(importFrom).valueOf();
  return Number.isFinite(started) && Number.isFinite(boundary) && started >= boundary;
}

export function isPurposefulExercise(payload = {}) {
  const recordingMethod = recordingMethodName(payload.recordingMethod);
  if (activeRecordingMethods.has(recordingMethod)) return true;
  if (recordingMethod !== "unknown") return false;
  return [8, 56].includes(Number(payload.exerciseType));
}

export function healthExerciseKind(exerciseType) {
  const type = Number(exerciseType);
  if (type === 8) return "bike";
  if (type === 56) return "run";
  if (type === 79) return "walk";
  return "workout";
}