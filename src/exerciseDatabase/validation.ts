import { accessibilityTags, bodyPositions, categories, equipment, exerciseTypes, movementPatterns, muscles, referenceIds, trackingTemplates } from "./taxonomies";
import type { Exercise, ExerciseDatabase, NormalizationIssue } from "./types";

const key = (value: string) => value.trim().toLocaleLowerCase().replace(/[\s_-]+/g, " ");
const duplicates = (values: Array<{ value:string; path:string }>) => {
  const seen = new Map<string,string>(); const issues: NormalizationIssue[] = [];
  for (const item of values) { const normalized=key(item.value); const previous=seen.get(normalized); if (previous) issues.push({ path:item.path, code:"duplicate", message:`Duplicates ${previous}: ${item.value}`, severity:"error" }); else seen.set(normalized,item.path); }
  return issues;
};

export function validateExerciseDatabase(database: ExerciseDatabase): NormalizationIssue[] {
  const issues: NormalizationIssue[] = validateTaxonomies(database);
  const exerciseIds = new Set(database.exercises.map((x) => x.id));
  const muscleIds = new Set(database.muscles.map((x) => x.id)); const equipmentIds = new Set(database.equipment.map((x) => x.id));
  const categoryIds = new Set(database.categories.map((x) => x.id)); const patternIds = new Set(database.movementPatterns.map((x) => x.id));
  const templateMap = new Map(database.trackingTemplates.map((x) => [x.id,x]));
  issues.push(...duplicates(database.exercises.map((x,i) => ({value:x.id,path:`exercises[${i}].id`}))),
    ...duplicates(database.exercises.map((x,i) => ({value:x.slug,path:`exercises[${i}].slug`}))),
    ...duplicates(database.exercises.flatMap((x,i) => [x.canonicalName,...x.aliases].map((value) => ({ value,path:`exercises[${i}].names` })) )));
  for (const [index, exercise] of database.exercises.entries()) {
    const path=`exercises[${index}]`;
    for (const field of ["id","canonicalName","displayName","slug","shortDescription"] as const) if (!exercise[field]?.trim()) issues.push({path:`${path}.${field}`,code:"required",message:`${field} is required`,severity:"error"});
    if(exercise.instructions.length<2||exercise.executionCues.length<3||exercise.executionCues.length>6||!exercise.commonMistakes.length)issues.push({path,code:"guidance",message:"Published exercises require instructions, three to six coaching cues, and common mistakes",severity:"error"});
    if(!exercise.exerciseTypeIds.length||!exercise.exerciseTypeIds.includes(exercise.exerciseType)||exercise.exerciseTypeIds.some((x)=>!exerciseTypes.includes(x)))issues.push({path:`${path}.exerciseTypeIds`,code:"exercise_type",message:"Invalid exercise type classification",severity:"error"});
    if(exercise.technicalComplexity<1||exercise.technicalComplexity>5)issues.push({path:`${path}.technicalComplexity`,code:"complexity",message:"Technical complexity must be between 1 and 5",severity:"error"});
    for(const tag of exercise.accessibilityTags)if(!accessibilityTags.includes(tag as never))issues.push({path:`${path}.accessibilityTags`,code:"accessibility",message:`Unknown accessibility tag ${tag}`,severity:"error"});
    if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(exercise.id) || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(exercise.slug)) issues.push({path,code:"stable_id",message:"IDs and slugs must be lowercase snake_case",severity:"error"});
    if (!categoryIds.has(exercise.categoryId)) issues.push({path:`${path}.categoryId`,code:"reference",message:"Unknown category",severity:"error"});
    if (!templateMap.has(exercise.trackingTemplateId)) issues.push({path:`${path}.trackingTemplateId`,code:"reference",message:"Unknown tracking template",severity:"error"});
    if (!exercise.muscles.some((m) => m.role === "primary") && !["cardiovascular","mobility","flexibility","breathing","recovery"].includes(exercise.exerciseType)) issues.push({path:`${path}.muscles`,code:"primary_muscle",message:"At least one primary muscle is required",severity:"error"});
    const contribution = exercise.muscles.reduce((sum,m) => sum+(m.contributionPercent ?? 0),0); if (contribution > 100) issues.push({path:`${path}.muscles`,code:"contribution",message:"Muscle contributions exceed 100%",severity:"error"});
    for (const item of exercise.muscles) { if (!muscleIds.has(item.muscleId)) issues.push({path:`${path}.muscles`,code:"reference",message:`Unknown muscle ${item.muscleId}`,severity:"error"}); if(!["high","moderate","low"].includes(item.contributionLevel))issues.push({path:`${path}.muscles`,code:"contribution",message:"Invalid contribution level",severity:"error"}); }
    for (const item of exercise.equipment) if (!equipmentIds.has(item.equipmentId)) issues.push({path:`${path}.equipment`,code:"reference",message:`Unknown equipment ${item.equipmentId}`,severity:"error"});
    for (const id of exercise.movementPatternIds) if (!patternIds.has(id)) issues.push({path:`${path}.movementPatternIds`,code:"reference",message:`Unknown movement pattern ${id}`,severity:"error"});
    const refs: Array<[string,readonly string[],string[]]> = [["bodyPositionIds",referenceIds.bodyPositions,exercise.bodyPositionIds],["gripIds",referenceIds.grips,exercise.gripIds],["stanceIds",referenceIds.stances,exercise.stanceIds],["loadPlacementIds",referenceIds.loadPlacements,exercise.loadPlacementIds]];
    for (const [name,allowed,values] of refs) for (const value of values) if (!allowed.includes(value as never)) issues.push({path:`${path}.${name}`,code:"reference",message:`Unknown ${name}: ${value}`,severity:"error"});
    if (!referenceIds.rangesOfMotion.includes(exercise.rangeOfMotionId as never) || !referenceIds.impactLevels.includes(exercise.impactLevelId as never)) issues.push({path,code:"reference",message:"Unknown range-of-motion or impact ID",severity:"error"});
    const template=templateMap.get(exercise.trackingTemplateId); if (template) { for (const [fieldId,unit] of Object.entries(exercise.defaultUnits)) { const f=template.fields.find((x)=>x.id===fieldId); if (!f || !f.units.includes(unit!)) issues.push({path:`${path}.defaultUnits.${fieldId}`,code:"unit",message:`Unit ${unit} is not valid for this template field`,severity:"error"}); } if(exercise.tempoSupport&&!template.supportsTempo)issues.push({path:`${path}.tempoSupport`,code:"tracking",message:"Exercise enables tempo on an incompatible template",severity:"error"}); if(exercise.unilateral&&!template.supportsSides)issues.push({path:`${path}.unilateral`,code:"tracking",message:"Unilateral exercise requires side-aware tracking",severity:"error"}); if(exercise.timedHold&&!exercise.holdPositionIds.length)issues.push({path:`${path}.holdPositionIds`,code:"tracking",message:"Timed hold requires at least one hold position",severity:"error"}); }
    for (const relationship of exercise.relationships) { if (relationship.fromExerciseId !== exercise.id || !exerciseIds.has(relationship.toExerciseId)) issues.push({path:`${path}.relationships`,code:"relationship",message:`Invalid relationship ${relationship.id}`,severity:"error"}); }
  }
  for (const type of ["progression","regression"] as const) {
    const edges=new Map<string,string[]>(); for (const x of database.exercises) for (const r of x.relationships.filter((r)=>r.type===type)) edges.set(x.id,[...(edges.get(x.id)??[]),r.toExerciseId]);
    const visiting=new Set<string>(); const visited=new Set<string>(); const visit=(id:string):boolean => { if(visiting.has(id)) return true; if(visited.has(id)) return false; visiting.add(id); if((edges.get(id)??[]).some(visit)) return true; visiting.delete(id); visited.add(id); return false; };
    if (database.exercises.some((x)=>visit(x.id))) issues.push({path:"relationships",code:"cycle",message:`Circular ${type} relationship detected`,severity:"error"});
  }
  return issues;
}

export const canonicalExerciseDatabase = (exercises: Exercise[]): ExerciseDatabase => ({ exercises, muscles, equipment, trackingTemplates, categories, movementPatterns });

export function validateTaxonomies(database:ExerciseDatabase):NormalizationIssue[] {
  const issues:NormalizationIssue[]=[]; const muscleIds=new Set(database.muscles.map((x)=>x.id));
  const validateRecords=(name:string,records:Array<{id:string;displayName?:string;name?:string;aliases?:string[]}>)=>{
    issues.push(...duplicates(records.map((x,i)=>({value:x.id,path:`${name}[${i}].id`}))));
    issues.push(...duplicates(records.flatMap((x,i)=>(x.aliases??[]).map((value)=>({value,path:`${name}[${i}].aliases`})))));
    records.forEach((x,i)=>{if(!(x.displayName??x.name)?.trim())issues.push({path:`${name}[${i}]`,code:"display_name",message:"Display name is required",severity:"error"});});
  };
  validateRecords("muscles",database.muscles);validateRecords("equipment",database.equipment);validateRecords("movementPatterns",database.movementPatterns);validateRecords("categories",database.categories);validateRecords("trackingTemplates",database.trackingTemplates);
  for(const [i,item] of database.muscles.entries()) { if(item.parentMuscleGroupId && !muscleIds.has(item.parentMuscleGroupId))issues.push({path:`muscles[${i}].parentMuscleGroupId`,code:"parent",message:`Unknown parent ${item.parentMuscleGroupId}`,severity:"error"}); if(!/^muscle-[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(item.visualSvgTargetId))issues.push({path:`muscles[${i}].visualSvgTargetId`,code:"visual_target",message:"Invalid SVG target ID",severity:"error"}); }
  const validGroups=new Set(["no_equipment","free_weights","benches_and_supports","bands_and_cables","gym_machines","cardio_equipment","conditioning"]); for(const [i,item] of database.equipment.entries())if(!validGroups.has(item.equipmentGroup))issues.push({path:`equipment[${i}].equipmentGroup`,code:"equipment_group",message:"Invalid equipment group",severity:"error"});
  for(const [i,template] of database.trackingTemplates.entries()) { const fields=new Map(template.fields.map((x)=>[x.id,x])); const overlap=template.requiredFieldIds.filter((id)=>template.optionalFieldIds.includes(id)); if(overlap.length)issues.push({path:`trackingTemplates[${i}]`,code:"tracking_field",message:`Fields cannot be both required and optional: ${overlap.join(", ")}`,severity:"error"}); for(const id of [...template.requiredFieldIds,...template.optionalFieldIds])if(!fields.has(id))issues.push({path:`trackingTemplates[${i}]`,code:"tracking_field",message:`Broken field ${id}`,severity:"error"}); for(const f of template.fields){if(!f.units.length||!f.units.includes(f.defaultUnit)||!f.units.every((u)=>template.supportedUnits.includes(u)))issues.push({path:`trackingTemplates[${i}].fields.${f.id}`,code:"unit",message:"Invalid or unsupported tracking unit",severity:"error"});} }
  if(new Set(exerciseTypes).size!==exerciseTypes.length)issues.push({path:"exerciseTypes",code:"duplicate",message:"Duplicate exercise type",severity:"error"}); if(new Set(bodyPositions).size!==bodyPositions.length)issues.push({path:"bodyPositions",code:"duplicate",message:"Duplicate body position",severity:"error"});
  return issues;
}
