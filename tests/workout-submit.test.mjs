import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('  function saveReview()'), source.indexOf('  function startFresh()')).replace('role: "nova" as const', 'role: "nova"');
function setup() {
  const state = { busy: false, error: '', writes: 0, storageOk: true };
  const context = {
    session: { id: 'first', exercises: [{ sets: [{ complete: true }] }] }, history: [],
    workoutSubmitLock: { current: false }, sessionRef: { current: {} },
    setWorkoutSubmitting: (value) => { state.busy = value; },
    setWorkoutSubmitError: (value) => { state.error = value; },
    setLocalStorageItem: () => { state.writes++; return state.storageOk; }, HISTORY_KEY: 'history',
    setHistory: (value) => { context.history = value; }, setSession() {},
    setNovaMessages: (fn) => fn([]), setWeeklyPlan: (fn) => fn([]),
    setWorkoutSubmitOpen() {}, setScreen() {},
    profile: { reducedMotion: false }, navigator: { vibrate() { throw new Error('Unsupported'); } },
    sessionNewRecords: [], sessionEarnedMoments: [], crypto: { randomUUID: () => 'uuid' },
    sessionSetCount: () => 1, workoutRecordDate: () => '', isoDate: () => '2026-09-08',
  };
  runInNewContext(`${handler}\nthis.submit = saveReview;`, context);
  return { state, context };
}

test('submission releases busy state and the next workout can submit without startFresh', () => {
  const { state, context } = setup();
  context.submit();
  assert.equal(state.error, '');
  assert.equal(state.busy, false);
  assert.equal(context.workoutSubmitLock.current, false);
  context.submit(); // Same rendered handler, before React updates: no duplicate.
  assert.equal(state.writes, 1);
  context.session = { ...context.session, id: 'second' };
  context.sessionRef.current = context.session;
  context.submit();
  assert.equal(state.writes, 2);
  assert.equal(context.history.length, 2);
  assert.equal(state.busy, false);
});

test('storage failure keeps the workout unfinished and allows retry in the same dialog', () => {
  const { state, context } = setup();
  state.storageOk = false;
  context.submit();
  assert.match(state.error, /storage/);
  assert.equal(state.busy, false);
  assert.equal(context.workoutSubmitLock.current, false);
  assert.equal(context.history.length, 0);
  assert.equal(context.sessionRef.current.finishedAt, undefined);
  state.storageOk = true;
  context.submit();
  assert.equal(state.error, '');
  assert.equal(context.history.length, 1);
});
