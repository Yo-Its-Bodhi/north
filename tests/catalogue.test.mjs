import test from "node:test";
import assert from "node:assert/strict";
import { exerciseLibrary } from "../src/data/exercises.ts";
import { workoutTemplates } from "../src/data/workouts.ts";
import { programs } from "../src/data/programs.ts";
import { milestoneDefinitions } from "../src/data/milestones.ts";

test("exercise catalogue is large, unique, searchable, and prescription-ready", () => {
  assert.ok(exerciseLibrary.length >= 350, `expected at least 350 exercises, found ${exerciseLibrary.length}`);
  const names = exerciseLibrary.map((exercise) => exercise.name.toLowerCase());
  assert.equal(new Set(names).size, names.length, "exercise names must be unique ignoring case");
  for (const exercise of exerciseLibrary) {
    assert.ok(exercise.name.trim(), "exercise name is required");
    assert.ok(exercise.category.trim(), `${exercise.name} needs a category`);
    assert.ok(exercise.equipment.length, `${exercise.name} needs equipment metadata`);
    assert.ok(exercise.target.trim(), `${exercise.name} needs a target prescription`);
    assert.ok(Number.isFinite(exercise.rest) && exercise.rest >= 0, `${exercise.name} has invalid rest`);
    assert.ok(exercise.cue.trim(), `${exercise.name} needs a coaching cue`);
  }
});

test("exercise catalogue includes rear-delt raises and curl 21s", () => {
  const rearDeltRaise = exerciseLibrary.find((exercise) => exercise.name === "Dumbbell rear-delt raise");
  const curl21s = exerciseLibrary.find((exercise) => exercise.name === "EZ-bar curl 21s");
  assert.ok(rearDeltRaise, "rear-delt raise should be available in the exercise picker");
  assert.ok(rearDeltRaise.aliases.includes("rear delt raises"), "rear-delt raise should be discoverable by its common plural name");
  assert.ok(curl21s, "curl 21s should be available in the exercise picker");
  assert.match(curl21s.target, /7 lower \+ 7 full \+ 7 upper/i, "curl 21s needs its complete 7/7/7 protocol");
});

test("workout catalogue covers the promised scale and every exercise reference resolves", () => {
  assert.ok(workoutTemplates.length >= 360, `expected at least 360 workouts, found ${workoutTemplates.length}`);
  const exerciseNames = new Set(exerciseLibrary.map((exercise) => exercise.name));
  const ids = workoutTemplates.map((template) => template.id);
  assert.equal(new Set(ids).size, ids.length, "workout ids must be unique");
  const durations = new Set(workoutTemplates.map((template) => template.duration));
  for (const duration of [15, 20, 30, 45, 60, 75]) assert.ok(durations.has(duration), `missing ${duration}-minute workouts`);
  for (const template of workoutTemplates) {
    assert.ok(template.exercises.length >= 1, `${template.name} has no exercises`);
    assert.ok(template.equipment.length >= 1, `${template.name} has no equipment metadata`);
    for (const planned of template.exercises) {
      assert.ok(exerciseNames.has(planned.exerciseName), `${template.name} references unknown exercise ${planned.exerciseName}`);
      assert.ok(planned.sets >= 1 && planned.sets <= 10, `${template.name} has invalid sets`);
      assert.ok(planned.reps.trim(), `${template.name} has a blank rep target`);
      assert.ok(planned.rest >= 0 && planned.rest <= 600, `${template.name} has invalid rest`);
    }
  }
});

test("program definitions generate only supported, complete weekly rhythms", () => {
  assert.ok(programs.length >= 9, "expected the complete starter program set");
  const ids = programs.map((program) => program.id);
  assert.equal(new Set(ids).size, ids.length, "program ids must be unique");
  for (const program of programs) {
    assert.ok(program.dayOptions.includes(program.defaultDays), `${program.name} default days are unsupported`);
    assert.ok(program.weeks >= 4, `${program.name} is too short to be a multi-week program`);
    for (const days of program.dayOptions) {
      assert.equal(program.focusesByDays[days]?.length, days, `${program.name} needs ${days} focuses for its ${days}-day option`);
    }
  }
});

test("milestones have unique ids and valid, non-shaming progress targets", () => {
  assert.ok(milestoneDefinitions.length >= 20, "expected a broad milestone catalogue");
  const ids = milestoneDefinitions.map((milestone) => milestone.id);
  assert.equal(new Set(ids).size, ids.length, "milestone ids must be unique");
  for (const milestone of milestoneDefinitions) {
    assert.ok(milestone.target > 0, `${milestone.title} needs a positive target`);
    assert.ok(milestone.title.trim() && milestone.description.trim(), `${milestone.id} needs member-facing copy`);
  }
});
