export type ExerciseDefinition = {
  name: string;
  category: string;
  equipment: string;
  aliases: string[];
  target: string;
  rest: number;
  weight: string;
  previous: string;
  cue: string;
  locations: Array<"Gym" | "Home" | "Outdoor" | "Anywhere">;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  movementPattern: string;
  substitutions: string[];
  safetyNote: string;
};

const groups: Record<string, string[]> = {
  Chest: [
    "Barbell bench press|Barbell|bench press", "Close-grip bench press|Barbell", "Wide-grip bench press|Barbell", "Incline barbell bench press|Barbell", "Decline barbell bench press|Barbell", "Floor press|Barbell", "Paused bench press|Barbell", "Spoto press|Barbell", "Pin press|Barbell", "Flat dumbbell press|Dumbbell", "Incline dumbbell press|Dumbbell", "Decline dumbbell press|Dumbbell", "Dumbbell floor press|Dumbbell", "Dumbbell squeeze press|Dumbbell|hex press", "Alternating dumbbell press|Dumbbell", "Single-arm dumbbell press|Dumbbell", "Machine chest press|Machine", "Incline machine press|Machine", "Decline machine press|Machine", "Plate-loaded chest press|Machine", "Smith machine bench press|Smith machine", "Smith machine incline press|Smith machine", "Cable chest press|Cable", "Single-arm cable press|Cable", "Standing cable press|Cable", "Cable fly|Cable", "Low-to-high cable fly|Cable", "High-to-low cable fly|Cable", "Pec deck fly|Machine", "Dumbbell fly|Dumbbell", "Incline dumbbell fly|Dumbbell", "Push-up|Bodyweight", "Incline push-up|Bodyweight", "Decline push-up|Bodyweight", "Diamond push-up|Bodyweight", "Wide push-up|Bodyweight", "Deficit push-up|Bodyweight", "Ring push-up|Rings", "Chest dip|Dip station", "Landmine chest press|Landmine"
  ],
  Back: [
    "Conventional deadlift|Barbell", "Rack pull|Barbell", "Barbell bent-over row|Barbell", "Pendlay row|Barbell", "Underhand barbell row|Barbell", "Seal row|Barbell", "Meadows row|Landmine", "T-bar row|Landmine", "Single-arm landmine row|Landmine", "Chest-supported dumbbell row|Dumbbell", "Single-arm dumbbell row|Dumbbell", "Dumbbell pullover|Dumbbell", "Renegade row|Dumbbell", "Kroc row|Dumbbell", "Lat pulldown|Cable", "Wide-grip lat pulldown|Cable", "Close-grip lat pulldown|Cable", "Neutral-grip lat pulldown|Cable", "Underhand lat pulldown|Cable", "Single-arm lat pulldown|Cable", "Straight-arm pulldown|Cable", "Seated cable row|Cable", "Wide-grip cable row|Cable", "Single-arm cable row|Cable", "Rope seated row|Cable", "Machine high row|Machine", "Machine low row|Machine", "Plate-loaded row|Machine", "Chest-supported machine row|Machine", "Assisted pull-up|Machine", "Pull-up|Bodyweight", "Chin-up|Bodyweight", "Neutral-grip pull-up|Bodyweight", "Wide-grip pull-up|Bodyweight", "Inverted row|Bodyweight", "Ring row|Rings", "Scapular pull-up|Bodyweight", "Back extension|Bench", "Reverse hyperextension|Machine", "Good morning|Barbell"
  ],
  Shoulders: [
    "Standing overhead press|Barbell", "Seated barbell shoulder press|Barbell", "Push press|Barbell", "Behind-the-neck press|Barbell", "Bradford press|Barbell", "Z press|Barbell", "Seated dumbbell shoulder press|Dumbbell", "Standing dumbbell shoulder press|Dumbbell", "Arnold press|Dumbbell", "Single-arm dumbbell shoulder press|Dumbbell", "Dumbbell lateral raise|Dumbbell", "Seated lateral raise|Dumbbell", "Lean-away lateral raise|Dumbbell", "Dumbbell front raise|Dumbbell", "Plate front raise|Plate", "Cable lateral raise|Cable", "Behind-the-body cable lateral raise|Cable", "Cable front raise|Cable", "Cable Y raise|Cable", "Face pull|Cable", "Cable rear-delt fly|Cable", "Reverse pec deck|Machine", "Machine shoulder press|Machine", "Machine lateral raise|Machine", "Smith machine shoulder press|Smith machine", "Landmine press|Landmine", "Half-kneeling landmine press|Landmine", "Pike push-up|Bodyweight", "Handstand push-up|Bodyweight", "Wall handstand hold|Bodyweight", "Band pull-apart|Resistance band", "Band face pull|Resistance band"
  ],
  Biceps: [
    "Barbell curl|Barbell", "EZ-bar curl|EZ bar", "Wide-grip EZ-bar curl|EZ bar", "Close-grip EZ-bar curl|EZ bar", "Preacher curl|EZ bar", "Spider curl|EZ bar", "Dumbbell curl|Dumbbell", "Alternating dumbbell curl|Dumbbell", "Hammer curl|Dumbbell", "Cross-body hammer curl|Dumbbell", "Incline dumbbell curl|Dumbbell", "Concentration curl|Dumbbell", "Zottman curl|Dumbbell", "Waiter curl|Dumbbell", "Bayesian cable curl|Cable", "Cable curl|Cable", "Rope hammer curl|Cable", "High cable curl|Cable", "Single-arm cable curl|Cable", "Cable preacher curl|Cable", "Machine preacher curl|Machine", "Machine biceps curl|Machine", "Resistance-band curl|Resistance band", "Reverse curl|EZ bar", "Drag curl|Barbell", "Chin-up biceps focus|Bodyweight"
  ],
  Triceps: [
    "Close-grip barbell bench press|Barbell", "JM press|Barbell", "Barbell skull crusher|Barbell", "EZ-bar skull crusher|EZ bar", "Dumbbell skull crusher|Dumbbell", "Rolling dumbbell extension|Dumbbell", "Single-arm overhead extension|Dumbbell", "Two-hand overhead extension|Dumbbell", "Tate press|Dumbbell", "Rope pushdown|Cable", "Straight-bar pushdown|Cable", "V-bar pushdown|Cable", "Reverse-grip pushdown|Cable", "Single-arm cable pushdown|Cable", "Cable overhead extension|Cable", "Single-arm cable overhead extension|Cable", "Cross-body cable extension|Cable", "Machine triceps extension|Machine", "Assisted dip|Machine", "Parallel-bar dip|Dip station", "Bench dip|Bench", "Diamond push-up triceps focus|Bodyweight", "Resistance-band pushdown|Resistance band", "Resistance-band overhead extension|Resistance band"
  ],
  Quads: [
    "Back squat|Barbell", "Front squat|Barbell", "High-bar squat|Barbell", "Low-bar squat|Barbell", "Pause squat|Barbell", "Box squat|Barbell", "Zercher squat|Barbell", "Hack squat|Machine", "Pendulum squat|Machine", "Belt squat|Machine", "Leg press|Machine", "Single-leg press|Machine", "Horizontal leg press|Machine", "Leg extension|Machine", "Single-leg extension|Machine", "Smith machine squat|Smith machine", "Smith machine front squat|Smith machine", "Goblet squat|Dumbbell", "Dumbbell squat|Dumbbell", "Bulgarian split squat|Dumbbell", "Front-foot-elevated split squat|Dumbbell", "Walking lunge|Dumbbell", "Reverse lunge|Dumbbell", "Forward lunge|Dumbbell", "Lateral lunge|Dumbbell", "Step-up|Dumbbell", "Cyclist squat|Dumbbell", "Sissy squat|Bodyweight", "Wall sit|Bodyweight", "Spanish squat|Resistance band", "Pistol squat|Bodyweight", "Bodyweight split squat|Bodyweight"
  ],
  Hamstrings: [
    "Romanian deadlift|Barbell|RDL", "Stiff-leg deadlift|Barbell", "Snatch-grip Romanian deadlift|Barbell", "Single-leg Romanian deadlift|Dumbbell", "Dumbbell Romanian deadlift|Dumbbell", "Kettlebell Romanian deadlift|Kettlebell", "Seated leg curl|Machine", "Lying leg curl|Machine", "Standing single-leg curl|Machine", "Nordic hamstring curl|Bodyweight", "Glute-ham raise|Machine", "Sliding leg curl|Slider", "Swiss-ball leg curl|Stability ball", "Cable pull-through|Cable", "Good morning hamstring focus|Barbell", "45-degree back extension|Bench", "Reverse hyper hamstring focus|Machine", "Banded leg curl|Resistance band", "Razor curl|Bodyweight"
  ],
  Glutes: [
    "Barbell hip thrust|Barbell", "Barbell glute bridge|Barbell", "Dumbbell hip thrust|Dumbbell", "Single-leg hip thrust|Bodyweight", "Single-leg glute bridge|Bodyweight", "Frog pump|Bodyweight", "Cable pull-through glute focus|Cable", "Cable kickback|Cable", "Cable standing hip abduction|Cable", "Cable standing hip adduction|Cable", "Hip abduction machine|Machine", "Hip adduction machine|Machine", "Reverse lunge glute focus|Dumbbell", "Curtsy lunge|Dumbbell", "High step-up|Dumbbell", "Sumo deadlift|Barbell", "Sumo squat|Dumbbell", "B-stance Romanian deadlift|Dumbbell", "Banded lateral walk|Resistance band", "Monster walk|Resistance band", "Clamshell|Resistance band", "Fire hydrant|Bodyweight", "Donkey kick|Bodyweight", "Lateral step-down|Bodyweight"
  ],
  Calves: [
    "Standing calf raise|Machine", "Seated calf raise|Machine", "Leg-press calf raise|Machine", "Donkey calf raise|Machine", "Single-leg standing calf raise|Bodyweight", "Dumbbell calf raise|Dumbbell", "Smith machine calf raise|Smith machine", "Tibialis raise|Bodyweight", "Tibialis machine raise|Machine", "Toe-elevated calf raise|Bodyweight", "Bent-knee calf raise|Dumbbell", "Farmer walk on toes|Dumbbell"
  ],
  Core: [
    "Cable crunch|Cable", "Kneeling cable crunch|Cable", "Standing cable crunch|Cable", "Pallof press|Cable", "Half-kneeling Pallof press|Cable", "Cable wood chop|Cable", "Cable lift|Cable", "Ab wheel rollout|Ab wheel", "Barbell rollout|Barbell", "Plank|Bodyweight", "Side plank|Bodyweight", "Copenhagen plank|Bench", "RKC plank|Bodyweight", "Dead bug|Bodyweight", "Bird dog|Bodyweight", "Hollow-body hold|Bodyweight", "Hollow-body rock|Bodyweight", "V-up|Bodyweight", "Sit-up|Bodyweight", "Crunch|Bodyweight", "Reverse crunch|Bodyweight", "Bicycle crunch|Bodyweight", "Mountain climber|Bodyweight", "Hanging knee raise|Pull-up bar", "Hanging leg raise|Pull-up bar", "Captain's-chair knee raise|Machine", "Captain's-chair leg raise|Machine", "Toes to bar|Pull-up bar", "Dragon flag|Bench", "Suitcase carry|Dumbbell", "Farmer carry|Dumbbell", "Overhead carry|Dumbbell", "Turkish get-up|Kettlebell", "Russian twist|Medicine ball", "Medicine-ball slam|Medicine ball", "Stir the pot|Stability ball"
  ],
  "Full body": [
    "Barbell clean|Barbell", "Barbell power clean|Barbell", "Barbell hang clean|Barbell", "Clean and press|Barbell", "Clean and jerk|Barbell", "Barbell snatch|Barbell", "Power snatch|Barbell", "Hang snatch|Barbell", "Thruster|Barbell", "Dumbbell thruster|Dumbbell", "Devil press|Dumbbell", "Dumbbell clean and press|Dumbbell", "Kettlebell clean|Kettlebell", "Kettlebell clean and press|Kettlebell", "Kettlebell snatch|Kettlebell", "Kettlebell swing|Kettlebell", "Kettlebell high pull|Kettlebell", "Turkish get-up full body|Kettlebell", "Man maker|Dumbbell", "Bear crawl|Bodyweight", "Burpee|Bodyweight", "Burpee box jump|Plyo box", "Sled push|Sled", "Sled pull|Sled", "Battle rope alternating waves|Battle rope", "Battle rope slams|Battle rope"
  ],
  Conditioning: [
    "Outdoor walk|None", "Treadmill walk|Treadmill", "Incline treadmill walk|Treadmill", "Outdoor run|None", "Treadmill run|Treadmill", "Track intervals|None", "Hill sprint|None", "Stair climb|Stair machine", "StepMill|Stair machine", "Outdoor bike|Bike", "Stationary bike|Bike", "Spin bike intervals|Bike", "Air bike|Air bike", "Recumbent bike|Bike", "Rowing machine|Rower", "Ski erg|Ski erg", "Elliptical|Elliptical", "Arc trainer|Machine", "Jump rope|Jump rope", "Box jump|Plyo box", "Broad jump|Bodyweight", "Shuttle run|None", "Farmer carry conditioning|Dumbbell", "Sled push conditioning|Sled", "Sled drag conditioning|Sled", "Sandbag carry|Sandbag", "Sandbag clean|Sandbag", "Medicine-ball throw|Medicine ball", "Zone 2 bike|Bike", "Zone 2 walk|None", "Zone 2 run|None"
  ],
  Mobility: [
    "Cat-cow|Bodyweight", "Child's pose|Bodyweight", "Thread the needle|Bodyweight", "Thoracic rotation|Bodyweight", "Open book rotation|Bodyweight", "Wall slide|Bodyweight", "Shoulder dislocate|Resistance band", "Banded shoulder stretch|Resistance band", "Doorway chest stretch|None", "Lat stretch|Bench", "Couch stretch|Bench", "Half-kneeling hip-flexor stretch|Bodyweight", "90/90 hip switch|Bodyweight", "Pigeon stretch|Bodyweight", "Adductor rock-back|Bodyweight", "Frog stretch|Bodyweight", "World's greatest stretch|Bodyweight", "Deep squat hold|Bodyweight", "Ankle dorsiflexion mobilization|Bodyweight", "Calf stretch|None", "Hamstring floss|Resistance band", "Sciatic nerve glide|Bodyweight", "Hip airplane|Bodyweight", "Cossack squat mobility|Bodyweight", "Foam-roll quads|Foam roller", "Foam-roll upper back|Foam roller", "Foam-roll glutes|Foam roller", "Dead hang|Pull-up bar", "Scapular wall clock|Resistance band", "Banded external rotation|Resistance band"
  ]
};

const categoryDefaults: Record<string, { target: string; rest: number; cue: string }> = {
  Chest: { target: "3 sets · 8–12 reps", rest: 90, cue: "Keep the shoulder blades controlled and use a range you can own." },
  Back: { target: "3 sets · 8–12 reps", rest: 90, cue: "Lead with the elbows and control the stretch without losing position." },
  Shoulders: { target: "3 sets · 10–15 reps", rest: 75, cue: "Keep the ribs controlled and move through a comfortable shoulder path." },
  Biceps: { target: "3 sets · 10–15 reps", rest: 60, cue: "Keep the upper arm quiet and control the lowering phase." },
  Triceps: { target: "3 sets · 10–15 reps", rest: 60, cue: "Keep the shoulder stable and finish the elbow extension smoothly." },
  Quads: { target: "3 sets · 8–12 reps", rest: 120, cue: "Stay balanced through the whole foot and keep the knee path controlled." },
  Hamstrings: { target: "3 sets · 8–12 reps", rest: 90, cue: "Keep the trunk controlled and feel the hamstrings lengthen without forcing range." },
  Glutes: { target: "3 sets · 10–15 reps", rest: 90, cue: "Finish through the hips without replacing hip extension with low-back movement." },
  Calves: { target: "3 sets · 12–20 reps", rest: 60, cue: "Use a full comfortable stretch and pause at the top." },
  Core: { target: "3 sets · 10–15 reps", rest: 60, cue: "Brace first and keep the movement controlled rather than chasing speed." },
  "Full body": { target: "4 sets · 5–8 reps", rest: 120, cue: "Prioritize position and repeatable technique before load or speed." },
  Conditioning: { target: "20–45 minutes", rest: 0, cue: "Choose an effort that matches the purpose of today’s session." },
  Mobility: { target: "2 sets · 30–60 sec", rest: 30, cue: "Move gently and stop before pinching, sharp pain, or forced range." }
};

function commonAliases(name: string, equipment: string) {
  const aliases: string[] = [];
  if (name.toLowerCase().includes("push-up")) aliases.push("press-up", "press up", "push up", "calisthenics");
  if (name.toLowerCase().includes("pull-up")) aliases.push("pull up", "pullup", "calisthenics");
  if (name.toLowerCase().includes("dip")) aliases.push("dip machine", "tricep dip", "calisthenics");
  if (name.toLowerCase().includes("lunge")) aliases.push("lunges");
  if (name.toLowerCase().includes("hip thrust")) aliases.push("glute thrust", "glute workout");
  if (equipment === "Cable") aliases.push("pulley", "single pulley", "double pulley", "dual pulley", "functional trainer", "cable machine");
  if (equipment === "Machine") aliases.push("selectorized machine", "gym machine");
  if (equipment === "Bodyweight") aliases.push("body weight", "no equipment", "calisthenics", "callisthenics");
  if (equipment === "Dumbbell") aliases.push("dumbbells", "DB", "DBs");
  if (equipment === "Barbell") aliases.push("barbells", "BB");
  if (equipment === "Kettlebell") aliases.push("kettlebells", "KB");
  return aliases;
}

const movementPatterns: Record<string, string> = {
  Chest: "Horizontal push",
  Back: "Pull",
  Shoulders: "Vertical push",
  Biceps: "Elbow flexion",
  Triceps: "Elbow extension",
  Quads: "Knee dominant",
  Hamstrings: "Hip hinge",
  Glutes: "Hip dominant",
  Calves: "Ankle extension",
  Core: "Trunk control",
  "Full body": "Full body power",
  Conditioning: "Cardiovascular",
  Mobility: "Mobility",
};

function exerciseLocations(name: string, equipment: string): ExerciseDefinition["locations"] {
  const lower = name.toLowerCase();
  if (lower.startsWith("outdoor") || lower.includes("hill sprint") || lower.includes("track intervals")) return ["Outdoor"];
  if (["Bodyweight", "None", "Resistance band", "Jump rope"].includes(equipment)) return ["Anywhere", "Home", "Outdoor"];
  if (["Dumbbell", "Kettlebell", "Bench", "Stability ball", "Foam roller"].includes(equipment)) return ["Gym", "Home"];
  return ["Gym"];
}

function exerciseDifficulty(name: string, equipment: string): ExerciseDefinition["difficulty"] {
  const lower = name.toLowerCase();
  if (["snatch", "clean and jerk", "handstand", "pistol", "dragon flag", "nordic", "muscle-up"].some((term) => lower.includes(term))) return "Advanced";
  if (["Bodyweight", "None", "Machine", "Resistance band"].includes(equipment) || ["walk", "stretch", "curl", "extension"].some((term) => lower.includes(term))) return "Beginner";
  return "Intermediate";
}

const baseExerciseLibrary: ExerciseDefinition[] = Object.entries(groups).flatMap(([category, entries]) => {
  const defaults = categoryDefaults[category];
  return entries.map((entry) => {
    const [name, equipment, aliasText = ""] = entry.split("|");
    return {
      name,
      category,
      equipment,
      aliases: [...(aliasText ? aliasText.split(",").map((alias) => alias.trim()) : []), ...commonAliases(name, equipment)],
      target: defaults.target,
      rest: defaults.rest,
      weight: "",
      previous: "No history yet",
      cue: defaults.cue,
      locations: exerciseLocations(name, equipment),
      difficulty: exerciseDifficulty(name, equipment),
      movementPattern: movementPatterns[category] ?? category,
      substitutions: [],
      safetyNote: "Use a controlled range you can own. Stop for sharp pain, dizziness, numbness, or a sudden loss of control.",
    };
  });
});

export const exerciseLibrary: ExerciseDefinition[] = baseExerciseLibrary.map((exercise) => ({
  ...exercise,
  substitutions: baseExerciseLibrary
    .filter((candidate) => candidate.category === exercise.category && candidate.name !== exercise.name && (candidate.equipment === exercise.equipment || candidate.movementPattern === exercise.movementPattern))
    .slice(0, 4)
    .map((candidate) => candidate.name),
}));

export const exerciseCategories = ["All", ...Object.keys(groups)];
export const exerciseEquipment = ["All", ...new Set(exerciseLibrary.map((exercise) => exercise.equipment))].sort((a, b) => a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b));
