import type { ExerciseDefinition } from "./exercises";

export type MuscleActivation = { primary: string[]; secondary: string[]; supporting: string[] };

const categoryDefaults: Record<string, MuscleActivation> = {
  Chest: { primary: ["chest"], secondary: ["triceps", "front-delts"], supporting: ["abs"] },
  Back: { primary: ["lats"], secondary: ["traps", "rear-delts", "biceps"], supporting: ["forearms", "lower-back"] },
  Shoulders: { primary: ["front-delts", "side-delts", "rear-delts"], secondary: ["triceps", "traps"], supporting: ["abs"] },
  Biceps: { primary: ["biceps"], secondary: ["forearms"], supporting: [] },
  Triceps: { primary: ["triceps"], secondary: [], supporting: [] },
  Quads: { primary: ["quads"], secondary: ["glutes"], supporting: ["hamstrings", "calves", "abs"] },
  Hamstrings: { primary: ["hamstrings"], secondary: ["glutes", "lower-back"], supporting: ["calves", "abs"] },
  Glutes: { primary: ["glutes"], secondary: ["hamstrings", "quads"], supporting: ["abs"] },
  Calves: { primary: ["calves"], secondary: [], supporting: ["quads", "hamstrings"] },
  Core: { primary: ["abs", "obliques"], secondary: [], supporting: ["lower-back", "glutes"] },
  "Full body": { primary: ["quads", "glutes", "chest"], secondary: ["hamstrings", "front-delts", "triceps", "lats"], supporting: ["abs", "calves", "forearms"] },
  Conditioning: { primary: ["quads", "hamstrings", "calves"], secondary: ["glutes"], supporting: ["abs"] },
  Mobility: { primary: [], secondary: [], supporting: ["front-delts", "lats", "obliques", "glutes", "hamstrings"] },
};

const overrides: Array<{ pattern: RegExp; activation: MuscleActivation; category?: string }> = [
  { pattern: /seated leg curl|lying leg curl|standing single-leg curl|nordic hamstring curl|glute-ham raise|razor curl|sliding leg curl|swiss-ball leg curl|banded leg curl/i, activation: { primary: ["hamstrings"], secondary: ["calves"], supporting: [] } },
  { pattern: /romanian deadlift|stiff-leg deadlift|b-stance romanian|good morning/i, activation: { primary: ["hamstrings", "glutes"], secondary: ["lower-back"], supporting: ["abs", "forearms"] } },
  { pattern: /leg extension/i, activation: { primary: ["quads"], secondary: [], supporting: [] } },
  { pattern: /hip adduction|adductor/i, activation: { primary: ["adductors"], secondary: ["glutes"], supporting: [] } },
  { pattern: /hip abduction|lateral walk|monster walk|clamshell|fire hydrant/i, activation: { primary: ["glutes"], secondary: [], supporting: ["abs"] } },
  { pattern: /glute focus|hip thrust|glute bridge|kickback|frog pump|cable pull-through/i, activation: { primary: ["glutes"], secondary: ["hamstrings"], supporting: ["abs"] } },
  { pattern: /close-grip.*bench|diamond push-up|triceps focus/i, category: "Triceps", activation: { primary: ["triceps"], secondary: ["chest"], supporting: ["front-delts"] } },
  { pattern: /bench press|dumbbell press|chest press|floor press|push-up|push up|chest dip/i, category: "Chest", activation: { primary: ["chest"], secondary: ["triceps", "front-delts"], supporting: ["abs"] } },
  { pattern: /fly|pec deck/i, category: "Chest", activation: { primary: ["chest"], secondary: ["front-delts"], supporting: ["biceps"] } },
  { pattern: /sumo deadlift/i, category: "Glutes", activation: { primary: ["glutes", "adductors"], secondary: ["hamstrings", "quads"], supporting: ["lower-back", "abs", "forearms"] } },
  { pattern: /deadlift|rack pull/i, activation: { primary: ["glutes", "hamstrings", "lower-back"], secondary: ["lats", "traps", "quads"], supporting: ["abs", "forearms"] } },
  { pattern: /chin-up.*biceps focus/i, category: "Biceps", activation: { primary: ["biceps"], secondary: ["lats", "forearms"], supporting: [] } },
  { pattern: /rowing machine/i, category: "Conditioning", activation: { primary: ["quads"], secondary: ["glutes", "hamstrings", "lats"], supporting: ["abs", "biceps", "forearms"] } },
  { pattern: /row|pull-up|pull up|pulldown|chin-up|chin up/i, category: "Back", activation: { primary: ["lats"], secondary: ["traps", "rear-delts", "biceps"], supporting: ["forearms", "lower-back"] } },
  { pattern: /overhead press|shoulder press|push press|arnold press|landmine press/i, activation: { primary: ["front-delts"], secondary: ["triceps", "rear-delts"], supporting: ["traps", "abs"] } },
  { pattern: /lateral raise/i, activation: { primary: ["side-delts"], secondary: ["front-delts", "traps"], supporting: [] } },
  { pattern: /rear.delt|reverse pec|face pull|band pull-apart/i, activation: { primary: ["rear-delts"], secondary: ["traps"], supporting: ["forearms"] } },
  { pattern: /curl/i, activation: { primary: ["biceps"], secondary: ["forearms"], supporting: [] } },
  { pattern: /pushdown|skull crusher|triceps extension|overhead extension|jm press|bench dip|parallel-bar dip/i, activation: { primary: ["triceps"], secondary: ["front-delts"], supporting: ["chest"] } },
  { pattern: /squat|leg press|lunge|step-up|step up|wall sit/i, category: "Quads", activation: { primary: ["quads"], secondary: ["glutes", "adductors"], supporting: ["hamstrings", "calves", "abs"] } },
  { pattern: /tibialis/i, activation: { primary: ["tibialis"], secondary: [], supporting: ["calves"] } },
  { pattern: /calf|on toes/i, activation: { primary: ["calves"], secondary: [], supporting: ["quads", "hamstrings"] } },
  { pattern: /plank|crunch|sit-up|sit up|leg raise|knee raise|dead bug|pallof|wood chop|rollout|v-up|hollow|russian twist/i, activation: { primary: ["abs", "obliques"], secondary: [], supporting: ["lower-back", "glutes"] } },
  { pattern: /bike|cycling|run|walk|stair|stepmill|elliptical/i, activation: { primary: ["quads", "hamstrings", "calves"], secondary: ["glutes"], supporting: ["abs"] } },
];

export function getMuscleActivation(exercise?: Pick<ExerciseDefinition, "name" | "category"> | null): MuscleActivation {
  if (!exercise) return { primary: [], secondary: [], supporting: [] };
  if (exercise.category === "Mobility") return categoryDefaults.Mobility;
  return overrides.find((entry) => (!entry.category || entry.category === exercise.category) && entry.pattern.test(exercise.name))?.activation ?? categoryDefaults[exercise.category] ?? { primary: [exercise.category], secondary: [], supporting: [] };
}

export function combineMuscleActivations(activations: MuscleActivation[]): MuscleActivation {
  const primary = new Set(activations.flatMap((item) => item.primary));
  const secondary = new Set(activations.flatMap((item) => item.secondary).filter((item) => !primary.has(item)));
  const supporting = new Set(activations.flatMap((item) => item.supporting).filter((item) => !primary.has(item) && !secondary.has(item)));
  return { primary: [...primary], secondary: [...secondary], supporting: [...supporting] };
}
