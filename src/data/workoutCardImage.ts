export type WorkoutCardImageInput = {
  kind: string;
  title: string;
  exerciseNames?: string[];
  categories?: string[];
  equipment?: string[];
};

const workoutCardRoot = "/png/workoutcards";

const cardRules = [
  { file: "v-taperday.png", terms: ["v taper", "v-taper"] },
  { file: "upper-body-builder.png", terms: ["upper body"] },
  { file: "full-body-foundation.png", terms: ["full body"] },
  { file: "pullday.png", terms: ["pull"] },
  { file: "pushday.png", terms: ["push"] },
  { file: "chestday.png", terms: ["chest", "pectoralis"] },
  { file: "backday.png", terms: ["back", "lat", "row"] },
  { file: "shoulderday.png", terms: ["shoulder", "deltoid"] },
  { file: "armday.png", terms: ["arm", "biceps", "triceps"] },
  { file: "coreday.png", terms: ["core", "abdominal", "abs", "oblique"] },
  { file: "gluteday.png", terms: ["glute", "hip thrust"] },
  { file: "legday.png", terms: ["lower body", "leg", "quad", "hamstring", "calf", "calves"] },
  { file: "barbellday.png", terms: ["barbell", "ez bar"] },
  { file: "dumbbellday.png", terms: ["dumbbell"] },
  { file: "kettlebellday.png", terms: ["kettlebell"] },
  { file: "cablestationday.png", terms: ["cable"] },
  { file: "machineday.png", terms: ["machine", "smith machine"] },
] as const;

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function resolveWorkoutCardImage({ kind, title, exerciseNames = [], categories = [], equipment = [] }: WorkoutCardImageInput) {
  if (kind === "bike") return `${workoutCardRoot}/bikeday.png`;
  if (kind === "run" || kind === "walk") return `${workoutCardRoot}/runday.png`;
  if (kind === "rest" || kind === "recovery") return `${workoutCardRoot}/rest.png`;

  const titleText = normalized(title);
  const explicitRule = cardRules.find((rule) => rule.terms.some((term) => titleText.includes(term)));
  if (explicitRule) return `${workoutCardRoot}/${explicitRule.file}`;

  const evidence = [...exerciseNames, ...categories, ...equipment].map(normalized);
  const scores = cardRules.map((rule) => ({
    file: rule.file,
    score: evidence.reduce((score, value) => score + (rule.terms.some((term) => value.includes(term)) ? 1 : 0), 0),
  })).sort((left, right) => right.score - left.score);

  return `${workoutCardRoot}/${scores[0].score > 0 ? scores[0].file : "full-body-foundation.png"}`;
}