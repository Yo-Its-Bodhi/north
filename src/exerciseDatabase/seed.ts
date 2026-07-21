import type { ExerciseDatabase } from "./types";

export interface SeedRecord { table:string; naturalKey:string; payload:Record<string,unknown>; }
/** Deterministic records for an idempotent DB seeder; intentionally contains no connection or credentials. */
export function buildExerciseSeedRecords(database:ExerciseDatabase):SeedRecord[] {
  return [
    ...database.muscles.map((x)=>({table:"muscles",naturalKey:x.id,payload:{...x}})),
    ...database.equipment.map((x)=>({table:"equipment",naturalKey:x.id,payload:{...x}})),
    ...database.categories.map((x)=>({table:"exercise_categories",naturalKey:x.id,payload:{...x}})),
    ...database.movementPatterns.map((x)=>({table:"movement_patterns",naturalKey:x.id,payload:{...x}})),
    ...database.trackingTemplates.map((x)=>({table:"tracking_templates",naturalKey:x.id,payload:{...x,fields:undefined}})),
    ...database.trackingTemplates.flatMap((x)=>x.fields.map((field)=>({table:"tracking_fields",naturalKey:`${x.id}:${field.id}`,payload:{templateId:x.id,...field}}))),
    ...database.exercises.map((x)=>({table:"exercises",naturalKey:x.id,payload:{...x}})),
  ];
}
