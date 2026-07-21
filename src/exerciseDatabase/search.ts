import type { Equipment, Exercise, ExerciseDatabase, Muscle, TrackingUnit } from "./types";

export interface ExerciseSearchFilters { categoryId?: string; equipmentIds?: string[]; movementPatternId?: string; difficulty?: Exercise["difficulty"]; exerciseType?: Exercise["exerciseType"]; trackingTemplateId?: string; }
export interface ExerciseSearchResult { exercise: Exercise; score: number; matchedOn: string[]; }
const normalize = (value:string) => value.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();

export function searchExercises(database: ExerciseDatabase, query:string, filters:ExerciseSearchFilters={}): ExerciseSearchResult[] {
  const q=normalize(query); const tokens=q.split(" ").filter(Boolean);
  return database.exercises.filter((x) => !filters.categoryId || x.categoryId===filters.categoryId)
    .filter((x)=>!filters.equipmentIds?.length || filters.equipmentIds.every((id)=>x.equipment.some((e)=>e.equipmentId===id)))
    .filter((x)=>!filters.movementPatternId || x.movementPatternIds.includes(filters.movementPatternId))
    .filter((x)=>!filters.difficulty || x.difficulty===filters.difficulty).filter((x)=>!filters.exerciseType || x.exerciseType===filters.exerciseType)
    .filter((x)=>!filters.trackingTemplateId || x.trackingTemplateId===filters.trackingTemplateId)
    .map((exercise) => { const canonical=normalize(exercise.canonicalName); const aliases=exercise.aliases.map(normalize); const muscleRecords=exercise.muscles.flatMap((mapping)=>{const record=database.muscles.find((x)=>x.id===mapping.muscleId);const parent=record?.parentMuscleGroupId?database.muscles.find((x)=>x.id===record.parentMuscleGroupId):undefined;return record?[record.id,record.displayName,record.commonName,record.anatomicalName,...record.aliases,...(parent?[parent.id,parent.displayName,parent.commonName,...parent.aliases]:[])]:[];});const equipmentRecords=exercise.equipment.flatMap((mapping)=>{const record=database.equipment.find((x)=>x.id===mapping.equipmentId);return record?[record.id,record.displayName,...record.aliases,record.equipmentGroup]:[];});const category=database.categories.find((x)=>x.id===exercise.categoryId);const template=database.trackingTemplates.find((x)=>x.id===exercise.trackingTemplateId); const tags=[...exercise.tags,...exercise.movementPatternIds,...muscleRecords,...equipmentRecords,exercise.difficulty,exercise.exerciseType,...exercise.exerciseTypeIds,category?.name??"",template?.id??"",template?.name??""].map(normalize); const matchedOn:string[]=[]; let score=q?0:1;
      if(q && canonical===q){score+=100;matchedOn.push("canonical_name");} else if(q && canonical.startsWith(q)){score+=70;matchedOn.push("canonical_name");} else if(tokens.every((t)=>canonical.includes(t))){score+=45;matchedOn.push("canonical_name");}
      if(q && aliases.some((x)=>x===q)){score+=90;matchedOn.push("alias");} else if(q && aliases.some((x)=>tokens.every((t)=>x.includes(t)))){score+=40;matchedOn.push("alias");}
      const tagHits=tokens.filter((t)=>tags.some((x)=>x.includes(t))).length; if(tagHits){score+=tagHits*12;matchedOn.push("taxonomy");} return {exercise,score,matchedOn}; })
    .filter((x)=>!q || x.score>0).sort((a,b)=>b.score-a.score || a.exercise.displayName.localeCompare(b.exercise.displayName));
}

export function searchEquipment(records:Equipment[],query:string):Equipment[] { const q=normalize(query); if(!q)return records.filter((x)=>x.active); return records.filter((x)=>x.active&&[x.id,x.displayName,...x.aliases].some((value)=>normalize(value).includes(q))).sort((a,b)=>normalize(a.displayName)===q?-1:normalize(b.displayName)===q?1:a.displayName.localeCompare(b.displayName)); }
export function getMuscleChildren(records:Muscle[],parentId:string):Muscle[] { return records.filter((x)=>x.active&&x.parentMuscleGroupId===parentId); }
export function getMuscleDescendants(records:Muscle[],parentId:string):Muscle[] { const children=getMuscleChildren(records,parentId); return [...children,...children.flatMap((child)=>getMuscleDescendants(records,child.id))]; }
export function isTrackingUnitSupported(database:Pick<ExerciseDatabase,"trackingTemplates">,templateId:string,fieldId:string,unit:TrackingUnit):boolean { const template=database.trackingTemplates.find((x)=>x.id===templateId); const field=template?.fields.find((x)=>x.id===fieldId); return Boolean(field?.units.includes(unit)&&template?.supportedUnits.includes(unit)); }
