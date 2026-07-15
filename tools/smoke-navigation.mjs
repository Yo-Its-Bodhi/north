const targets = await fetch("http://127.0.0.1:9222/json").then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No Chrome page target found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function command(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
await command("Page.navigate", { url: "http://127.0.0.1:5173/" });
await pause(1000);

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true });
  return result.result.value;
}

const today = await evaluate("document.body.innerText.includes('Good morning, Dru.')");
const trainingClicked = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Training'));
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(250);
const training = await evaluate("document.body.innerText.includes('Your practical space for today')");
const prepareClicked = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Prepare workout'));
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(250);
const prepare = await evaluate("document.body.innerText.includes('Review the order') && document.body.innerText.includes('Add an exercise')");
const adjustClicked = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.trim() === 'Adjust');
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(200);
const adjustments = await evaluate("document.body.innerText.includes('PLANNED LOAD') && document.body.innerText.includes('TARGET') && document.body.innerText.includes('REST')");
const backToToday = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Today'));
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(200);
const trainingAgain = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.trim() === 'Training');
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(200);
const weeklyPlan = await evaluate("document.body.innerText.includes('Your rhythm') && document.body.innerText.includes('Move outside the plan')");
const activityClicked = await evaluate(`(() => {
  const button = document.querySelector('.activity-shortcuts button');
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(200);
const activityLog = await evaluate("document.body.innerText.includes('Capture what happened') && document.body.innerText.includes('Save to Journey')");
const seededSession = [{
  startedAt: "2026-07-14T12:00:00.000Z", finishedAt: "2026-07-14T13:00:00.000Z", currentId: "press", energy: 4, difficulty: 3, reflection: "Strong, controlled session.",
  exercises: [{ id: "press", name: "Incline dumbbell press", target: "3 sets · 8–10 reps", rest: 90, previous: "45 lb", cue: "Control the return.", note: "Last set was hard.", passed: false, sets: [{ weight: "45", reps: "10", complete: true }, { weight: "45", reps: "9", complete: true }, { weight: "45", reps: "8", complete: true }] }],
}];
await evaluate(`localStorage.setItem('north-session-history-v1', ${JSON.stringify(JSON.stringify(seededSession))})`);
await command("Page.reload");
await pause(500);
const trainingForHistory = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.trim() === 'Training');
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(200);
const historyClicked = await evaluate(`(() => {
  const button = document.querySelector('.recent-sessions > button');
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(200);
const historyDetail = await evaluate("document.body.innerText.includes('COMPLETED WORKOUT') && document.body.innerText.includes('Last set was hard.') && document.body.innerText.includes('Copy for coach')");
const correctClicked = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Correct record'));
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(150);
const correctionInputs = await evaluate("document.querySelectorAll('.history-sets input').length === 6");
await command("Page.reload");
await pause(350);
const trainingForImport = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.trim() === 'Training');
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(150);
const importClicked = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Import from coach'));
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(150);
const coachImport = await evaluate("document.body.innerText.includes('Recommended format') && document.body.innerText.includes('Import and review')");
await command("Page.reload");
await pause(350);
const checkInClicked = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('How are you arriving'));
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(150);
const checkIn = await evaluate("document.body.innerText.includes('DAILY CHECK-IN') && document.body.innerText.includes('Save check-in')");
await command("Page.reload");
await pause(350);
const journeyClicked = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.trim() === 'Journey');
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(150);
const weeklyReviewClicked = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.includes('Reflect on this week'));
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(150);
const weeklyReview = await evaluate("document.body.innerText.includes('WEEKLY REVIEW') && document.body.innerText.includes('Save weekly reflection')");
await command("Page.reload");
await pause(350);
const youClicked = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.trim() === 'You');
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(150);
const dataOwnership = await evaluate("document.body.innerText.includes('Export North backup') && document.body.innerText.includes('Restore a backup') && document.body.innerText.includes('Erase local data')");
const testLogClicked = await evaluate(`(() => {
  const button = document.querySelector('.test-log-link');
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(150);
const testLog = await evaluate("document.body.innerText.includes('GYM TEST') && document.body.innerText.includes('Save observation')");
const testLogBack = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.trim() === 'Back');
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(150);
const insightClicked = await evaluate(`(() => {
  const button = document.querySelector('.learned-list button');
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(150);
const insightEvidence = await evaluate("document.querySelector('.learned-list button p') !== null");
const novaFromEvidence = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.innerText.trim() === 'Nova');
  if (!button) return false;
  button.click();
  return true;
})()`);
await pause(150);
const novaPrompt = await evaluate("document.body.innerText.includes('still building context together')");

console.log(JSON.stringify({ today, trainingClicked, training, prepareClicked, prepare, adjustClicked, adjustments, backToToday, trainingAgain, weeklyPlan, activityClicked, activityLog, trainingForHistory, historyClicked, historyDetail, correctClicked, correctionInputs, trainingForImport, importClicked, coachImport, checkInClicked, checkIn, journeyClicked, weeklyReviewClicked, weeklyReview, youClicked, dataOwnership, testLogClicked, testLog, testLogBack, insightClicked, insightEvidence, novaFromEvidence, novaPrompt }));
socket.close();
if (![today, trainingClicked, training, prepareClicked, prepare, adjustClicked, adjustments, backToToday, trainingAgain, weeklyPlan, activityClicked, activityLog, trainingForHistory, historyClicked, historyDetail, correctClicked, correctionInputs, trainingForImport, importClicked, coachImport, checkInClicked, checkIn, journeyClicked, weeklyReviewClicked, weeklyReview, youClicked, dataOwnership, testLogClicked, testLog, testLogBack, insightClicked, insightEvidence, novaFromEvidence, novaPrompt].every(Boolean)) process.exit(1);
