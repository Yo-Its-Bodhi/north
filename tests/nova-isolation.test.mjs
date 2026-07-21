import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration=fs.readFileSync(new URL("../db/migrations/0012_nova_intelligence_hub.sql",import.meta.url),"utf8");
const routes=fs.readFileSync(new URL("../server/nova-routes.mjs",import.meta.url),"utf8");
const appSource=fs.readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");

test("Nova migration is additive and every private table belongs to an account",()=>{
  assert.doesNotMatch(migration,/\b(drop|truncate)\s+(table|schema)\b/i);
  for(const table of ["nova_conversations","nova_messages","nova_goals","nova_memory_entries","nova_action_proposals","nova_action_events","nova_usage_events"]){
    const definition=migration.match(new RegExp(`create table if not exists ${table} \\(([\\s\\S]*?)\\n\\);`,"i"))?.[1]??"";
    assert.match(definition,/owner_user_id uuid not null references app_users\(id\) on delete cascade/i,`${table} must be account owned`);
  }
});

test("Nova relationships use owner-aware composite foreign keys",()=>{
  assert.match(migration,/foreign key \(conversation_id,owner_user_id\) references nova_conversations\(id,owner_user_id\)/i);
  assert.match(migration,/foreign key \(source_message_id,owner_user_id\) references nova_messages\(id,owner_user_id\)/i);
  assert.match(migration,/foreign key \(proposal_id,owner_user_id\) references nova_action_proposals\(id,owner_user_id\)/i);
});

test("member Nova routes derive ownership from the authenticated token",()=>{
  assert.doesNotMatch(routes,/request\.body\?\.(owner|ownerUserId|userId)|request\.params\.(owner|ownerUserId|userId)/);
  assert.ok((routes.match(/request\.user\.sub/g)??[]).length>=10);
  assert.ok((routes.match(/owner_user_id/g)??[]).length>=12);
  for(const path of ["bootstrap","conversations","goals","memories"])assert.match(routes,new RegExp(`/v1/nova/${path}`));
  assert.ok((routes.match(/preHandler:app\.authenticate/g)??[]).length>=8);
});

test("Nova actions are structured, allow-listed, confirmed and audited",()=>{
  for(const action of ["create_goal","update_goal","remember_context","add_check_in","add_reflection","create_workout","adjust_plan_day"])assert.match(routes,new RegExp(action));
  assert.match(routes,/proposals\/:id\/approve/);
  assert.match(routes,/status='pending'/);
  assert.match(routes,/status='approved'/);
  assert.match(routes,/insert into nova_action_events/);
  assert.match(routes,/owner_user_id=\$2/);
  assert.doesNotMatch(routes,/request\.body\?\.owner/i);
  assert.match(routes,/exerciseCoachingIds\.has\(id\)/);
  assert.match(routes,/exerciseCandidates:retrieveExercises/);
});

test("explicit bike additions become a confirmable plan proposal",()=>{
  assert.match(routes,/function inferBikeSessionProposal/);
  assert.match(routes,/Add a \$\{duration\}-minute steady bike ride after today/);
  assert.match(routes,/action_type,risk_level,summary,reason,payload,expires_at/);
});

test("Nova normalizes today proposals against the account timezone",()=>{
  assert.match(routes,/function normalizeProposalDate/);
  assert.match(routes,/currentDateIso/);
  assert.match(routes,/formatToParts\(new Date\(\)\)/);
});

test("Nova can persist explicitly requested reusable workouts",()=>{
  assert.match(routes,/saveToMyWorkouts:true/);
  assert.match(routes,/payload\.saveToMyWorkouts=payload\.saveToMyWorkouts===true/);
  assert.match(appSource,/persistAccountJson\(PERSONAL_TEMPLATES_KEY, "personal-workouts", nextTemplates, true\)/);
  assert.match(appSource,/personal-nova-\$\{proposal\.id\}/);
});

test("resolved Nova proposal cards leave the chat viewport",()=>{
  assert.match(appSource,/apiProposal: undefined, appliedAt/);
  assert.match(appSource,/message\.apiProposal\?\.status === "pending"/);
});
