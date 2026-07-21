import type { ExerciseDefinition } from "../data/exercises";
import { categories, equipment } from "./taxonomies";
import type { Exercise } from "./types";

/** Read-only adapter for legacy North surfaces. Canonical IDs remain in the v2 model. */
export function toLegacyExerciseDefinition(exercise: Exercise): ExerciseDefinition {
  const category=categories.find((x)=>x.id===exercise.categoryId)?.name ?? "Other";
  const equipmentName=equipment.find((x)=>x.id===exercise.equipment[0]?.equipmentId)?.displayName ?? "None";
  const target=exercise.cardio?"1 set · duration and distance":exercise.timedHold?"3 sets · 20–30 sec":exercise.trackingTemplateId.startsWith("mobility")?"2 sets · controlled range":"3 sets · 8–12 reps";
  const rest=exercise.cardio?0:exercise.timedHold?60:exercise.exerciseType==="mobility"||exercise.exerciseType==="flexibility"?30:75;
  return { name:exercise.displayName, category, equipment:equipmentName, aliases:exercise.aliases, target, rest, weight:"", previous:"No history yet", cue:exercise.executionCues[0] ?? exercise.instructions[0], locations:["Gym"], difficulty:exercise.difficulty[0].toUpperCase().concat(exercise.difficulty.slice(1)) as ExerciseDefinition["difficulty"], movementPattern:exercise.movementPatternIds[0]?.replaceAll("_"," ") ?? "other", substitutions:exercise.relationships.filter((x)=>x.type==="substitution").map((x)=>x.toExerciseId), safetyNote:exercise.safetyNotes.join(" ") };
}
