import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAccountData } from '../src/data/mergeAccountData.ts';
import { northRepository } from '../src/data/northDb.ts';

const values = new Map();
globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
globalThis.location = { hostname: 'localhost', origin: 'http://localhost' };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Test', platform: 'Test' } });
const { pullNorth, syncNorth } = await import('../src/data/sync.ts');
function owner(id) { localStorage.setItem('north-account-session-v1', JSON.stringify({ user: { id }, accessToken: 'test' })); }
function doc(data, version = 1) { return { key: 'week-plan:primary', collection: 'week-plan', id: 'primary', data, version, updatedAt: new Date().toISOString() }; }

test('phone edits one day without removing the other 83 days planned in the browser', () => {
  const base = Array.from({ length: 84 }, (_, index) => ({ date: String(index), title: 'Rest' }));
  const browser = base.map((day) => ({ ...day, title: 'Browser workout' }));
  const phone = base.map((day, index) => index === 0 ? { ...day, title: 'Phone workout' } : day);
  const merged = mergeAccountData(base, phone, browser);
  assert.equal(merged[0].title, 'Phone workout');
  assert.equal(merged.length, 84);
  assert.ok(merged.slice(1).every((day) => day.title === 'Browser workout'));
});

test('concurrent history additions keep both workouts', () => {
  assert.deepEqual(mergeAccountData([], [{ id: 'phone' }], [{ id: 'browser' }]), [{ id: 'browser' }, { id: 'phone' }]);
});

test('freshly downloaded plan can receive a newer server revision immediately', async () => {
  owner('fresh-plan');
  await northRepository.acceptRemote(doc([{ date: 'one', title: 'Old' }]));
  globalThis.fetch = async () => Response.json({ documents: [doc([{ date: 'one', title: 'New' }], 2)], serverTime: new Date().toISOString() });
  assert.equal((await pullNorth('https://north.example', 'test')).restored, 1);
  assert.equal(JSON.parse(localStorage.getItem('north-week-plan-v1'))[0].title, 'New');
});

test('server acknowledgement cannot delete edits queued while a request was in flight', async () => {
  owner('in-flight-save');
  await northRepository.acceptRemote(doc([{ date: 'one', title: 'Original' }], 5));
  await northRepository.put('week-plan', 'primary', [{ date: 'one', title: 'First' }]);
  const sent = (await northRepository.pendingMutations())[0];
  await northRepository.put('week-plan', 'primary', [{ date: 'one', title: 'Second' }]);
  await northRepository.acceptMutation(doc([{ date: 'one', title: 'First' }], 6), sent);
  const [pending] = await northRepository.pendingMutations();
  assert.equal(pending.data[0].title, 'Second');
  assert.equal(pending.baseVersion, 6);
  assert.equal((await northRepository.get('week-plan', 'primary')).data[0].title, 'Second');
});

test('a version conflict sends only the phone changes over the current server plan', async () => {
  owner('two-devices');
  const base = [{ date: 'one', title: 'Rest' }, { date: 'two', title: 'Rest' }];
  await northRepository.acceptRemote(doc(base, 4));
  await northRepository.put('week-plan', 'primary', [{ date: 'one', title: 'Phone' }, base[1]]);
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    if (requests.length === 1) return Response.json({ status: 'conflict', remote: doc([base[0], { date: 'two', title: 'Browser' }], 5) }, { status: 409 });
    return Response.json({ status: 'applied', document: doc(requests[1].data, 6) });
  };
  assert.equal((await syncNorth('https://north.example', 'test')).pending, 0);
  assert.deepEqual(requests[1].data.map((day) => day.title), ['Phone', 'Browser']);
});

test('forced startup restoration preserves real queued edits', async () => {
  owner('pending-startup');
  await northRepository.put('week-plan', 'primary', [{ date: 'one', title: 'Offline edit' }]);
  globalThis.fetch = async () => Response.json({ documents: [doc([{ date: 'one', title: 'Account' }], 5)], serverTime: new Date().toISOString() });
  assert.equal((await pullNorth('https://north.example', 'test', undefined, true)).restored, 0);
  assert.equal((await northRepository.pendingMutations()).length, 1);
});
