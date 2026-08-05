import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [onboarding, account, server, migration, legalNotice] = await Promise.all([
  readFile(new URL("../src/Onboarding.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/data/account.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/index.mjs", import.meta.url), "utf8"),
  readFile(new URL("../db/migrations/0019_legal_notice_acceptance.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/components/LegalNotice.tsx", import.meta.url), "utf8"),
]);

test("account creation requires explicit agreement to the current legal notice", () => {
  assert.match(onboarding, /const \[legalAccepted, setLegalAccepted\] = useState\(false\)/);
  assert.match(onboarding, /mode === "register" && \(!name\.trim\(\) \|\| !legalAccepted\)/);
  assert.match(onboarding, /North and Nova are fitness education, planning and workout-tracking tools, not medical care or professional advice/);
  assert.match(onboarding, /Read the full Legal &amp; Safety Notice/);
  assert.match(onboarding, /<LegalNotice onBack=/);
  assert.match(account, /acceptedLegalVersion/);
  assert.match(legalNotice, /do not use North or create an account/);
  assert.match(legalNotice, /North and its operators, staff, contributors and service providers/);
});

test("password requirements are available without occupying form space", () => {
  assert.match(onboarding, /className="password-requirements"/);
  assert.match(onboarding, /aria-label="Password requirements"/);
  assert.match(onboarding, /Use at least 10 characters\./);
  assert.match(onboarding, /No uppercase letter, number, or symbol is required\./);
});

test("the registration API rejects missing consent and records accepted version and time", () => {
  assert.match(server, /const LEGAL_NOTICE_VERSION = "interim-v1\.0"/);
  assert.match(server, /acceptedLegalVersion !== LEGAL_NOTICE_VERSION/);
  assert.match(server, /legal_notice_version, legal_accepted_at/);
  assert.match(migration, /legal_notice_version text/);
  assert.match(migration, /legal_accepted_at timestamptz/);
  assert.match(migration, /add column if not exists/);
  assert.match(migration, /if not exists \(select 1 from pg_constraint/);
});