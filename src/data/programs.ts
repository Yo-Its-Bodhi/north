export type ProgramDefinition = {
  id: string;
  name: string;
  description: string;
  goal: "Strength" | "Muscle" | "General fitness" | "Conditioning";
  level: "Beginner" | "Intermediate" | "Advanced" | "All levels";
  weeks: number;
  defaultDays: number;
  dayOptions: number[];
  focusesByDays: Record<number, string[]>;
  equipment?: string;
  priority?: string;
};

export const programs: ProgramDefinition[] = [
  {
    id: "full-body-foundation", name: "Full Body Foundation", description: "Build a dependable whole-body training rhythm with recovery between sessions.", goal: "General fitness", level: "Beginner", weeks: 6, defaultDays: 3, dayOptions: [2, 3, 4],
    focusesByDays: { 2: ["Full body", "Full body"], 3: ["Full body", "Full body", "Full body"], 4: ["Upper body", "Lower body", "Upper body", "Lower body"] },
  },
  {
    id: "upper-lower", name: "Upper / Lower", description: "Alternate upper- and lower-body sessions for balanced strength and muscle development.", goal: "Muscle", level: "Intermediate", weeks: 8, defaultDays: 4, dayOptions: [3, 4, 5],
    focusesByDays: { 3: ["Upper body", "Lower body", "Full body"], 4: ["Upper body", "Lower body", "Upper body", "Lower body"], 5: ["Upper body", "Lower body", "Push", "Pull", "Lower body"] },
  },
  {
    id: "push-pull-legs", name: "Push / Pull / Legs", description: "A classic split with clear movement focus and flexible weekly frequency.", goal: "Muscle", level: "Intermediate", weeks: 8, defaultDays: 3, dayOptions: [3, 4, 5, 6],
    focusesByDays: { 3: ["Push", "Pull", "Legs"], 4: ["Push", "Pull", "Legs", "Full body"], 5: ["Push", "Pull", "Legs", "Upper body", "Lower body"], 6: ["Push", "Pull", "Legs", "Push", "Pull", "Legs"] },
  },
  {
    id: "strength-base", name: "Strength Base", description: "Practice the major movement patterns with lower repetitions and longer recovery.", goal: "Strength", level: "Intermediate", weeks: 8, defaultDays: 4, dayOptions: [3, 4],
    focusesByDays: { 3: ["Full body", "Upper body", "Lower body"], 4: ["Upper body", "Lower body", "Upper body", "Lower body"] },
  },
  {
    id: "hypertrophy-builder", name: "Hypertrophy Builder", description: "Accumulate repeatable weekly volume across every major muscle group.", goal: "Muscle", level: "Advanced", weeks: 8, defaultDays: 5, dayOptions: [4, 5, 6],
    focusesByDays: { 4: ["Upper body", "Lower body", "Push", "Pull"], 5: ["Push", "Pull", "Legs", "Upper body", "Lower body"], 6: ["Push", "Pull", "Legs", "Chest", "Back", "Glutes"] },
  },
  {
    id: "beginner-gym", name: "Beginner Gym Start", description: "Learn gym movements without crowding the week or chasing exhaustion.", goal: "General fitness", level: "Beginner", weeks: 4, defaultDays: 3, dayOptions: [2, 3, 4],
    focusesByDays: { 2: ["Full body", "Full body"], 3: ["Full body", "Full body", "Full body"], 4: ["Upper body", "Lower body", "Upper body", "Lower body"] },
  },
  {
    id: "bodyweight-anywhere", name: "Bodyweight Anywhere", description: "Train strength and control at home, outdoors, or while travelling.", goal: "General fitness", level: "All levels", weeks: 6, defaultDays: 4, dayOptions: [3, 4, 5], equipment: "Bodyweight",
    focusesByDays: { 3: ["Calisthenics", "Core", "Calisthenics"], 4: ["Calisthenics", "Core", "Calisthenics", "Mobility"], 5: ["Calisthenics", "Core", "Calisthenics", "Core", "Mobility"] },
  },
  {
    id: "kettlebell", name: "Kettlebell Total Body", description: "Build strength, power, and conditioning with one compact tool.", goal: "Conditioning", level: "All levels", weeks: 6, defaultDays: 3, dayOptions: [2, 3, 4], equipment: "Kettlebell",
    focusesByDays: { 2: ["Full body", "Full body"], 3: ["Full body", "Full body", "Full body"], 4: ["Full body", "Full body", "Core", "Full body"] },
  },
  {
    id: "glute-priority", name: "Glute Priority", description: "Prioritize glutes while preserving balanced lower- and upper-body work.", goal: "Muscle", level: "All levels", weeks: 8, defaultDays: 4, dayOptions: [3, 4, 5], priority: "Glutes",
    focusesByDays: { 3: ["Glutes", "Upper body", "Lower body"], 4: ["Glutes", "Upper body", "Lower body", "Glutes"], 5: ["Glutes", "Upper body", "Lower body", "Upper body", "Glutes"] },
  },
];
