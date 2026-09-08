const API_URL=(process.env.NOVA_AI_BASE_URL||"https://api.openai.com/v1").replace(/\/$/,"");
export const NOVA_MODEL=process.env.NOVA_MODEL||"gpt-5.2";
const inputCostMicrosPerToken=Number(process.env.NOVA_INPUT_COST_MICROS_PER_TOKEN??0);
const cachedInputCostMicrosPerToken=Number(process.env.NOVA_CACHED_INPUT_COST_MICROS_PER_TOKEN??inputCostMicrosPerToken);
const outputCostMicrosPerToken=Number(process.env.NOVA_OUTPUT_COST_MICROS_PER_TOKEN??0);

export function novaProviderReady(){return Boolean(process.env.OPENAI_API_KEY);}

function estimatedCostMicros(usage){
  return Math.max(0,Math.round(usage.inputTokens*inputCostMicrosPerToken+usage.cachedInputTokens*cachedInputCostMicrosPerToken+usage.outputTokens*outputCostMicrosPerToken));
}

function outputText(response){
  if(typeof response.output_text==="string"&&response.output_text.trim())return response.output_text.trim();
  return (response.output??[]).flatMap((item)=>item.content??[]).filter((item)=>item.type==="output_text").map((item)=>item.text).join("\n").trim();
}

export async function generateNovaReply({instructions,input,structured=false}){
  if(!novaProviderReady())throw Object.assign(new Error("Nova's AI provider is not configured locally."),{statusCode:503,code:"NOVA_PROVIDER_NOT_CONFIGURED"});
  const started=performance.now();
  const response=await fetch(`${API_URL}/responses`,{method:"POST",headers:{authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model:NOVA_MODEL,instructions,input,reasoning:{effort:"low"},max_output_tokens:1200,...(structured?{text:{format:{type:"json_schema",name:"north_nova_response",strict:true,schema:NOVA_RESPONSE_SCHEMA}}}:{})}),signal:AbortSignal.timeout(45000)});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(body?.error?.message||`Nova provider returned ${response.status}.`),{statusCode:response.status>=500?502:response.status,code:"NOVA_PROVIDER_ERROR"});
  const text=outputText(body);
  if(!text)throw Object.assign(new Error("Nova returned an empty response."),{statusCode:502,code:"NOVA_EMPTY_RESPONSE"});
  let decision=null;
  if(structured){try{decision=JSON.parse(text);}catch{throw Object.assign(new Error("Nova returned an invalid structured response."),{statusCode:502,code:"NOVA_INVALID_RESPONSE"});}}
  const usage={inputTokens:Number(body.usage?.input_tokens??0),outputTokens:Number(body.usage?.output_tokens??0),cachedInputTokens:Number(body.usage?.input_tokens_details?.cached_tokens??0)};
  return{text:decision?.reply??text,decision,provider:"openai",model:body.model||NOVA_MODEL,providerMessageId:body.id??null,usage:{...usage,estimatedCostMicros:estimatedCostMicros(usage)},latencyMs:Math.round(performance.now()-started)};
}

const NOVA_RESPONSE_SCHEMA={type:"object",additionalProperties:false,required:["reply","confidence","evidence","proposal"],properties:{reply:{type:"string"},confidence:{type:"string",enum:["high","moderate","limited"]},evidence:{type:"array",items:{type:"string"},maxItems:6},proposal:{anyOf:[{type:"null"},{type:"object",additionalProperties:false,required:["actionType","summary","reason","payloadJson"],properties:{actionType:{type:"string",enum:["create_goal","update_goal","remember_context","add_check_in","add_reflection","create_workout","adjust_plan_day"]},summary:{type:"string"},reason:{type:"string"},payloadJson:{type:"string"}}}]}}};
