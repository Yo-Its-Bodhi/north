import { NORTH_API_BASE, northDeviceHeaders, readNorthSession, withFreshAccess } from "./account";

export type NovaApiMessage={id:string;role:"user"|"assistant";content:string;evidence?:string[];confidence?:"high"|"moderate"|"limited";model?:string;created_at:string};
export type NovaApiStatus={available:boolean;model:string|null;mode:"connected"|"setup_required";usage:{period:"this_month";replies:number;tokens:number;estimatedCostMicros:number}};
export type NovaGoal={id:string;title:string;description:string;category:string;priority:number;status:"draft"|"active"|"paused"|"completed"|"abandoned";target_date?:string|null;source_type:string;updated_at:string};
export type NovaMemory={id:string;kind:string;label:string;value:unknown;status:"proposed"|"active"|"rejected"|"archived";source_type:string;confidence:number;influence_enabled:boolean;updated_at:string};
export type NovaApiProposal={id:string;source_message_id?:string;action_type:"create_goal"|"update_goal"|"remember_context"|"add_check_in"|"add_reflection"|"create_workout"|"adjust_plan_day";risk_level:"meaningful";summary:string;reason:string;payload:Record<string,unknown>;status:"pending"|"approved"|"applied"|"rejected";expires_at?:string};
export type NovaBootstrap={conversations:Array<{id:string;title:string;status:string;updated_at:string}>;goals:NovaGoal[];memories:NovaMemory[];pendingProposals:NovaApiProposal[]};

async function novaRequest<T>(path:string,init:RequestInit={}){
  return withFreshAccess(async(token)=>{
    const response=await fetch(`${NORTH_API_BASE}${path}`,{...init,headers:{Authorization:`Bearer ${token}`,...northDeviceHeaders(),...(init.body?{"Content-Type":"application/json"}:{}),...init.headers}});
    const result=await response.json().catch(()=>({})) as T&{error?:string;code?:string};
    if(!response.ok)throw Object.assign(new Error(result.error||`Nova returned ${response.status}`),{status:response.status,code:result.code});
    return result;
  });
}

export const getNovaStatus=()=>novaRequest<NovaApiStatus>("/v1/nova/status");
export const getNovaBootstrap=()=>novaRequest<NovaBootstrap>("/v1/nova/bootstrap");
export const createNovaGoal=(input:{title:string;description?:string;category?:string;priority?:number;targetDate?:string|null;sourceProposalId?:string})=>novaRequest<NovaGoal>("/v1/nova/goals",{method:"POST",body:JSON.stringify(input)});
export const updateNovaGoal=(id:string,input:Partial<Pick<NovaGoal,"title"|"description"|"category"|"priority"|"status">>&{targetDate?:string|null})=>novaRequest<NovaGoal>(`/v1/nova/goals/${id}`,{method:"PATCH",body:JSON.stringify(input)});
export const updateNovaMemory=(id:string,input:{status?:NovaMemory["status"];influenceEnabled?:boolean})=>novaRequest<NovaMemory>(`/v1/nova/memories/${id}`,{method:"PATCH",body:JSON.stringify(input)});
export const createNovaMemory=(input:{kind:string;label:string;value?:unknown;status?:NovaMemory["status"];sourceType?:string;confidence?:number;sourceProposalId?:string})=>novaRequest<NovaMemory>("/v1/nova/memories",{method:"POST",body:JSON.stringify(input)});
export const deleteNovaMemory=(id:string)=>novaRequest<void>(`/v1/nova/memories/${id}`,{method:"DELETE"});
export const approveNovaProposal=(id:string)=>novaRequest<NovaApiProposal>(`/v1/nova/proposals/${id}/approve`,{method:"POST"});
export const rejectNovaProposal=(id:string)=>novaRequest<{id:string;status:string}>(`/v1/nova/proposals/${id}/reject`,{method:"POST"});
export const recordNovaProposalApplied=(id:string,input:{targetCollection:string;targetKey:string;receipt:unknown})=>novaRequest<{proposalId:string;status:string}>(`/v1/nova/proposals/${id}/applied`,{method:"POST",body:JSON.stringify(input)});

export async function getOrCreateNovaConversation(){
  const session=readNorthSession();if(!session)throw new Error("Sign in to talk with Nova.");
  const key=`north-nova-conversation-id:${session.user.id}`;const existing=localStorage.getItem(key);
  if(existing)return existing;
  const bootstrap=await getNovaBootstrap();const active=bootstrap.conversations.find((conversation)=>conversation.status==="active");
  if(active){localStorage.setItem(key,active.id);return active.id;}
  const created=await novaRequest<{id:string}>("/v1/nova/conversations",{method:"POST",body:JSON.stringify({title:"New conversation"})});
  localStorage.setItem(key,created.id);return created.id;
}

export async function loadNovaConversation(){
  const conversationId=await getOrCreateNovaConversation();
  const result=await novaRequest<{messages:NovaApiMessage[]}>(`/v1/nova/conversations/${conversationId}/messages`);
  return result.messages;
}

export async function archiveNovaConversation(){
  const session=readNorthSession();if(!session)return;
  const key=`north-nova-conversation-id:${session.user.id}`;const id=localStorage.getItem(key);
  if(id)await novaRequest(`/v1/nova/conversations/${id}`,{method:"PATCH",body:JSON.stringify({status:"archived"})});
  localStorage.removeItem(key);
}

export async function sendNovaMessage(text:string){
  const conversationId=await getOrCreateNovaConversation();
  return novaRequest<{userMessage:NovaApiMessage;assistant:NovaApiMessage;proposal:NovaApiProposal|null}>(`/v1/nova/conversations/${conversationId}/respond`,{method:"POST",body:JSON.stringify({text})});
}
