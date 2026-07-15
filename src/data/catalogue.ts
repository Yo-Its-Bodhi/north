import { exerciseCategories, exerciseEquipment, exerciseLibrary, type ExerciseDefinition } from "./exercises";
import { programs, type ProgramDefinition } from "./programs";
import { workoutFocuses, workoutGoals, workoutLevels, workoutTemplates, type WorkoutTemplate } from "./workouts";

type PublishedItem = { kind: "exercise" | "workout" | "program" | "milestone" | "announcement"; slug: string; title: string; summary: string; payload: Record<string, unknown> };

function replaceOrAppend<T>(items: T[], next: T, match: (item: T) => boolean) {
  const index = items.findIndex(match);
  if (index >= 0) items[index] = next; else items.push(next);
}

function addUnique(items: string[], value?: string) {
  if (value && !items.includes(value)) items.push(value);
}

export async function hydratePublishedCatalogue() {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);
    const response = await fetch("/v1/content", { signal: controller.signal });
    window.clearTimeout(timeout);
    if (!response.ok) return;
    const result = await response.json() as { items?: PublishedItem[] };
    for (const item of result.items ?? []) {
      if (item.kind === "exercise") {
        const next = { ...item.payload, name: item.title } as ExerciseDefinition;
        if (!next.category || !next.equipment || !Array.isArray(next.aliases)) continue;
        replaceOrAppend(exerciseLibrary, next, (entry) => entry.name.toLowerCase() === next.name.toLowerCase());
        addUnique(exerciseCategories, next.category); addUnique(exerciseEquipment, next.equipment);
      }
      if (item.kind === "workout") {
        const next = { ...item.payload, id: item.slug, name: item.title, description: item.summary, source: "north" } as WorkoutTemplate;
        if (!next.focus || !next.goal || !next.level || !Array.isArray(next.exercises)) continue;
        replaceOrAppend(workoutTemplates, next, (entry) => entry.id === next.id);
        addUnique(workoutFocuses, next.focus); addUnique(workoutGoals, next.goal); addUnique(workoutLevels, next.level);
      }
      if (item.kind === "program") {
        const next = { ...item.payload, id: item.slug, name: item.title, description: item.summary } as ProgramDefinition;
        if (!next.goal || !next.level || !next.focusesByDays) continue;
        replaceOrAppend(programs, next, (entry) => entry.id === next.id);
      }
    }
  } catch { /* Built-in catalogue remains fully available offline. */ }
}
