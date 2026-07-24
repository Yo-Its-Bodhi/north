import { normalizeExerciseKey, productionExerciseLibrary } from "../exerciseDatabase/libraryExercises";
import type { Exercise as CanonicalExercise } from "../exerciseDatabase/types";
import type { WorkoutTemplate, WorkoutTemplateExercise } from "./workouts";

const byId = new Map(productionExerciseLibrary.map((exercise) => [exercise.id, exercise]));
const byLegacyName = new Map(productionExerciseLibrary.flatMap((exercise) =>
  [exercise.canonicalName, exercise.displayName, ...exercise.aliases].map((name) => [normalizeExerciseKey(name), exercise] as const),
));

export type ExerciseResolution =
  | { status: "resolved"; canonical: CanonicalExercise; exerciseName: string; canonicalExerciseId: string }
  | { status: "unresolved"; canonical: null; exerciseName: string; canonicalExerciseId?: undefined };

export function resolveWorkoutTemplateExercise(exercise: Pick<WorkoutTemplateExercise, "exerciseName" | "canonicalExerciseId">): ExerciseResolution {
  const canonical = (exercise.canonicalExerciseId ? byId.get(exercise.canonicalExerciseId) : undefined)
    ?? byLegacyName.get(normalizeExerciseKey(exercise.exerciseName));
  return canonical
    ? { status: "resolved", canonical, exerciseName: canonical.displayName, canonicalExerciseId: canonical.id }
    : { status: "unresolved", canonical: null, exerciseName: exercise.exerciseName };
}

export function migrateWorkoutTemplateExercise(exercise: WorkoutTemplateExercise): WorkoutTemplateExercise {
  const resolution = resolveWorkoutTemplateExercise(exercise);
  return resolution.status === "resolved"
    ? { ...exercise, exerciseName: resolution.exerciseName, canonicalExerciseId: resolution.canonicalExerciseId }
    : { ...exercise, exerciseName: resolution.exerciseName, canonicalExerciseId: undefined };
}

export function migrateWorkoutTemplate(template: WorkoutTemplate): WorkoutTemplate {
  return { ...template, exercises: template.exercises.map(migrateWorkoutTemplateExercise) };
}
