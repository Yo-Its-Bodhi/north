export type MilestoneMetric = "workouts" | "sets" | "volume" | "activities" | "distance" | "checkIns" | "reviews" | "personalRecords" | "programWeeks" | "activeDays";

export type MilestoneDefinition = {
  id: string;
  title: string;
  description: string;
  category: "Workouts" | "Strength" | "Consistency" | "Activity" | "Recovery" | "Personal best";
  metric: MilestoneMetric;
  target: number;
  identity?: string;
};

export const milestoneDefinitions: MilestoneDefinition[] = [
  { id: "first-workout", title: "First Workout", description: "Complete and preserve your first workout.", category: "Workouts", metric: "workouts", target: 1, identity: "Began the strength journey" },
  { id: "ten-workouts", title: "First 10 Workouts", description: "Complete ten workouts without requiring a streak.", category: "Workouts", metric: "workouts", target: 10 },
  { id: "fifty-workouts", title: "50 Workouts", description: "Build a record of fifty completed workouts.", category: "Workouts", metric: "workouts", target: 50, identity: "Consistent trainer" },
  { id: "hundred-workouts", title: "100 Workouts", description: "Preserve one hundred completed workouts.", category: "Workouts", metric: "workouts", target: 100 },
  { id: "hundred-sets", title: "100 Working Sets", description: "Complete one hundred recorded working sets.", category: "Strength", metric: "sets", target: 100 },
  { id: "thousand-sets", title: "1,000 Working Sets", description: "Accumulate one thousand controlled working sets.", category: "Strength", metric: "sets", target: 1000, identity: "Volume builder" },
  { id: "ten-thousand-volume", title: "10,000 lb Volume", description: "Record ten thousand pounds of total training volume.", category: "Strength", metric: "volume", target: 10000 },
  { id: "hundred-thousand-volume", title: "100,000 lb Volume", description: "Record one hundred thousand pounds of training volume.", category: "Strength", metric: "volume", target: 100000 },
  { id: "seven-active-days", title: "Seven Active Days", description: "Record movement on seven different days, with no consecutive-day requirement.", category: "Consistency", metric: "activeDays", target: 7 },
  { id: "thirty-active-days", title: "Thirty Active Days", description: "Show up on thirty different recorded days.", category: "Consistency", metric: "activeDays", target: 30, identity: "Returns to the path" },
  { id: "first-activity", title: "First Outdoor or Recovery Log", description: "Preserve a bike, walk, run, or recovery entry.", category: "Activity", metric: "activities", target: 1 },
  { id: "twenty-activities", title: "20 Activity Logs", description: "Record twenty bike, walk, run, or recovery sessions.", category: "Activity", metric: "activities", target: 20 },
  { id: "fifty-km", title: "50 Kilometres", description: "Record fifty kilometres across walking, running, and cycling.", category: "Activity", metric: "distance", target: 50 },
  { id: "five-hundred-km", title: "500 Kilometres", description: "Record five hundred kilometres of movement.", category: "Activity", metric: "distance", target: 500, identity: "Moves beyond the gym" },
  { id: "five-checkins", title: "Five Honest Check-ins", description: "Give recovery a voice five times.", category: "Recovery", metric: "checkIns", target: 5 },
  { id: "thirty-checkins", title: "Thirty Check-ins", description: "Build thirty days of recovery context.", category: "Recovery", metric: "checkIns", target: 30, identity: "Listens to recovery" },
  { id: "first-review", title: "First Weekly Reflection", description: "Pause and preserve what a week taught you.", category: "Recovery", metric: "reviews", target: 1 },
  { id: "eight-reviews", title: "Eight Weekly Reflections", description: "Reflect on eight different weeks.", category: "Recovery", metric: "reviews", target: 8 },
  { id: "first-pr", title: "First Recorded Personal Best", description: "Exceed a previously recorded load on the same movement.", category: "Personal best", metric: "personalRecords", target: 1, identity: "Growing stronger" },
  { id: "ten-prs", title: "Ten Personal Bests", description: "Record ten evidence-backed load improvements.", category: "Personal best", metric: "personalRecords", target: 10 },
  { id: "four-program-weeks", title: "Four Program Weeks", description: "Complete four archived weeks in a North program.", category: "Consistency", metric: "programWeeks", target: 4, identity: "Follows a direction" },
];

export const milestoneCategories = ["All", "Workouts", "Strength", "Consistency", "Activity", "Recovery", "Personal best"];
