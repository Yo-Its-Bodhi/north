import { mkdir, writeFile } from "node:fs/promises";
import { productionExerciseLibrary } from "../src/exerciseDatabase/libraryExercises.ts";

const index = productionExerciseLibrary.map((exercise) => ({
  id: exercise.id,
  name: exercise.displayName,
  aliases: exercise.aliases.slice(0, 8),
  category: exercise.categoryId,
  type: exercise.exerciseType,
  difficulty: exercise.difficulty,
  equipment: exercise.equipment.map((item) => item.equipmentId),
  muscles: exercise.muscles.filter((item) => item.role === "primary" || item.role === "secondary").map((item) => `${item.muscleId}:${item.role}`),
  patterns: exercise.movementPatternIds,
  tracking: exercise.trackingTemplateId,
  unilateral: exercise.unilateral,
  timedHold: exercise.timedHold,
  cardio: exercise.cardio,
  tags: exercise.tags.slice(0, 12),
}));

await mkdir(new URL("../server/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../server/data/nova-exercise-index.json", import.meta.url), `${JSON.stringify(index)}\n`, "utf8");
console.log(`Built Nova coaching index with ${index.length} canonical exercises.`);
