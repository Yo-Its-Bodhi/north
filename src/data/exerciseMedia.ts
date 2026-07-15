const dumbbellBenchDemo = new URL("../assets/exercises/dumbbell-bench-press-bottom-v1.png", import.meta.url).href;

export type ExerciseMedia = {
  name: string;
  status: "approved" | "review-required";
  image?: string;
  alt: string;
};

export const priorityExerciseProfiles = [
  "Barbell bench press",
  "Flat dumbbell press",
  "Back squat",
  "Romanian deadlift",
  "Conventional deadlift",
  "Lat pulldown",
  "Seated cable row",
  "Pull-up",
  "Standing overhead press",
  "Dumbbell lateral raise",
  "Barbell hip thrust",
  "Leg press",
  "Leg extension",
  "Dumbbell curl",
  "Rope pushdown",
] as const;

const media: ExerciseMedia[] = priorityExerciseProfiles.map((name) => ({
  name,
  status: name === "Flat dumbbell press" ? "approved" : "review-required",
  image: name === "Flat dumbbell press" ? dumbbellBenchDemo : undefined,
  alt: `Start and finish demonstration for ${name}`,
}));

export function getExerciseMedia(name: string) {
  return media.find((item) => item.name.toLowerCase() === name.toLowerCase());
}

export function getApprovedExerciseDemo(name: string) {
  const item = getExerciseMedia(name);
  return item?.status === "approved" ? item.image : undefined;
}
