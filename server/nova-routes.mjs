import { generateNovaReply, novaProviderReady, NOVA_MODEL } from "./nova-provider.mjs";
import { readFileSync } from "node:fs";

const exerciseCoachingIndex=JSON.parse(readFileSync(new URL("./data/nova-exercise-index.json",import.meta.url),"utf8"));
const exerciseCoachingIds=new Set(exerciseCoachingIndex.map((exercise)=>exercise.id));

const goalStatuses=new Set(["draft","active","paused","completed","abandoned"]);
const memoryKinds=new Set(["preference","constraint","schedule","event","identity","coaching","equipment","temporary_context"]);
const memoryStatuses=new Set(["proposed","active","rejected","archived"]);
const sourceTypes=new Set(["user_statement","record","onboarding","nova_inference"]);
const clean=(value,max=500)=>String(value??"").trim().slice(0,max);

export function registerNovaRoutes(app,{pool}) {
  app.get("/v1/nova/status",{preHandler:app.authenticate},async(request)=>{
    const usage=(await pool.query(`select count(*)::int as replies,coalesce(sum(input_tokens+output_tokens),0)::bigint as tokens,coalesce(sum(estimated_cost_micros),0)::bigint as estimated_cost_micros
      from nova_usage_events where owner_user_id=$1 and status='complete' and created_at>=date_trunc('month',now())`,[request.user.sub])).rows[0];
    return{available:novaProviderReady(),model:novaProviderReady()?NOVA_MODEL:null,mode:novaProviderReady()?"connected":"setup_required",usage:{period:"this_month",replies:Number(usage.replies),tokens:Number(usage.tokens),estimatedCostMicros:Number(usage.estimated_cost_micros)}};
  });
  app.get("/v1/nova/bootstrap",{preHandler:app.authenticate},async(request)=>{
    const owner=request.user.sub;
    const [conversations,goals,memories,proposals]=await Promise.all([
      pool.query("select id,title,status,created_at,updated_at from nova_conversations where owner_user_id=$1 order by updated_at desc limit 50",[owner]),
      pool.query("select * from nova_goals where owner_user_id=$1 order by case status when 'active' then 0 when 'draft' then 1 else 2 end,priority desc,updated_at desc",[owner]),
      pool.query("select * from nova_memory_entries where owner_user_id=$1 order by case status when 'proposed' then 0 when 'active' then 1 else 2 end,updated_at desc",[owner]),
      pool.query("select * from nova_action_proposals where owner_user_id=$1 and status='pending' and (expires_at is null or expires_at>now()) order by created_at desc",[owner]),
    ]);
    return{conversations:conversations.rows,goals:goals.rows,memories:memories.rows,pendingProposals:proposals.rows};
  });

  app.post("/v1/nova/conversations",{preHandler:app.authenticate},async(request,reply)=>{
    const title=clean(request.body?.title,120)||"New conversation";
    const result=await pool.query("insert into nova_conversations(owner_user_id,title) values($1,$2) returning id,title,status,created_at,updated_at",[request.user.sub,title]);
    return reply.code(201).send(result.rows[0]);
  });
  app.patch("/v1/nova/conversations/:id",{preHandler:app.authenticate},async(request,reply)=>{
    const status=request.body?.status;const title=clean(request.body?.title,120);
    if(status&&!['active','archived'].includes(status))return reply.code(400).send({error:"Invalid conversation status."});
    const result=await pool.query("update nova_conversations set title=case when $3='' then title else $3 end,status=coalesce($4,status),updated_at=now() where id=$1 and owner_user_id=$2 returning id,title,status,created_at,updated_at",[request.params.id,request.user.sub,title,status??null]);
    return result.rows[0]??reply.code(404).send({error:"Conversation not found."});
  });
  app.get("/v1/nova/conversations/:id/messages",{preHandler:app.authenticate},async(request,reply)=>{
    const owned=await pool.query("select 1 from nova_conversations where id=$1 and owner_user_id=$2",[request.params.id,request.user.sub]);
    if(!owned.rows[0])return reply.code(404).send({error:"Conversation not found."});
    const result=await pool.query("select id,role,content,evidence,confidence,model,created_at from nova_messages where conversation_id=$1 and owner_user_id=$2 order by created_at,id limit 500",[request.params.id,request.user.sub]);
    return{messages:result.rows};
  });

  app.post("/v1/nova/conversations/:id/respond",{preHandler:app.authenticate,config:{rateLimit:{max:20,timeWindow:"1 hour"}}},async(request,reply)=>{
    const owner=request.user.sub,text=clean(request.body?.text,4000);
    if(!text)return reply.code(400).send({error:"Write a message for Nova."});
    const conversation=await pool.query("select id,title from nova_conversations where id=$1 and owner_user_id=$2 and status='active'",[request.params.id,owner]);
    if(!conversation.rows[0])return reply.code(404).send({error:"Active conversation not found."});
    const client=await pool.connect();let userMessage;
    try{await client.query("begin");userMessage=(await client.query("insert into nova_messages(owner_user_id,conversation_id,role,content) values($1,$2,'user',$3) returning id,role,content,created_at",[owner,request.params.id,text])).rows[0];await client.query("update nova_conversations set updated_at=now(),title=case when title='New conversation' then left($3,80) else title end where id=$1 and owner_user_id=$2",[request.params.id,owner,text]);await client.query("commit");}catch(error){await client.query("rollback");throw error;}finally{client.release();}
    const context=await buildNovaContext(pool,owner,request.params.id,text);
    try{
      const generated=await generateNovaReply({instructions:NOVA_INSTRUCTIONS,input:`ACCOUNT-SCOPED NORTH CONTEXT\n${JSON.stringify(context)}\n\nMEMBER MESSAGE\n${text}`,structured:true});
      const decision=generated.decision;const evidence=Array.isArray(decision?.evidence)?decision.evidence.slice(0,6).map((item)=>clean(item,300)):context.evidence;const confidence=["high","moderate","limited"].includes(decision?.confidence)?decision.confidence:"limited";
      const assistant=(await pool.query(`insert into nova_messages(owner_user_id,conversation_id,role,content,evidence,confidence,provider_message_id,model)
        values($1,$2,'assistant',$3,$4::jsonb,$5,$6,$7) returning id,role,content,evidence,confidence,model,created_at`,[owner,request.params.id,generated.text,JSON.stringify(evidence),confidence,generated.providerMessageId,generated.model])).rows[0];
      let proposal=null;
      if(decision?.proposal){
        const validated=normalizeProposalDate(validateProposal(decision.proposal),context,text);
        if(validated)proposal=(await pool.query(`insert into nova_action_proposals(owner_user_id,conversation_id,source_message_id,action_type,risk_level,summary,reason,payload,expires_at)
          values($1,$2,$3,$4,'meaningful',$5,$6,$7::jsonb,now()+interval '24 hours') returning id,action_type,risk_level,summary,reason,payload,status,expires_at,created_at`,[owner,request.params.id,assistant.id,validated.actionType,validated.summary,validated.reason,JSON.stringify(validated.payload)])).rows[0];
      }
      if(!proposal){
        const inferred=inferBikeSessionProposal(text,context);
        if(inferred)proposal=(await pool.query(`insert into nova_action_proposals(owner_user_id,conversation_id,source_message_id,action_type,risk_level,summary,reason,payload,expires_at)
          values($1,$2,$3,'adjust_plan_day','meaningful',$4,$5,$6::jsonb,now()+interval '24 hours') returning id,action_type,risk_level,summary,reason,payload,status,expires_at,created_at`,[owner,request.params.id,assistant.id,inferred.summary,inferred.reason,JSON.stringify(inferred.payload)])).rows[0];
      }
      if(!proposal){
        const inferred=inferEquipmentMemoryProposal(text,context);
        if(inferred)proposal=(await pool.query(`insert into nova_action_proposals(owner_user_id,conversation_id,source_message_id,action_type,risk_level,summary,reason,payload,expires_at)
          values($1,$2,$3,'remember_context','meaningful',$4,$5,$6::jsonb,now()+interval '24 hours') returning id,action_type,risk_level,summary,reason,payload,status,expires_at,created_at`,[owner,request.params.id,assistant.id,inferred.summary,inferred.reason,JSON.stringify(inferred.payload)])).rows[0];
      }
      await pool.query(`insert into nova_usage_events(owner_user_id,conversation_id,provider,model,request_id,input_tokens,output_tokens,cached_input_tokens,estimated_cost_micros,latency_ms,status)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'complete')`,[owner,request.params.id,generated.provider,generated.model,generated.providerMessageId,generated.usage.inputTokens,generated.usage.outputTokens,generated.usage.cachedInputTokens,generated.usage.estimatedCostMicros,generated.latencyMs]);
      if(!proposal)proposal=(await pool.query("select id,source_message_id,action_type,risk_level,summary,reason,payload,status,expires_at,created_at from nova_action_proposals where owner_user_id=$1 and conversation_id=$2 and status='pending' and (expires_at is null or expires_at>now()) order by created_at desc limit 1",[owner,request.params.id])).rows[0]??null;
      return{userMessage,assistant,proposal};
    }catch(error){
      await pool.query(`insert into nova_usage_events(owner_user_id,conversation_id,provider,model,status) values($1,$2,'openai',$3,'failed')`,[owner,request.params.id,NOVA_MODEL]).catch(()=>{});
      return reply.code(error.statusCode||502).send({error:error.message,code:error.code||"NOVA_FAILED",userMessage});
    }
  });

  app.post("/v1/nova/goals",{preHandler:app.authenticate},async(request,reply)=>{
    const title=clean(request.body?.title,180),description=clean(request.body?.description,2000),category=clean(request.body?.category,60)||"direction";
    const priority=Number(request.body?.priority??1),status=request.body?.status??"active",targetDate=request.body?.targetDate||null,sourceProposalId=request.body?.sourceProposalId||null;
    if(!title||!goalStatuses.has(status)||!Number.isInteger(priority)||priority<1||priority>5)return reply.code(400).send({error:"A valid goal title, status and priority are required."});
    if(sourceProposalId){const approved=await pool.query("select 1 from nova_action_proposals where id=$1 and owner_user_id=$2 and action_type='create_goal' and status in ('approved','applied')",[sourceProposalId,request.user.sub]);if(!approved.rows[0])return reply.code(409).send({error:"That goal proposal is not approved."});const existing=await pool.query("select * from nova_goals where owner_user_id=$1 and source_proposal_id=$2",[request.user.sub,sourceProposalId]);if(existing.rows[0])return existing.rows[0];}
    const result=await pool.query(`insert into nova_goals(owner_user_id,title,description,category,priority,status,target_date,source_type,confirmed_at,source_proposal_id)
      values($1,$2,$3,$4,$5,$6,$7,'user',now(),$8) returning *`,[request.user.sub,title,description,category,priority,status,targetDate,sourceProposalId]);
    return reply.code(201).send(result.rows[0]);
  });
  app.patch("/v1/nova/goals/:id",{preHandler:app.authenticate},async(request,reply)=>{
    const existing=await pool.query("select * from nova_goals where id=$1 and owner_user_id=$2",[request.params.id,request.user.sub]);
    if(!existing.rows[0])return reply.code(404).send({error:"Goal not found."});
    const next={...existing.rows[0],...request.body};const status=next.status,priority=Number(next.priority);
    if(!goalStatuses.has(status)||!Number.isInteger(priority)||priority<1||priority>5||!clean(next.title,180))return reply.code(400).send({error:"Invalid goal update."});
    const result=await pool.query(`update nova_goals set title=$3,description=$4,category=$5,priority=$6,status=$7,target_date=$8,updated_at=now()
      where id=$1 and owner_user_id=$2 returning *`,[request.params.id,request.user.sub,clean(next.title,180),clean(next.description,2000),clean(next.category,60)||"direction",priority,status,next.targetDate??next.target_date??null]);
    return result.rows[0];
  });

  app.post("/v1/nova/memories",{preHandler:app.authenticate},async(request,reply)=>{
    const kind=request.body?.kind,status=request.body?.status??"active",sourceType=request.body?.sourceType??"user_statement";
    const label=clean(request.body?.label,180),confidence=Number(request.body?.confidence??1),sourceProposalId=request.body?.sourceProposalId||null;
    if(!memoryKinds.has(kind)||!memoryStatuses.has(status)||!sourceTypes.has(sourceType)||!label||!Number.isFinite(confidence)||confidence<0||confidence>1)return reply.code(400).send({error:"Invalid memory entry."});
    if(sourceProposalId){const approved=await pool.query("select 1 from nova_action_proposals where id=$1 and owner_user_id=$2 and action_type='remember_context' and status in ('approved','applied')",[sourceProposalId,request.user.sub]);if(!approved.rows[0])return reply.code(409).send({error:"That memory proposal is not approved."});const existing=await pool.query("select * from nova_memory_entries where owner_user_id=$1 and source_proposal_id=$2",[request.user.sub,sourceProposalId]);if(existing.rows[0])return existing.rows[0];}
    const confirmed=status==="active"&&sourceType==="user_statement"?new Date():null;
    const result=await pool.query(`insert into nova_memory_entries(owner_user_id,kind,label,value,status,source_type,source_reference,confidence,confirmed_at,expires_at,source_proposal_id)
      values($1,$2,$3,$4::jsonb,$5,$6,$7::jsonb,$8,$9,$10,$11) returning *`,[request.user.sub,kind,label,JSON.stringify(request.body?.value??null),status,sourceType,JSON.stringify(request.body?.sourceReference??{}),confidence,confirmed,request.body?.expiresAt??null,sourceProposalId]);
    return reply.code(201).send(result.rows[0]);
  });
  app.patch("/v1/nova/memories/:id",{preHandler:app.authenticate},async(request,reply)=>{
    const status=request.body?.status,influence=request.body?.influenceEnabled;
    if(status&&!memoryStatuses.has(status))return reply.code(400).send({error:"Invalid memory status."});
    const result=await pool.query(`update nova_memory_entries set status=coalesce($3,status),influence_enabled=coalesce($4,influence_enabled),
      confirmed_at=case when $3='active' then coalesce(confirmed_at,now()) else confirmed_at end,last_reviewed_at=now(),updated_at=now()
      where id=$1 and owner_user_id=$2 returning *`,[request.params.id,request.user.sub,status??null,typeof influence==="boolean"?influence:null]);
    return result.rows[0]??reply.code(404).send({error:"Memory not found."});
  });
  app.delete("/v1/nova/memories/:id",{preHandler:app.authenticate},async(request,reply)=>{
    const result=await pool.query("delete from nova_memory_entries where id=$1 and owner_user_id=$2 returning id",[request.params.id,request.user.sub]);
    return result.rows[0]?reply.code(204).send():reply.code(404).send({error:"Memory not found."});
  });

  app.post("/v1/nova/proposals/:id/approve",{preHandler:app.authenticate,config:{rateLimit:{max:60,timeWindow:"1 minute"}}},async(request,reply)=>{
    const result=await pool.query(`update nova_action_proposals set status='approved',approved_at=coalesce(approved_at,now()),updated_at=now() where id=$1 and owner_user_id=$2 and status in ('pending','approved') and (expires_at is null or expires_at>now()) returning id,action_type,summary,reason,payload,status`,[request.params.id,request.user.sub]);
    return result.rows[0]??reply.code(409).send({error:"This proposal is no longer available."});
  });
  app.post("/v1/nova/proposals/:id/reject",{preHandler:app.authenticate,config:{rateLimit:{max:60,timeWindow:"1 minute"}}},async(request,reply)=>{
    const result=await pool.query("update nova_action_proposals set status='rejected',updated_at=now() where id=$1 and owner_user_id=$2 and status='pending' returning id,status",[request.params.id,request.user.sub]);
    return result.rows[0]??reply.code(409).send({error:"This proposal is no longer pending."});
  });
  app.post("/v1/nova/proposals/:id/applied",{preHandler:app.authenticate},async(request,reply)=>{
    const owner=request.user.sub;const client=await pool.connect();
    try{await client.query("begin");const proposal=(await client.query("update nova_action_proposals set status='applied',applied_at=now(),updated_at=now() where id=$1 and owner_user_id=$2 and status='approved' returning id,action_type",[request.params.id,owner])).rows[0];if(!proposal){await client.query("rollback");return reply.code(409).send({error:"Approve this proposal before applying it."});}const event=(await client.query(`insert into nova_action_events(owner_user_id,proposal_id,action_type,status,target_collection,target_key,receipt) values($1,$2,$3,'applied',$4,$5,$6::jsonb) returning id,created_at`,[owner,proposal.id,proposal.action_type,clean(request.body?.targetCollection,80)||null,clean(request.body?.targetKey,120)||null,JSON.stringify(request.body?.receipt??{})])).rows[0];await client.query("commit");return{proposalId:proposal.id,status:"applied",event};}catch(error){await client.query("rollback");throw error;}finally{client.release();}
  });
}

const NOVA_INSTRUCTIONS=`You are Nova, the private intelligence companion inside North fitness. You are the calmest room in North: warm, grounded, friendly, patient and quietly encouraging. Speak like a thoughtful human coach who knows the member, never like an RPC, support bot, policy document or fitness drill sergeant.
Speak naturally, warmly and directly. Use only the account-scoped context supplied in this request. Never claim access to another member, hidden records, or facts absent from the context. Clearly distinguish saved evidence from suggestions. Do not diagnose injury or disease. For sharp pain, chest pain, dizziness, numbness or dangerous symptoms, advise stopping and seeking appropriate professional help.
You may explain records and discuss options. You cannot directly change North in this conversation step. When the member clearly asks for a supported change, include one proposal; otherwise proposal must be null. Use create_goal or update_goal for direction changes, remember_context for a durable preference/constraint/schedule/equipment fact, add_reflection for a Journey thought, add_check_in for recovery data, and workout actions only for explicit planning requests. payloadJson must be valid JSON containing only the fields needed for that action. Never say a plan or record was changed unless an applied action receipt is present in context.
Write for a phone screen. Start with a natural direct answer. Use short paragraphs and, when listing exercises or steps, put each item on its own line beginning with “•”. Do not output Markdown asterisks, dense walls of text or raw machine-like field dumps. Prefer a friendly day name over repeating an ISO date unless the date prevents ambiguity.
Do not turn a direct request into an interview. Use the member’s saved records and stated context, then make a sensible, reversible proposal with clear assumptions. Ask one follow-up only when the missing answer is necessary to safely create the requested proposal; never ask about optional refinements such as extra equipment, preferences, or future progression. When the member asks to save or remember information, create the memory proposal immediately using all useful facts already stated and do not ask another question in that reply. After any proposal, stop; the next turn belongs to the member. Keep most replies under 180 words.`;

function validateProposal(input){
  const actionType=input?.actionType,allowed=new Set(["create_goal","update_goal","remember_context","add_check_in","add_reflection","create_workout","adjust_plan_day"]);if(!allowed.has(actionType))return null;
  let payload;try{payload=JSON.parse(input.payloadJson);}catch{return null;}if(!payload||typeof payload!=="object"||Array.isArray(payload))return null;
  const summary=clean(input.summary,180),reason=clean(input.reason,500);if(!summary||!reason)return null;
  if(actionType==="create_goal"&&!clean(payload.title,180))return null;
  if(actionType==="update_goal"&&(!/^[0-9a-f-]{36}$/i.test(payload.goalId??"")||!clean(payload.title,180)))return null;
  if(actionType==="remember_context"&&(!memoryKinds.has(payload.kind)||!clean(payload.label,180)))return null;
  if(actionType==="add_check_in"&&(!/^\d{4}-\d{2}-\d{2}$/.test(payload.date??"")||![1,2,3,4,5].includes(Number(payload.energy))||![1,2,3,4,5].includes(Number(payload.soreness))))return null;
  if(actionType==="add_reflection"&&(!/^\d{4}-\d{2}-\d{2}$/.test(payload.date??"")||!clean(payload.text,1000)))return null;
  if(["create_workout","adjust_plan_day"].includes(actionType)&&(!/^\d{4}-\d{2}-\d{2}$/.test(payload.date??"")||!clean(payload.title,180)))return null;
  if(actionType==="create_workout"){if(!Array.isArray(payload.exerciseIds))return null;payload.exerciseIds=[...new Set(payload.exerciseIds.map(String).filter((id)=>exerciseCoachingIds.has(id)))].slice(0,12);if(!payload.exerciseIds.length)return null;}
  return{actionType,summary,reason,payload};
}

function normalizeProposalDate(proposal,context,text){
  if(!proposal||!["create_workout","adjust_plan_day"].includes(proposal.actionType)||!/(?:\btoday\b|\btonight\b|\bthis evening\b)/i.test(text))return proposal;
  const date=context.memberTime?.currentDateIso;
  return date?{...proposal,payload:{...proposal.payload,date}}:proposal;
}

function inferBikeSessionProposal(text,context){
  if(!/\b(add|pair|include)\b/i.test(text))return null;
  const conversation=[text,...(context.recentConversation??[]).map((message)=>message.content)].join(" ");
  if(!/\bbike|ride|zone 2\b/i.test(conversation))return null;
  const duration=Number(conversation.match(/\b(\d{2,3})\s*(?:min(?:ute)?s?)\b/i)?.[1]??60);
  if(!Number.isFinite(duration)||duration<10||duration>240)return null;
  const date=context.memberTime?.currentDateIso;
  if(!date)return null;
  const day=(context.records?.["week-plan"]??[]).find((item)=>item?.date===date);
  if(!day||day.kind!=="strength")return null;
  const warmup=5, cooldown=5, steady=Math.max(1,duration-warmup-cooldown);
  return{
    summary:`Add a ${duration}-minute steady bike ride after today’s strength session`,
    reason:"You explicitly asked Nova to add the ride after confirming its duration, steady pace, and placement after lifting.",
    payload:{date,title:day.title,sessions:[{kind:"bike",title:`${duration}-minute steady bike ride`,role:"secondary",duration:String(duration),distance:"",note:`${warmup} min easy warm-up · ${steady} min steady Zone 2 · ${cooldown} min easy cool-down`}]},
  };
}

function inferEquipmentMemoryProposal(text,context){
  if(!/\b(save|remember|store)\b/i.test(text)||!/\b(memory|equipment|setup|it|this)\b/i.test(text))return null;
  const conversation=[...(context.recentConversation??[]).map((message)=>message.content),text].join(" ").toLowerCase();
  const equipment=[
    ["dumbbells","Dumbbells"],["floor mat","Floor mat"],["incline bench","Incline bench"],["bench","Bench"],["1 arm pulley","1-arm pulley"],["one arm pulley","1-arm pulley"],["barbell","Barbell"],["pull up bar","Pull-up bar"],["pull-up bar","Pull-up bar"],["squat rack","Squat rack"],
  ].filter(([term])=>conversation.includes(term)).map(([,label])=>label);
  const unique=[...new Set(equipment)];
  if(!unique.length)return null;
  return{summary:"Save your home training equipment for future Nova suggestions",reason:"You explicitly asked Nova to remember the equipment you described in this conversation.",payload:{kind:"equipment",label:`Home training equipment: ${unique.join(", ")}`,value:{equipment:unique}}};
}

async function buildNovaContext(pool,owner,conversationId,prompt=""){
  const allowed=["week-plan","workouts","check-ins","activities","profile","active-program","reviews","personal-workouts"];
  const [documents,goals,memories,messages,userResult]=await Promise.all([
    pool.query("select collection,data,updated_at from sync_documents where owner_user_id=$1 and collection=any($2::text[]) and deleted_at is null",[owner,allowed]),
    pool.query("select id,title,description,category,priority,status,target_date,source_type,confirmed_at from nova_goals where owner_user_id=$1 and status in ('active','draft') order by priority desc,updated_at desc limit 20",[owner]),
    pool.query("select kind,label,value,source_type,confidence,confirmed_at,expires_at from nova_memory_entries where owner_user_id=$1 and status='active' and influence_enabled=true and (expires_at is null or expires_at>now()) order by updated_at desc limit 40",[owner]),
    pool.query("select role,content,created_at from nova_messages where owner_user_id=$1 and conversation_id=$2 order by created_at desc limit 16",[owner,conversationId]),
    pool.query("select timezone from app_users where id=$1",[owner]),
  ]);
  const records={};for(const row of documents.rows)records[row.collection]=summarizeDocument(row.collection,row.data);
  const evidence=[...documents.rows.map((row)=>`${row.collection} updated ${new Date(row.updated_at).toISOString()}`),`${goals.rows.length} active or draft goals`,`${memories.rows.length} confirmed memory entries`];
  const timezone=userResult.rows[0]?.timezone||"UTC";
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",weekday:"long"}).formatToParts(new Date());
  const currentDate=parts.map((part)=>part.value).join("");const values=Object.fromEntries(parts.map((part)=>[part.type,part.value]));
  return{memberTime:{timezone,currentDate,currentDateIso:`${values.year}-${values.month}-${values.day}`},records,goals:goals.rows,memories:memories.rows,exerciseCandidates:retrieveExercises(prompt,records.profile,60),recentConversation:messages.rows.reverse(),evidence};
}

function retrieveExercises(prompt,profile,limit){
  const terms=new Set(`${prompt} ${(profile?.equipment??[]).join?.(" ")??""}`.toLowerCase().split(/[^a-z0-9]+/).filter((term)=>term.length>2));
  return exerciseCoachingIndex.map((exercise)=>{const haystack=[exercise.name,...exercise.aliases,exercise.category,exercise.type,exercise.difficulty,...exercise.equipment,...exercise.muscles,...exercise.patterns,...exercise.tags].join(" ").toLowerCase();let score=0;for(const term of terms)if(haystack.includes(term))score+=exercise.name.toLowerCase().includes(term)?5:1;return{exercise,score};}).filter((item)=>item.score>0).sort((a,b)=>b.score-a.score||a.exercise.name.localeCompare(b.exercise.name)).slice(0,limit).map((item)=>item.exercise);
}

function summarizeDocument(collection,data){
  if(collection==="workouts"&&Array.isArray(data))return data.slice(0,12).map((workout)=>({performedAt:workout.performedAt??workout.finishedAt,recordedAt:workout.recordedAt,energy:workout.energy,reflection:clean(workout.reflection,300),exercises:(workout.exercises??[]).map((exercise)=>({name:exercise.name,completedSets:(exercise.sets??[]).filter((set)=>set.complete).length,sets:(exercise.sets??[]).slice(0,8).map((set)=>({weight:set.weight,reps:set.reps,complete:set.complete,values:set.values}))}))}));
  if(["check-ins","activities","reviews"].includes(collection)&&Array.isArray(data))return data.slice(0,20);
  if(collection==="personal-workouts"&&Array.isArray(data))return data.slice(0,20).map((item)=>({id:item.id,name:item.name,focus:item.focus,goal:item.goal,duration:item.duration,equipment:item.equipment,exercises:(item.exercises??[]).map((exercise)=>exercise.exerciseName)}));
  if(collection==="profile"&&data&&typeof data==="object")return Object.fromEntries(["name","direction","experience","trainingDays","sessionLength","equipment","activities","coachingTone","memoryEnabled","strengthUnit","distanceUnit","bodyWeightUnit"].filter((key)=>key in data).map((key)=>[key,data[key]]));
  return data;
}
