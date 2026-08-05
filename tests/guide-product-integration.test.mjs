import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { guideArticles, guideTopics, productTourGuideSteps } from "../src/data/guide.ts";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const guideSource = readFileSync(new URL("../src/components/NorthGuide.tsx", import.meta.url), "utf8");
const anatomySource = readFileSync(new URL("../src/components/AnatomyMap.tsx", import.meta.url), "utf8");
const guideStyles = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");

test("the North Guide is owned by Account settings rather than You", () => {
  assert.match(appSource, /"you" \| "guide" \| "account"/);
  assert.match(appSource, /className="account-menu-grid settings-account-actions"[\s\S]*<strong>North Guide<\/strong>/);
  assert.match(appSource, /settings-account-hero[\s\S]*settings-account-session-actions[\s\S]*onClick=\{signOutAccount\}[\s\S]*Log out/);
  assert.match(appSource, /settings-account-actions[\s\S]*<strong>Account &amp; devices<\/strong>[\s\S]*<strong>North Guide<\/strong>/);
  assert.match(appSource, /function exitPreview\(\)[\s\S]*setEntryComplete\(false\)/);
  assert.match(appSource, /className="settings-signout-button" onClick=\{exitPreview\}[\s\S]*<strong>Exit preview<\/strong>/);
  assert.match(appSource, /screen === "guide" && <NorthGuide/);
  assert.match(appSource, /backLabel=\{guideReturnScreen === "settings"/);
  assert.match(appSource, /onBack=\{\(\) => setScreen\(guideReturnScreen\)\}/);
  assert.match(appSource, /className="primary-nav-utility"/);
  assert.match(appSource, /screen === "guide" \? "active"/);
  assert.match(appSource, /screen === "settings" \? "active"/);
  assert.match(appSource, /onNavigate\("settings"\)[\s\S]*?<SlidersHorizontal size=\{18\} \/>[\s\S]*?<span>Account<\/span>/);
  assert.match(guideStyles, /:root \.member-shell \.settings-section-menu \{[\s\S]*display: grid/);
  assert.match(guideStyles, /settings-screen\[data-settings-view="index"\][\s\S]*\.data-controls[\s\S]*display: none/);
  assert.match(guideStyles, /settings-screen \.settings-account-actions > button \{[\s\S]*border-radius: 0/);
  assert.match(appSource, /settingsView === "index" \? "You" : "Account"/);
  assert.match(appSource, /data-settings-view=\{settingsView\}>[\s\S]*?<header className="settings-page-header[\s\S]*?<button className="back-button"/);
  assert.match(guideStyles, /settings-screen > \.back-button \{ margin: -14px 0 14px; \}/);
  assert.match(guideStyles, /@media \(min-width: 1024px\)[\s\S]*\.guide-screen[\s\S]*> \.back-button \{ display: none; \}/);
  assert.match(appSource, /screen === "account"[\s\S]*?\? "you"/);
  assert.doesNotMatch(appSource, /you-account-menu/);
  assert.doesNotMatch(appSource, /\{ id: "account", label: "Account & app" \}/);
});

test("starter Guide content is structured for beginners", () => {
  assert.equal(guideArticles.length, 29);
  assert.equal(new Set(guideArticles.map((article) => article.id)).size, guideArticles.length);
  for (const article of guideArticles) {
    assert.ok(article.title.length > 5, `${article.id} needs a useful title`);
    assert.ok(article.summary.length > 20, `${article.id} needs a plain summary`);
    assert.ok(article.introduction.length > 40, `${article.id} needs an introduction`);
    assert.ok(article.steps.length >= 4, `${article.id} needs at least four steps`);
    assert.ok(article.steps.every((step) => step.title && step.body.length > 20), `${article.id} has an incomplete step`);
    assert.ok(article.remember.length > 20, `${article.id} needs a calm takeaway`);
    assert.ok(article.searchTerms.length >= 4, `${article.id} needs beginner search language`);
  }
});

test("the starter Guide covers every launch topic", () => {
  for (const topic of guideTopics.filter((item) => item !== "All")) {
    assert.ok(guideArticles.some((article) => article.topic === topic), `${topic} has no Guide article`);
  }
  assert.ok(guideArticles.some((article) => article.id === "sets-reps-and-rest"));
  assert.ok(guideArticles.some((article) => article.id === "samsung-health-and-health-connect"));
  assert.ok(guideArticles.some((article) => article.id === "account-sync-and-recovery"));
});

test("Guide search, article reading and deep links share one content source", () => {
  assert.match(guideSource, /useDeferredValue/);
  assert.match(guideSource, /article\.searchTerms\.join/);
  assert.match(guideSource, /setSelectedArticle\(article\)/);
  assert.match(guideSource, /selectedArticle\.steps\.map/);
  assert.match(guideSource, /onOpen\(selectedArticle\.action!\)/);
});

test("Guide and Today reuse the existing full-screen anatomy explorer", () => {
  const anatomyArticle = guideArticles.find((article) => article.id === "today-muscle-map");
  assert.equal(anatomyArticle?.action?.intent, "open-today-anatomy");
  assert.match(appSource, /setGuideArticleRequest\("today-muscle-map"\)/);
  assert.match(appSource, /initiallyExpanded=\{todayAnatomyRequested\}/);
  assert.match(anatomySource, /useState\(initiallyExpanded\)/);
  assert.equal((appSource.match(/<AnatomyMap compact showBack=\{false\} expandable/g) ?? []).length, 1);
});

test("Guide controls remain usable on narrow screens", () => {
  assert.match(guideStyles, /\.guide-topics \{[^}]*overflow-x: auto/s);
  assert.match(guideStyles, /@media \(max-width: 600px\)[\s\S]*\.guide-open-action \{ width: 100%; min-height: 48px; \}/);
  assert.match(guideStyles, /\.guide-search button \{[^}]*min-height: 44px/s);
});

test("the existing product tour is resumable and Guide-launched", () => {
  const tourArticle = guideArticles.find((article) => article.id === "guided-north-tour");
  const oneMinuteArticle = guideArticles.find((article) => article.id === "north-in-one-minute");
  assert.equal(tourArticle?.action?.intent, "start-product-tour");
  assert.equal(productTourGuideSteps.length, 5);
  assert.equal(oneMinuteArticle?.steps, productTourGuideSteps);
  assert.match(appSource, /\.map\(\(step, index\) => \(\{ \.\.\.step, \.\.\.productTourGuideSteps\[index\] \}\)\)/);
  assert.match(appSource, /type ProductTourProgress = \{ step: number; completed: boolean; updatedAt: string \}/);
  assert.match(appSource, /writeProductTourProgress\(tourStep, false\)/);
  assert.match(appSource, />Save & close<\/button>/);
  assert.match(appSource, /if \(action\.intent === "start-product-tour"\) \{ startOrResumeProductTour\(\); return; \}/);
  assert.match(appSource, /const step = progress && !progress\.completed/);
});

test("Guide explains Journey ordering, This Day, and current preference limits", () => {
  const journeyArticle = guideArticles.find((article) => article.id === "find-and-revisit-journey-records");
  const preferencesArticle = guideArticles.find((article) => article.id === "personal-details-and-preferences");
  assert.ok(journeyArticle?.steps.some((step) => /oldest first/i.test(step.body)));
  assert.ok(journeyArticle?.steps.some((step) => /one week, one month, six months, or one year/i.test(step.body)));
  assert.ok(preferencesArticle?.steps.some((step) => /does not mean every North screen/i.test(step.body)));
  assert.ok(preferencesArticle?.steps.some((step) => /does not guarantee a notification/i.test(step.body)));
});

test("Guide distinguishes observations, plan changes, and active workout evidence", () => {
  const todayArticle = guideArticles.find((article) => article.id === "understand-today");
  const planningArticle = guideArticles.find((article) => article.id === "plan-a-week-and-block");
  const workoutArticle = guideArticles.find((article) => article.id === "complete-a-workout");
  assert.ok(todayArticle?.steps.some((step) => /personal observations, not measurements or medical conclusions/i.test(step.body)));
  assert.ok(planningArticle?.steps.some((step) => /does not create a completed workout/i.test(step.body)));
  assert.ok(planningArticle?.steps.some((step) => /entered later/i.test(step.body)));
  assert.ok(workoutArticle?.steps.some((step) => /historical reference/i.test(step.body)));
  assert.ok(workoutArticle?.steps.some((step) => /duration you actually held/i.test(step.body)));
  assert.ok(workoutArticle?.steps.some((step) => /optional, off-by-default account preference/i.test(step.body)));
  assert.ok(workoutArticle?.steps.some((step) => /not a guarantee/i.test(step.body)));
});

test("Guide explains You evidence windows and device-wipe prerequisites", () => {
  const youArticle = guideArticles.find((article) => article.id === "understand-you-signals-and-trends");
  const dataArticle = guideArticles.find((article) => article.id === "local-data-and-sync-conflicts");
  assert.ok(youArticle?.steps.some((step) => /latest 14 saved check-ins/i.test(step.body)));
  assert.ok(youArticle?.steps.some((step) => /does not delete the workouts or check-ins/i.test(step.body)));
  assert.ok(dataArticle?.steps.some((step) => /Unsynced local changes can be lost/i.test(step.body)));
  assert.ok(dataArticle?.steps.some((step) => /requires sign-in, a connection, and a successful account pull/i.test(step.body)));
});

test("Guide covers exercise filtering, template edits, and Community removal", () => {
  const builderArticle = guideArticles.find((article) => article.id === "build-a-strength-workout");
  const communityArticle = guideArticles.find((article) => article.id === "share-a-community-workout");
  assert.ok(builderArticle?.steps.some((step) => /body area, equipment, movement, difficulty, type, position, place, or target muscle/i.test(step.body)));
  assert.ok(builderArticle?.steps.some((step) => /do not rewrite completed sessions/i.test(step.body)));
  assert.ok(communityArticle?.steps.some((step) => /unpublishes the public version/i.test(step.body)));
  assert.ok(communityArticle?.steps.some((step) => /copies other members already saved remain/i.test(step.body)));
});

test("Guide states account rules, direction limits, and memory consent", () => {
  const setupArticle = guideArticles.find((article) => article.id === "set-up-north");
  const accountArticle = guideArticles.find((article) => article.id === "account-sync-and-recovery");
  assert.ok(setupArticle?.steps.some((step) => /planning directions, not promised outcomes/i.test(step.body)));
  assert.ok(setupArticle?.steps.some((step) => /can still use planning, recording, Journey, and the Guide without it/i.test(step.body)));
  assert.match(accountArticle?.introduction ?? "", /3–30.+at least 10 characters/i);
  assert.ok(accountArticle?.steps.some((step) => /cannot email the original code back/i.test(step.body)));
  assert.ok(accountArticle?.steps.some((step) => /invalidates the old code/i.test(step.body)));
});

test("Guide states Journey photo limits and Nova context consequences", () => {
  const photoArticle = guideArticles.find((article) => article.id === "use-journey-photos");
  const novaArticle = guideArticles.find((article) => article.id === "ask-nova");
  assert.ok(photoArticle?.steps.some((step) => /under 2 MB/i.test(step.body)));
  assert.ok(photoArticle?.steps.some((step) => /newest 20 photos/i.test(step.body)));
  assert.ok(novaArticle?.steps.some((step) => /priority from 1 to 5/i.test(step.body)));
  assert.ok(novaArticle?.steps.some((step) => /Draft is not yet current.+abandoned records/i.test(step.body)));
  assert.ok(novaArticle?.steps.some((step) => /usual locations, home equipment, gym access, and preferred training time/i.test(step.body)));
  assert.ok(novaArticle?.steps.some((step) => /Every field is optional/i.test(step.body)));
});

test("Guide defines exercise profiles, prescriptions, rest, and substitutions without recommendation claims", () => {
  const builderArticle = guideArticles.find((article) => article.id === "build-a-strength-workout");
  const workoutArticle = guideArticles.find((article) => article.id === "complete-a-workout");
  const adjustmentArticle = guideArticles.find((article) => article.id === "adjust-an-active-workout");
  assert.ok(builderArticle?.steps.some((step) => /catalogue difficulty, accessibility tags, personal history, and muscles by role/i.test(step.body)));
  assert.ok(builderArticle?.steps.some((step) => /1–10 planned sets.+0–600 seconds of rest/i.test(step.body)));
  assert.ok(builderArticle?.steps.some((step) => /editable starting points, not physiological recommendations/i.test(step.body)));
  assert.ok(workoutArticle?.steps.some((step) => /add or remove 15 seconds, or skip/i.test(step.body)));
  assert.ok(workoutArticle?.steps.some((step) => /not a recovery guarantee or medical recommendation/i.test(step.body)));
  assert.ok(adjustmentArticle?.steps.some((step) => /not identical, medically suitable, or guaranteed/i.test(step.body)));
  assert.ok(adjustmentArticle?.steps.some((step) => /rebuilds its prescription.+preserving your exercise note/i.test(step.body)));
});

test("Guide defines Health Connect daily fields using imported record semantics", () => {
  const healthArticle = guideArticles.find((article) => article.id === "health-metrics-and-weight");
  assert.ok(healthArticle?.steps.some((step) => /step-count total.+Distance-record total/i.test(step.body)));
  assert.ok(healthArticle?.steps.some((step) => /duration of shared exercise sessions, not Samsung’s broader active-time estimate/i.test(step.body)));
  assert.ok(healthArticle?.steps.some((step) => /start-to-end duration of sleep sessions.+day it ended/i.test(step.body)));
  assert.ok(healthArticle?.steps.some((step) => /Total calories.+include resting energy/i.test(step.body)));
  assert.ok(healthArticle?.steps.some((step) => /does not convert one kind into the other/i.test(step.body)));
});

test("exercise favourites have a synced return surface in Training", () => {
  const builderArticle = guideArticles.find((article) => article.id === "build-a-strength-workout");
  assert.match(appSource, /className="favorite-exercises-section"/);
  assert.match(appSource, /openExercisePreview\(exercise, "training"\)/);
  assert.match(appSource, /exerciseDetailReturn === "training" \? "Training"/);
  assert.match(appSource, /persistAccountJson\("north-favorite-exercises-v1", "favorite-exercises", favoriteExerciseNames\)/);
  assert.ok(builderArticle?.steps.some((step) => /return in Training under Favourite exercises and sync/i.test(step.body)));
  assert.ok(builderArticle?.steps.some((step) => /does not delete workouts, plans, or completed history/i.test(step.body)));
});