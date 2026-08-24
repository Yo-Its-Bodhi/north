export type SupersetExerciseShape = {
  id: string;
  sets: Array<{ complete: boolean }>;
  supersetId?: string;
  supersetOrder?: number;
  supersetRest?: number;
};

export function normalizeSupersets<T extends SupersetExerciseShape>(exercises: T[]): T[] {
  const counts = new Map<string, number>();
  exercises.forEach((exercise) => {
    if (exercise.supersetId) counts.set(exercise.supersetId, (counts.get(exercise.supersetId) ?? 0) + 1);
  });
  return exercises.map((exercise) => {
    if (!exercise.supersetId || (counts.get(exercise.supersetId) ?? 0) < 2) {
      const plain = { ...exercise };
      delete plain.supersetId;
      delete plain.supersetOrder;
      delete plain.supersetRest;
      return plain as T;
    }
    return exercise;
  });
}

export function groupExercises<T extends SupersetExerciseShape>(exercises: T[], selectedIds: string[], groupId: string, restSeconds: number): T[] {
  const ids = [...new Set(selectedIds)];
  if (ids.length < 2 || ids.length > 4) throw new Error("Choose 2 to 4 exercises.");
  const members = exercises.filter((exercise) => ids.includes(exercise.id));
  if (members.length !== ids.length) throw new Error("One of those exercises is no longer available.");
  if (members.some((exercise) => exercise.supersetId)) throw new Error("Remove an existing superset before regrouping it.");
  if (new Set(members.map((exercise) => exercise.sets.length)).size !== 1) throw new Error("Superset exercises need the same number of sets.");

  const firstIndex = Math.min(...members.map((member) => exercises.findIndex((exercise) => exercise.id === member.id)));
  const orderedMembers = ids.map((id) => exercises.find((exercise) => exercise.id === id)!);
  const remaining = exercises.filter((exercise) => !ids.includes(exercise.id));
  const insertionIndex = exercises.slice(0, firstIndex).filter((exercise) => !ids.includes(exercise.id)).length;
  const grouped = orderedMembers.map((exercise, index) => ({
    ...exercise,
    supersetId: groupId,
    supersetOrder: index,
    supersetRest: Math.max(0, Math.min(600, Math.round(restSeconds))),
  }));
  return [...remaining.slice(0, insertionIndex), ...grouped, ...remaining.slice(insertionIndex)] as T[];
}

export function ungroupExercises<T extends SupersetExerciseShape>(exercises: T[], groupId: string): T[] {
  return exercises.map((exercise) => {
    if (exercise.supersetId !== groupId) return exercise;
    const plain = { ...exercise };
    delete plain.supersetId;
    delete plain.supersetOrder;
    delete plain.supersetRest;
    return plain as T;
  });
}

export function supersetMembers<T extends SupersetExerciseShape>(exercises: T[], groupId?: string): T[] {
  if (!groupId) return [];
  return exercises.filter((exercise) => exercise.supersetId === groupId).sort((left, right) => (left.supersetOrder ?? 0) - (right.supersetOrder ?? 0));
}

export function supersetSequenceLabel<T extends SupersetExerciseShape>(exercises: T[], exercise: T): string | null {
  if (!exercise.supersetId) return null;
  const groupIds = [...new Set(exercises.map((item) => item.supersetId).filter((id): id is string => Boolean(id)))];
  const groupIndex = groupIds.indexOf(exercise.supersetId);
  const letter = String.fromCharCode(65 + Math.max(0, groupIndex));
  return `${letter}${(exercise.supersetOrder ?? 0) + 1}`;
}

export type SupersetAdvance =
  | { kind: "next-member"; nextExerciseId: string; round: number; restSeconds: 0 }
  | { kind: "round-complete"; nextExerciseId: string; round: number; restSeconds: number }
  | { kind: "group-complete"; round: number; restSeconds: number };

export function getSupersetAdvance<T extends SupersetExerciseShape>(exercises: T[], exerciseId: string, setIndex: number): SupersetAdvance | null {
  const current = exercises.find((exercise) => exercise.id === exerciseId);
  if (!current?.supersetId) return null;
  const members = supersetMembers(exercises, current.supersetId);
  const currentPosition = members.findIndex((member) => member.id === current.id);
  const nextMember = members.slice(currentPosition + 1).find((member) => !member.sets[setIndex]?.complete);
  if (nextMember) return { kind: "next-member", nextExerciseId: nextMember.id, round: setIndex + 1, restSeconds: 0 };

  const nextRound = members[0]?.sets.findIndex((_, index) => index > setIndex && members.some((member) => !member.sets[index]?.complete)) ?? -1;
  const restSeconds = current.supersetRest ?? members[0]?.supersetRest ?? 90;
  if (nextRound >= 0) {
    const nextExercise = members.find((member) => !member.sets[nextRound]?.complete) ?? members[0];
    return { kind: "round-complete", nextExerciseId: nextExercise.id, round: setIndex + 1, restSeconds };
  }
  return { kind: "group-complete", round: setIndex + 1, restSeconds };
}
