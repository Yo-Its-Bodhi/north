import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../server/index.mjs', import.meta.url), 'utf8');
const route = source.slice(source.indexOf('app.post("/v1/sync/mutations"'), source.indexOf('app.post("/v1/sync/conflicts/'));
function setup(version) {
  let handler, writes = 0;
  const saved = { document_key: 'week-plan:primary', collection: 'week-plan', data: [{ title: 'Browser plan' }], version, updated_at: new Date().toISOString() };
  const client = { release() {}, async query(sql, args) {
    if (sql.startsWith('select response')) return { rows: [] };
    if (sql.startsWith('select * from sync_documents')) return { rows: version ? [saved] : [] };
    if (sql.includes('insert into sync_documents')) { writes++; return { rows: [{ ...saved, version: version + 1, data: JSON.parse(args[3]) }] }; }
    return { rows: [] };
  } };
  const mapDocument = (row) => ({ key: row.document_key, collection: row.collection, id: 'primary', data: row.data, version: row.version, updatedAt: row.updated_at });
  new Function('app', 'pool', 'mapDocument', route)({ authenticate() {}, post(_path, _options, fn) { handler = fn; } }, { connect: async () => client }, mapDocument);
  return { async send(protocol, baseVersion) {
    let status = 200;
    const reply = { code(code) { status = code; return this; }, send(body) { return body; } };
    const body = await handler({ user: { sub: 'member' }, headers: { 'idempotency-key': 'unique', 'x-north-sync-protocol': protocol }, body: { documentKey: 'week-plan:primary', collection: 'week-plan', operation: 'put', baseVersion, data: [{ title: 'Phone edit' }] } }, reply);
    return { status, body, writes };
  } };
}

test('an older installed app cannot overwrite the current account plan', async () => {
  const result = await setup(12).send(undefined, 1);
  assert.equal(result.status, 426);
  assert.equal(result.writes, 0);
});
test('a stale current client receives the latest account revision without overwriting it', async () => {
  const result = await setup(12).send('2', 1);
  assert.equal(result.status, 409);
  assert.equal(result.body.remote.version, 12);
  assert.equal(result.writes, 0);
});
test('a save based on the current account version is accepted', async () => {
  const result = await setup(12).send('2', 12);
  assert.equal(result.status, 200);
  assert.equal(result.body.document.version, 13);
  assert.equal(result.writes, 1);
});
