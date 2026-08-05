import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { findGuideAgentSources, guideAgentFallback, guideAgentSmallTalk, splitGuideAnswer } from "../src/data/guideAgent.ts";
import { registerGuideRoutes } from "../server/guide-routes.mjs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const agentSource = readFileSync(new URL("../src/components/NorthGuideAgent.tsx", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../server/guide-routes.mjs", import.meta.url), "utf8");

test("Guide agent retrieves the right North knowledge", () => {
  assert.equal(findGuideAgentSources("What can Nova do?")[0]?.id, "ask-nova");
  assert.equal(findGuideAgentSources("How do I build my own workout?")[0]?.id, "build-a-strength-workout");
  assert.equal(findGuideAgentSources("how can i make a workout")[0]?.id, "build-a-strength-workout");
  assert.equal(findGuideAgentSources("how to check my past workouts")[0]?.id, "find-and-revisit-journey-records");
  assert.equal(findGuideAgentSources("how do i export a png from atlas?")[0]?.id, "export-a-training-recap");
  assert.equal(findGuideAgentSources("how many weeks can i make a workout for")[0]?.id, "plan-a-week-and-block");
  assert.equal(findGuideAgentSources("how to see what muscles im using")[0]?.id, "today-muscle-map");
  assert.equal(findGuideAgentSources("How does Samsung Health Connect sync?")[0]?.id, "samsung-health-and-health-connect");
  assert.ok(findGuideAgentSources("Where can I find an old Journey record?").some((source) => source.id === "find-and-revisit-journey-records"));
});

test("Guide agent fallback is grounded in the matched article", () => {
  const answer = guideAgentFallback("How do sets and reps work?");
  assert.match(answer, /A rep is one complete movement/i);
  assert.match(answer, /3 sets of 10/i);
  assert.doesNotMatch(answer, /I think|probably|maybe/i);
  assert.ok(answer.length < 300);
});

test("Guide agent handles simple conversation without inventing a help topic", () => {
  assert.match(guideAgentSmallTalk("hey"), /What would you like help with/i);
  assert.equal(findGuideAgentSources("hey").length, 0);
  assert.equal(guideAgentFallback("hey"), "Hi. What would you like help with in North? You can ask me where something is or how to do it.");
  const workoutAnswer = guideAgentFallback("how can i make a workout");
  assert.deepEqual(splitGuideAnswer(workoutAnswer), {
    introduction: "To make a workout:",
    items: [
      "Open Build workout and give it a name.",
      "Choose your exercises, then set the sets, target and rest for each one.",
      "Save it so you can use it again.",
    ],
    listType: "ordered",
  });
});

test("Guide answer formatting preserves prose and recognizes deliberate lists", () => {
  assert.deepEqual(splitGuideAnswer("A plain answer stays plain."), { introduction: "A plain answer stays plain.", items: [], listType: null });
  assert.deepEqual(splitGuideAnswer("Keep these in mind:\n- First thing\n- Second thing"), { introduction: "Keep these in mind:", items: ["First thing", "Second thing"], listType: "unordered" });
  assert.match(agentSource, /answer\.listType && <List>/);
  assert.match(routeSource, /step-by-step question/);
});

test("Guide agent is a desktop concierge while Account keeps the full text Guide", () => {
  assert.match(appSource, /screen !== "workout" && screen !== "test-log" && <NorthGuideAgent/);
  assert.match(appSource, /settings-account-actions[\s\S]*<strong>North Guide<\/strong>/);
  assert.match(agentSource, /Full text Guide/);
  assert.match(agentSource, /onOpenArticle\(message\.sources!\[0\]\.id\)/);
  assert.match(agentSource, /onOpenAction\(message\.sources!\[0\]\.action!\)/);
});

test("Guide AI route is authenticated, limited and cannot become Nova", async () => {
  let registered;
  const authenticate = Symbol("authenticate");
  registerGuideRoutes({ authenticate, post: (path, options, handler) => { registered = { path, options, handler }; } });
  assert.equal(registered.path, "/v1/guide/respond");
  assert.equal(registered.options.preHandler, authenticate);
  assert.equal(registered.options.config.rateLimit.max, 30);
  assert.match(routeSource, /You are not Nova/);
  assert.match(routeSource, /do not inspect personal records/);
  assert.match(routeSource, /do not[\s\S]*change data/);
  const reply = { status: 200, code(value) { this.status = value; return this; }, send(value) { return value; } };
  const result = await registered.handler({ body: {} }, reply);
  assert.equal(reply.status, 400);
  assert.match(result.error, /question/i);
});

test("Guide procedural fallbacks use short numbered actions", () => {
  const pastWorkouts = splitGuideAnswer(guideAgentFallback("how to check my past workouts"));
  assert.equal(pastWorkouts.listType, "ordered");
  assert.deepEqual(pastWorkouts.items, [
    "Open Journey.",
    "Choose Workouts, then select a date if you want to narrow the list.",
    "Open a workout to see its full record.",
  ]);

  const atlasExport = splitGuideAnswer(guideAgentFallback("how do i export a png from atlas?"));
  assert.deepEqual(atlasExport.items, [
    "In Journey, set the Training Atlas period and metric you want.",
    "Open the recap and choose square or landscape.",
    "Preview it, then choose Download or Share.",
  ]);

  const muscleMap = splitGuideAnswer(guideAgentFallback("how to see what muscles im using"));
  assert.equal(muscleMap.listType, "ordered");
  assert.match(muscleMap.items[0], /expand button on Today/i);
  assert.ok(muscleMap.items.every((item) => item.length <= 115));
  assert.match(guideAgentFallback("how many weeks can i make a workout for"), /12-week block/i);
});