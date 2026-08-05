import { guideArticles, type GuideAction, type GuideArticle } from "./guide";

export type GuideAgentSource = {
  id: string;
  title: string;
  topic: string;
  summary: string;
  introduction: string;
  steps: Array<{ title: string; body: string }>;
  remember: string;
  action?: GuideAction;
};

export type GuideAnswerParts = {
  introduction: string;
  items: string[];
  listType: "ordered" | "unordered" | null;
};

const ignoredWords = new Set(["about", "after", "again", "could", "does", "from", "have", "help", "into", "north", "please", "should", "that", "their", "there", "these", "they", "this", "what", "when", "where", "which", "with", "would", "your"]);

function terms(value: string) {
  return [...new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((word) => word.length > 2 && !ignoredWords.has(word)))];
}

function searchableTerms(value: string) {
  return new Set(terms(value));
}

function asksForSteps(question: string) {
  return /\b(?:how (?:do|can) i|how to|steps?|step by step|walk me through)\b/i.test(question);
}

function firstSentence(value: string) {
  return value.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() ?? value.trim();
}

function numberedGuideSteps(source: GuideAgentSource) {
  const items = source.steps.slice(0, 3).map((step) => {
    const sentence = firstSentence(step.body);
    return sentence.length <= 115 ? sentence : `${step.title.replace(/[.!?]+$/, "")}.`;
  });
  return `${source.summary}\n${items.map((item, index) => `${index + 1}. ${item}`).join("\n")}`;
}

export function splitGuideAnswer(answer: string): GuideAnswerParts {
  const lines = answer.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const numbered = /^\d+[.)]\s+(.+)$/;
  const bulleted = /^[-•]\s+(.+)$/;
  const firstListLine = lines.findIndex((line) => numbered.test(line) || bulleted.test(line));
  if (firstListLine < 0) return { introduction: answer, items: [], listType: null };
  const matcher = numbered.test(lines[firstListLine]) ? numbered : bulleted;
  const items = lines.slice(firstListLine).map((line) => line.match(matcher)?.[1]).filter((item): item is string => Boolean(item));
  if (!items.length) return { introduction: answer, items: [], listType: null };
  return { introduction: lines.slice(0, firstListLine).join(" "), items, listType: matcher === numbered ? "ordered" : "unordered" };
}

export function guideAgentSmallTalk(question: string) {
  const normalized = question.trim().toLowerCase().replace(/[^a-z ]/g, "").trim();
  if (/^(hey|hi|hello|hiya|good morning|good afternoon|good evening)$/.test(normalized)) {
    return "Hi. What would you like help with in North? You can ask me where something is or how to do it.";
  }
  if (/^(thanks|thank you|cheers)$/.test(normalized)) return "You’re welcome. Ask me whenever you need help finding something in North.";
  return null;
}

function sourceFromArticle(article: GuideArticle): GuideAgentSource {
  return {
    id: article.id,
    title: article.title,
    topic: article.topic,
    summary: article.summary,
    introduction: article.introduction,
    steps: article.steps,
    remember: article.remember,
    action: article.action,
  };
}

export function findGuideAgentSources(question: string, limit = 3) {
  const query = question.trim().toLowerCase();
  const queryTerms = terms(query);
  const wantsPlanningHorizon = /\b(?:how many|number of) weeks?\b|\bweeks?\b.*\b(?:plan|schedule|workout|block)\b/.test(query);
  const wantsPastWorkouts = /\b(?:past|previous|old|history|completed)\b.*\b(?:workouts?|sessions?)\b|\b(?:workouts?|sessions?)\b.*\b(?:past|previous|old|history|completed)\b/.test(query);
  const wantsAtlasExport = /\b(?:export|download|png|image|recap|share)\b.*\b(?:atlas|recap|summary)\b|\b(?:atlas|recap)\b.*\b(?:export|download|png|image|share)\b/.test(query);
  const wantsMuscleMap = /\b(?:see|show|view|check|using|used|worked|target)\b.*\bmuscles?\b|\bmuscles?\b.*\b(?:see|show|view|check|using|used|worked|target)\b/.test(query);
  const wantsToBuildWorkout = !wantsPlanningHorizon && /\b(build|create|make|design)\b.*\b(workout|routine)\b|\b(workout|routine)\b.*\b(build|create|make|design)\b/.test(query);
  const wantsToAdjustWorkout = /\b(adjust|change|edit|swap|replace|add|remove)\b.*\b(active|current|live|during|while|set|exercise)\b/.test(query);
  return guideArticles
    .map((article) => {
      const title = article.title.toLowerCase();
      const searchTerms = article.searchTerms.join(" ").toLowerCase();
      const detail = `${article.summary} ${article.introduction} ${article.steps.map((step) => `${step.title} ${step.body}`).join(" ")}`.toLowerCase();
      const titleTerms = searchableTerms(title);
      const articleSearchTerms = searchableTerms(searchTerms);
      const detailTerms = searchableTerms(detail);
      let score = title === query || article.searchTerms.some((term) => term.toLowerCase() === query) ? 20 : 0;
      for (const term of queryTerms) {
        if (titleTerms.has(term)) score += 7;
        if (articleSearchTerms.has(term)) score += 5;
        if (detailTerms.has(term)) score += 2;
      }
      if (wantsToBuildWorkout && article.id === "build-a-strength-workout") score += 40;
      if (wantsToBuildWorkout && article.id === "adjust-an-active-workout") score -= 20;
      if (wantsToAdjustWorkout && article.id === "adjust-an-active-workout") score += 30;
      if (wantsPlanningHorizon && article.id === "plan-a-week-and-block") score += 50;
      if (wantsPastWorkouts && article.id === "find-and-revisit-journey-records") score += 50;
      if (wantsPastWorkouts && article.id === "find-and-keep-workouts") score -= 30;
      if (wantsAtlasExport && article.id === "export-a-training-recap") score += 50;
      if (wantsMuscleMap && article.id === "today-muscle-map") score += 50;
      if (wantsMuscleMap && article.id === "guided-north-tour") score -= 30;
      return { article, score };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ article }) => sourceFromArticle(article));
}

export function guideAgentFallback(question: string, sources = findGuideAgentSources(question)) {
  const smallTalk = guideAgentSmallTalk(question);
  if (smallTalk) return smallTalk;
  const primary = sources[0];
  if (!primary) return "I’m not sure from the North Guide. Try asking where a feature is or how to do one task. For advice about your own training, ask Nova.";
  if (primary.id === "build-a-strength-workout") return "To make a workout:\n1. Open Build workout and give it a name.\n2. Choose your exercises, then set the sets, target and rest for each one.\n3. Save it so you can use it again.";
  if (primary.id === "find-and-revisit-journey-records") return "To check past workouts:\n1. Open Journey.\n2. Choose Workouts, then select a date if you want to narrow the list.\n3. Open a workout to see its full record.";
  if (primary.id === "export-a-training-recap") return "To export an Atlas recap as an image:\n1. In Journey, set the Training Atlas period and metric you want.\n2. Open the recap and choose square or landscape.\n3. Preview it, then choose Download or Share.";
  if (primary.id === "plan-a-week-and-block" && /\bweeks?\b/i.test(question)) return "You can plan workouts across a 12-week block. Start with one week, copy that rhythm forward, then change any future day separately.";
  if (primary.id === "adjust-an-active-workout") return "During a workout, you can add or remove an unfinished set, swap an exercise, or pass it and return later. North only records work you mark as complete.";
  if (primary.id === "sets-reps-and-rest") return "A rep is one complete movement. A set is a group of reps before you rest. For example, 3 sets of 10 means do 10 reps, rest, and repeat twice more.";
  if (asksForSteps(question)) return numberedGuideSteps(primary);
  return `${primary.summary} ${primary.steps[0]?.body ?? primary.introduction}`;
}
