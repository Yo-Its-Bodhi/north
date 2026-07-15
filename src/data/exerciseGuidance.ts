import type { ExerciseDefinition } from "./exercises";

export type ExerciseGuidance = {
  setup: string[];
  execution: string[];
  mistakes: string[];
  breathing: string;
};

const guides: Array<{ match: RegExp; guide: ExerciseGuidance }> = [
  { match: /squat|leg press|lunge|step/i, guide: { setup: ["Set your feet where the hips and knees can track comfortably.", "Brace your trunk before accepting the load."], execution: ["Lower with control while keeping pressure through the whole foot.", "Let the knees track with the toes.", "Drive the floor away without losing your trunk position."], mistakes: ["Knees collapsing inward", "Heels lifting", "Rushing the bottom position"], breathing: "Breathe in and brace before lowering; exhale after the hardest part of the ascent." } },
  { match: /deadlift|romanian|good morning|hip hinge|pull-through/i, guide: { setup: ["Stand close to the load and soften the knees.", "Set the ribs over the pelvis and engage the lats."], execution: ["Push the hips back while keeping the load close.", "Stop when hamstring tension or position limits the range.", "Drive the hips through without leaning back."], mistakes: ["Reaching the load away from the body", "Turning the movement into a squat", "Overextending at lockout"], breathing: "Take a full brace before each repetition; exhale once the hips pass the sticking point." } },
  { match: /bench press|chest press|dumbbell press|push-up|floor press/i, guide: { setup: ["Plant your feet and set the shoulder blades against the support.", "Stack wrists over forearms with a grip you can control."], execution: ["Lower toward the chest with the elbows slightly tucked.", "Keep shoulders anchored as the load reaches the bottom.", "Press smoothly while maintaining the same body position."], mistakes: ["Wrists folding backward", "Shoulders rolling forward", "Bouncing or shortening the controlled range"], breathing: "Inhale and brace before lowering; exhale through the press without losing trunk tension." } },
  { match: /overhead press|shoulder press|push press|landmine press/i, guide: { setup: ["Stack ribs over pelvis and squeeze the glutes.", "Begin with forearms under the load."], execution: ["Press upward without flaring the ribs.", "Move the head naturally out of and back into the load path.", "Finish with control rather than shrugging aggressively."], mistakes: ["Leaning back to create range", "Pressing around the body", "Losing wrist alignment"], breathing: "Brace before the press; exhale near lockout and reset before the next repetition." } },
  { match: /row/i, guide: { setup: ["Choose a stable torso position and reach without losing it.", "Set the shoulder away from the ear."], execution: ["Pull the elbow toward the hip or lower ribs.", "Pause briefly without twisting the torso.", "Return under control to a comfortable stretch."], mistakes: ["Shrugging toward the ear", "Using torso rotation for momentum", "Dropping the load through the return"], breathing: "Exhale as you row; inhale during the controlled reach." } },
  { match: /pull-up|chin-up|pulldown/i, guide: { setup: ["Use a grip that lets the shoulders move comfortably.", "Begin tall through the trunk rather than swinging."], execution: ["Drive the elbows down toward the sides.", "Keep the neck relaxed as the chest approaches the bar or handle.", "Return to a controlled overhead reach."], mistakes: ["Kicking or swinging", "Pulling behind the neck", "Stopping every repetition short"], breathing: "Exhale through the pull; inhale as the arms return overhead." } },
  { match: /curl/i, guide: { setup: ["Stand or sit tall with the upper arms supported or still.", "Start with a neutral wrist."], execution: ["Curl without driving the elbows forward.", "Squeeze briefly at the top.", "Lower to a controlled elbow extension."], mistakes: ["Swinging the torso", "Letting wrists collapse", "Dropping the lowering phase"], breathing: "Exhale while curling; inhale while lowering." } },
  { match: /pushdown|triceps|skull crusher|extension/i, guide: { setup: ["Create a stable trunk and comfortable shoulder position.", "Keep wrists aligned with the forearms."], execution: ["Move mainly through the elbow.", "Reach a controlled end position without forcing the joint.", "Return slowly while keeping the upper arm organised."], mistakes: ["Using the torso to move the load", "Elbows drifting every repetition", "Forcing painful lockout"], breathing: "Exhale through the extension; inhale on the return." } },
  { match: /plank|crunch|sit-up|leg raise|pallof|rollout|twist/i, guide: { setup: ["Set ribs over pelvis and create gentle full-body tension.", "Choose a range that does not provoke back or neck discomfort."], execution: ["Move slowly while keeping the intended trunk position.", "Pause where control is hardest.", "Return without dropping tension."], mistakes: ["Holding the breath for the entire set", "Using momentum", "Chasing range after trunk position is lost"], breathing: "Use controlled breaths behind the brace; exhale during the hardest portion." } },
];

const fallback: ExerciseGuidance = {
  setup: ["Choose a stable position and a load you can control.", "Set the working joint in a comfortable, repeatable alignment."],
  execution: ["Move through a pain-free range with steady tempo.", "Keep the intended body position throughout the repetition.", "Finish each repetition under control."],
  mistakes: ["Using momentum before technique is stable", "Forcing painful range", "Increasing load after control is lost"],
  breathing: "Exhale through the effort and inhale during the controlled return.",
};

export function getExerciseGuidance(exercise?: Pick<ExerciseDefinition, "name" | "movementPattern"> | null): ExerciseGuidance {
  if (!exercise) return fallback;
  const searchable = `${exercise.name} ${exercise.movementPattern}`;
  return guides.find((entry) => entry.match.test(searchable))?.guide ?? fallback;
}
