import type { Exercise, NormalizationIssue, RawExerciseImport } from "./types";

const normalizeKey=(value:string)=>value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
export interface ImportCandidate { raw:RawExerciseImport; proposedId:string; normalizedName:string; issues:NormalizationIssue[]; duplicateOf?:string; }

/** Import staging deliberately stops before creating a publishable Exercise. Editorial review is mandatory. */
export function stageExerciseImports(rawRows:RawExerciseImport[], existing:Exercise[]=[]):ImportCandidate[] {
  const names=new Map(existing.flatMap((x)=>[x.canonicalName,...x.aliases].map((name)=>[normalizeKey(name),x.id] as const)));
  return rawRows.map((raw,index)=>{ const issues:NormalizationIssue[]=[]; const normalizedName=raw.name?.trim(); if(!normalizedName) issues.push({path:`rows[${index}].name`,code:"required",message:"A source name is required",severity:"error"});
    const proposedId=normalizeKey(normalizedName||`unnamed_${index}`); const duplicateOf=names.get(proposedId); if(duplicateOf) issues.push({path:`rows[${index}].name`,code:"possible_duplicate",message:`May duplicate ${duplicateOf}`,severity:"warning"});
    if(!raw.source?.sourceName) issues.push({path:`rows[${index}].source`,code:"provenance",message:"Source provenance should be supplied before review",severity:"warning"});
    return {raw,proposedId,normalizedName,issues,duplicateOf}; });
}
