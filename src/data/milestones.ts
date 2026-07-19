export type MilestoneMetric = "workouts" | "sets" | "volume" | "activities" | "distance" | "checkIns" | "reviews" | "personalRecords" | "programWeeks" | "activeDays";

export type MilestoneDefinition = {
  id: string;
  title: string;
  description: string;
  category: "Workouts" | "Strength" | "Consistency" | "Activity" | "Recovery" | "Personal best";
  metric: MilestoneMetric;
  target: number;
  chapter: number;
  track: string;
  identity?: string;
};

type AchievementTrack = Omit<MilestoneDefinition, "id" | "target" | "chapter"> & { targets: number[] };

const achievementTracks: AchievementTrack[] = [
  { track: "workouts", title: "Workouts completed", description: "Complete and preserve {target} workouts.", category: "Workouts", metric: "workouts", targets: [5, 15, 35, 75, 150, 250, 400, 600, 850, 1_200] },
  { track: "sets", title: "Working sets", description: "Accumulate {target} controlled working sets.", category: "Strength", metric: "sets", targets: [100, 250, 500, 1_000, 2_000, 3_500, 5_500, 8_000, 11_000, 15_000] },
  { track: "volume", title: "Training volume", description: "Record {target} of total training volume.", category: "Strength", metric: "volume", targets: [10_000, 30_000, 75_000, 150_000, 300_000, 500_000, 800_000, 1_200_000, 1_750_000, 2_500_000] },
  { track: "active-days", title: "Active days", description: "Record movement on {target} different days.", category: "Consistency", metric: "activeDays", targets: [7, 20, 45, 90, 180, 300, 450, 650, 900, 1_200] },
  { track: "activity-logs", title: "Activity logs", description: "Record {target} bike, walk, run, or recovery sessions.", category: "Activity", metric: "activities", targets: [5, 15, 35, 75, 150, 250, 400, 600, 850, 1_200] },
  { track: "distance", title: "Distance travelled", description: "Record {target} km across walking, running, and cycling.", category: "Activity", metric: "distance", targets: [15, 50, 125, 300, 750, 1_250, 2_000, 3_000, 4_500, 6_500] },
  { track: "check-ins", title: "Recovery check-ins", description: "Give recovery a voice {target} times.", category: "Recovery", metric: "checkIns", targets: [5, 15, 30, 60, 120, 200, 320, 500, 750, 1_000] },
  { track: "reviews", title: "Weekly reflections", description: "Preserve what {target} weeks taught you.", category: "Recovery", metric: "reviews", targets: [2, 6, 12, 24, 52, 80, 120, 180, 260, 365] },
  { track: "personal-records", title: "Personal bests", description: "Record {target} evidence-backed load improvements.", category: "Personal best", metric: "personalRecords", targets: [1, 3, 8, 15, 30, 50, 80, 120, 180, 250] },
  { track: "program-weeks", title: "Program weeks", description: "Complete {target} archived North program weeks.", category: "Consistency", metric: "programWeeks", targets: [2, 6, 12, 24, 52, 80, 120, 180, 260, 365] },
  { track: "workout-rhythm", title: "Workout rhythm", description: "Build a record of {target} completed workouts.", category: "Workouts", metric: "workouts", targets: [10, 25, 50, 100, 200, 325, 500, 750, 1_000, 1_500] },
  { track: "set-builder", title: "Set builder", description: "Build toward {target} total working sets.", category: "Strength", metric: "sets", targets: [150, 400, 800, 1_500, 3_000, 5_000, 7_500, 10_500, 14_000, 18_000] },
  { track: "strength-volume", title: "Strength volume", description: "Move {target} of recorded training volume.", category: "Strength", metric: "volume", targets: [15_000, 45_000, 100_000, 200_000, 400_000, 650_000, 1_000_000, 1_500_000, 2_100_000, 3_000_000] },
  { track: "showing-up", title: "Showing up", description: "Make {target} active days part of your record.", category: "Consistency", metric: "activeDays", targets: [10, 30, 60, 120, 240, 365, 550, 750, 1_000, 1_400] },
  { track: "movement-days", title: "Movement sessions", description: "Log {target} movement sessions.", category: "Activity", metric: "activities", targets: [8, 25, 60, 125, 250, 400, 625, 900, 1_250, 1_750] },
  { track: "endurance-distance", title: "Endurance distance", description: "Cover {target} km in recorded movement.", category: "Activity", metric: "distance", targets: [25, 75, 200, 500, 1_000, 1_750, 2_750, 4_000, 5_750, 8_000] },
  { track: "recovery-practice", title: "Recovery practice", description: "Complete {target} honest recovery check-ins.", category: "Recovery", metric: "checkIns", targets: [7, 21, 45, 90, 180, 300, 475, 700, 1_000, 1_400] },
  { track: "reflection-practice", title: "Reflection practice", description: "Finish {target} weekly reflections.", category: "Recovery", metric: "reviews", targets: [3, 8, 16, 32, 64, 100, 150, 220, 320, 450] },
  { track: "progress-records", title: "Progress records", description: "Record {target} personal bests.", category: "Personal best", metric: "personalRecords", targets: [2, 5, 10, 20, 40, 65, 100, 150, 220, 300] },
  { track: "program-commitment", title: "Program commitment", description: "Complete {target} planned program weeks.", category: "Consistency", metric: "programWeeks", targets: [3, 8, 16, 32, 64, 100, 150, 220, 320, 450] },
];

export const milestoneDefinitions: MilestoneDefinition[] = achievementTracks.flatMap((track) => track.targets.map((target, index) => ({
  id: `${track.track}-chapter-${index + 1}`,
  title: `Chapter ${index + 1}: ${track.title}`,
  description: track.description.replace("{target}", target.toLocaleString()),
  category: track.category,
  metric: track.metric,
  target,
  chapter: index + 1,
  track: track.track,
})));

export const milestoneCategories = ["All", "Workouts", "Strength", "Consistency", "Activity", "Recovery", "Personal best"];
