import { generateNovaReply } from "./nova-provider.mjs";

const clean=(value,max=500)=>String(value??"").trim().slice(0,max);

const GUIDE_INSTRUCTIONS=`You are North Guide, the product concierge inside North fitness. You explain how North and Nova work and help members reach the right place. You are not Nova: you do not inspect personal records, coach a member's training, create plans, remember facts, or change data. When a question requires personal records or coaching, say that Nova is the right place and briefly explain why.
Answer only from the NORTH GUIDE SOURCES supplied in the request. Never invent a screen, control, capability, integration, policy, or result. If the sources do not answer the question, say so plainly and suggest opening the full North Guide. Distinguish plans from completed records and suggestions from actions. Do not diagnose injury or disease; for dangerous symptoms advise stopping and seeking appropriate professional help.
Write for someone using North for the first time. Use common everyday words. Avoid product jargon unless the member used it first. Do not repeat the source article or explain every related feature. Answer the exact question in the first sentence. For a how-to or step-by-step question, put each action on its own numbered line using "1. ", "2. ", and "3. "; use no more than three short steps. Keep replies under 70 words. If the member says hello, reply briefly and ask what they need. Never answer a greeting with product instructions.
Sound calm, direct and human, never like a corporate support bot. Do not use Markdown headings, links, asterisks or filler. The interface supplies verified navigation actions separately.`;

function normalizeSources(input){
  if(!Array.isArray(input))return[];
  return input.slice(0,3).map((source)=>({
    id:clean(source?.id,80),title:clean(source?.title,140),topic:clean(source?.topic,80),summary:clean(source?.summary,500),introduction:clean(source?.introduction,1200),
    steps:Array.isArray(source?.steps)?source.steps.slice(0,8).map((step)=>({title:clean(step?.title,160),body:clean(step?.body,1200)})):[],
    remember:clean(source?.remember,500),action:source?.action?{label:clean(source.action.label,100),destination:clean(source.action.destination,80),intent:clean(source.action.intent,80)}:null,
  })).filter((source)=>source.id&&source.title&&source.introduction);
}

export function registerGuideRoutes(app){
  app.post("/v1/guide/respond",{preHandler:app.authenticate,config:{rateLimit:{max:30,timeWindow:"1 hour"}}},async(request,reply)=>{
    const question=clean(request.body?.question,1200),sources=normalizeSources(request.body?.sources);
    if(!question)return reply.code(400).send({error:"Ask North Guide a question."});
    if(!sources.length)return reply.code(400).send({error:"North Guide could not find a reliable source for that question."});
    try{
      const generated=await generateNovaReply({instructions:GUIDE_INSTRUCTIONS,input:`NORTH GUIDE SOURCES\n${JSON.stringify(sources)}\n\nMEMBER QUESTION\n${question}`});
      return{answer:generated.text};
    }catch(error){
      return reply.code(error.statusCode||502).send({error:error.message,code:error.code||"GUIDE_FAILED"});
    }
  });
}
