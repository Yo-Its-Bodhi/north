import type { Exercise, RelationshipType } from "./types";

export function resolveExerciseRelationships(exercises: Exercise[], exerciseId: string, types?: RelationshipType[]): Exercise[] {
  const byId=new Map(exercises.map((x)=>[x.id,x])); const source=byId.get(exerciseId); if(!source) return [];
  return source.relationships.filter((x)=>!types || types.includes(x.type)).sort((a,b)=>a.priority-b.priority).map((x)=>byId.get(x.toExerciseId)).filter((x):x is Exercise=>Boolean(x));
}
