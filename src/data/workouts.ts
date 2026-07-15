import { exerciseLibrary } from "./exercises";

export type WorkoutLevel = "Beginner" | "Intermediate" | "Advanced";
export type WorkoutGoal = "Strength" | "Muscle" | "General fitness" | "Conditioning" | "Mobility";

export type WorkoutTemplateExercise = {
  exerciseName: string;
  sets: number;
  reps: string;
  rest: number;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  description: string;
  focus: string;
  goal: WorkoutGoal;
  level: WorkoutLevel;
  duration: number;
  equipment: string[];
  location: "Gym" | "Home" | "Anywhere";
  exercises: WorkoutTemplateExercise[];
  source?: "north" | "personal";
};

type Blueprint = {
  slug: string;
  name: string;
  focus: string;
  goal: WorkoutGoal;
  categories: string[];
  equipment?: string[];
  location?: WorkoutTemplate["location"];
};

const blueprints: Blueprint[] = [
  { slug: "full-body", name: "Full Body Foundation", focus: "Full body", goal: "General fitness", categories: ["Quads", "Chest", "Back", "Hamstrings", "Shoulders", "Core"] },
  { slug: "upper", name: "Upper Body Builder", focus: "Upper body", goal: "Muscle", categories: ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Back"] },
  { slug: "lower", name: "Lower Body Builder", focus: "Lower body", goal: "Muscle", categories: ["Quads", "Hamstrings", "Glutes", "Quads", "Calves", "Core"] },
  { slug: "push", name: "Push Day", focus: "Push", goal: "Muscle", categories: ["Chest", "Shoulders", "Triceps", "Chest", "Shoulders", "Triceps"] },
  { slug: "pull", name: "Pull Day", focus: "Pull", goal: "Muscle", categories: ["Back", "Back", "Biceps", "Back", "Biceps", "Core"] },
  { slug: "legs", name: "Leg Day", focus: "Legs", goal: "Strength", categories: ["Quads", "Hamstrings", "Glutes", "Quads", "Hamstrings", "Calves"] },
  { slug: "chest", name: "Chest Focus", focus: "Chest", goal: "Muscle", categories: ["Chest", "Chest", "Chest", "Triceps", "Shoulders", "Core"] },
  { slug: "back", name: "Back Strength", focus: "Back", goal: "Strength", categories: ["Back", "Back", "Back", "Biceps", "Core", "Back"] },
  { slug: "v-taper", name: "V-Taper Builder", focus: "V-taper", goal: "Muscle", categories: ["Back", "Shoulders", "Back", "Shoulders", "Biceps", "Core"] },
  { slug: "shoulders", name: "Shoulder Builder", focus: "Shoulders", goal: "Muscle", categories: ["Shoulders", "Shoulders", "Shoulders", "Back", "Triceps", "Core"] },
  { slug: "arms", name: "Complete Arms", focus: "Arms", goal: "Muscle", categories: ["Biceps", "Triceps", "Biceps", "Triceps", "Shoulders", "Core"] },
  { slug: "glutes", name: "Glute Strength", focus: "Glutes", goal: "Muscle", categories: ["Glutes", "Hamstrings", "Glutes", "Quads", "Glutes", "Core"] },
  { slug: "core", name: "Core Control", focus: "Core", goal: "General fitness", categories: ["Core", "Core", "Core", "Core", "Mobility", "Core"], location: "Anywhere" },
  { slug: "dumbbell", name: "Dumbbell Only", focus: "Full body", goal: "General fitness", categories: ["Quads", "Chest", "Back", "Hamstrings", "Shoulders", "Core"], equipment: ["Dumbbell"] },
  { slug: "barbell", name: "Barbell Strength", focus: "Full body", goal: "Strength", categories: ["Quads", "Chest", "Back", "Hamstrings", "Shoulders", "Core"], equipment: ["Barbell"] },
  { slug: "kettlebell", name: "Kettlebell Total Body", focus: "Full body", goal: "Conditioning", categories: ["Full body", "Quads", "Hamstrings", "Shoulders", "Core", "Full body"], equipment: ["Kettlebell"], location: "Home" },
  { slug: "cable", name: "Cable Station", focus: "Upper body", goal: "Muscle", categories: ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Core"], equipment: ["Cable"] },
  { slug: "machine", name: "Machine Circuit", focus: "Full body", goal: "General fitness", categories: ["Quads", "Chest", "Back", "Hamstrings", "Shoulders", "Core"], equipment: ["Machine"] },
  { slug: "bodyweight", name: "Bodyweight Strength", focus: "Calisthenics", goal: "General fitness", categories: ["Chest", "Back", "Quads", "Hamstrings", "Core", "Full body"], equipment: ["Bodyweight"], location: "Anywhere" },
  { slug: "mobility", name: "Mobility Reset", focus: "Mobility", goal: "Mobility", categories: ["Mobility", "Mobility", "Mobility", "Mobility", "Mobility", "Mobility"], location: "Anywhere" },
];

const levels: WorkoutLevel[] = ["Beginner", "Intermediate", "Advanced"];
const durations = [15, 20, 30, 45, 60, 75];

function chooseExercise(blueprint: Blueprint, category: string, index: number, seed: number) {
  const exact = exerciseLibrary.filter((exercise) => exercise.category === category && (!blueprint.equipment || blueprint.equipment.includes(exercise.equipment)));
  const locationSafe = blueprint.location === "Anywhere"
    ? exerciseLibrary.filter((exercise) => exercise.category === category && ["Bodyweight", "None", "Resistance band"].includes(exercise.equipment))
    : [];
  const pool = exact.length ? exact : locationSafe.length ? locationSafe : exerciseLibrary.filter((exercise) => exercise.category === category);
  return pool[(seed + index * 3) % pool.length];
}

export const workoutTemplates: WorkoutTemplate[] = blueprints.flatMap((blueprint, blueprintIndex) =>
  levels.flatMap((level, levelIndex) => durations.map((duration, durationIndex) => {
    const exerciseCount = duration <= 20 ? 4 : duration <= 45 ? 5 : 6;
    const seed = blueprintIndex * 7 + levelIndex * 3 + durationIndex;
    const exercises = blueprint.categories.slice(0, exerciseCount).map((category, index) => {
      const exercise = chooseExercise(blueprint, category, index, seed);
      const sets = level === "Beginner" ? 2 : level === "Intermediate" ? 3 : 4;
      const strength = blueprint.goal === "Strength";
      return { exerciseName: exercise.name, sets, reps: blueprint.goal === "Mobility" ? "30–60 sec" : strength ? "5–8" : "8–15", rest: blueprint.goal === "Mobility" ? 30 : strength ? 120 : 75 };
    });
    const equipment = [...new Set(exercises.map((item) => exerciseLibrary.find((exercise) => exercise.name === item.exerciseName)?.equipment ?? "Other"))];
    return {
      id: `${blueprint.slug}-${level.toLowerCase()}-${duration}`,
      name: `${duration}-Minute ${blueprint.name}`,
      description: `${level} ${blueprint.focus.toLowerCase()} session built for ${blueprint.goal.toLowerCase()}.`,
      focus: blueprint.focus,
      goal: blueprint.goal,
      level,
      duration,
      equipment,
      location: blueprint.location ?? "Gym",
      exercises,
      source: "north",
    };
  })),
);

export const workoutFocuses = ["All", ...new Set(workoutTemplates.map((workout) => workout.focus))];
export const workoutGoals = ["All", ...new Set(workoutTemplates.map((workout) => workout.goal))];
export const workoutLevels = ["All", ...levels];
