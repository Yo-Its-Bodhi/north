export type GuideTopic = "Getting set up" | "Start here" | "Planning" | "Workouts" | "Your record" | "Health & privacy" | "Settings & access";

export type GuideDestination = "today" | "training" | "journey" | "nova" | "you" | "settings" | "account" | "nova-workout-builder" | "workout-library" | "programs";
export type GuideIntent = "open-today-anatomy" | "start-product-tour";
export type GuideAction = { label: string; destination: GuideDestination; intent?: GuideIntent };

export type GuideArticle = {
  id: string;
  topic: GuideTopic;
  title: string;
  summary: string;
  searchTerms: string[];
  introduction: string;
  steps: Array<{ title: string; body: string }>;
  remember: string;
  action?: GuideAction;
};

export const guideTopics: Array<"All" | GuideTopic> = ["All", "Getting set up", "Start here", "Planning", "Workouts", "Your record", "Health & privacy", "Settings & access"];

export const productTourGuideSteps: GuideArticle["steps"] = [
  { title: "Start with one clear direction.", body: "Today shows your planned workout, lets you check in with how you are feeling, and keeps the next useful action clear." },
  { title: "Progress becomes visible here.", body: "Journey brings your workouts, activities, milestones, and patterns together over time so you can inspect what actually happened." },
  { title: "Shape the week around real life.", body: "Training lets you plan the week, open or edit a session, choose a ready-made workout, or build your own." },
  { title: "Ask, inspect, then decide.", body: "Nova can answer from your saved North records and prepare useful changes, but meaningful plan changes wait for your approval." },
  { title: "You stay in control.", body: "You holds your direction, current signals, progress, and North memory, with account, device, privacy, and accessibility controls nearby." },
];

let guideArticlesPromise: Promise<GuideArticle[]> | null = null;
export function loadGuideArticles() {
  return guideArticlesPromise ??= fetch("/guide-articles.json").then(async (response) => {
    if (!response.ok) throw new Error("The North Guide could not load.");
    const articles = await response.json();
    if (!Array.isArray(articles)) throw new Error("The North Guide is invalid.");
    return articles as GuideArticle[];
  });
}
