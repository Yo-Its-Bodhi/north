import { NORTH_API_BASE, northDeviceHeaders, withFreshAccess } from "./account";
import type { WorkoutTemplate } from "./workouts";

export type CommunityWorkoutRecord = {
  id: string;
  sourceTemplateId: string;
  template: Omit<WorkoutTemplate, "id" | "source" | "community" | "lineage">;
  creator: { id: string; displayName: string; username: string };
  originalWorkoutId?: string | null;
  originalCreator?: { id: string; displayName: string; username: string } | null;
  version: number;
  saves: number;
  starts: number;
  publishedAt: string;
  updatedAt: string;
  ownedByViewer: boolean;
};

async function communityRequest<T>(path: string, init: RequestInit = {}) {
  return withFreshAccess(async (token) => {
    const response = await fetch(`${NORTH_API_BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...northDeviceHeaders(), ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
    if (response.status === 204) return undefined as T;
    const result = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) throw new Error(response.status === 404 ? "Community is not available on this server yet." : result.error || `Community returned ${response.status}`);
    return result;
  });
}

export function communityRecordToTemplate(record: CommunityWorkoutRecord): WorkoutTemplate {
  return {
    ...record.template,
    id: `community-${record.id}`,
    source: "community",
    community: {
      id: record.id,
      sourceTemplateId: record.sourceTemplateId,
      creator: record.creator,
      originalWorkoutId: record.originalWorkoutId ?? undefined,
      originalCreator: record.originalCreator ?? undefined,
      version: record.version,
      saves: record.saves,
      starts: record.starts,
      publishedAt: record.publishedAt,
      updatedAt: record.updatedAt,
      ownedByViewer: record.ownedByViewer,
    },
  };
}

export const listCommunityWorkouts = (offset = 0, limit = 24) => communityRequest<{ workouts: CommunityWorkoutRecord[]; nextOffset: number | null }>(`/v1/community/workouts?offset=${offset}&limit=${limit}`);
export const publishCommunityWorkout = (template: WorkoutTemplate) => communityRequest<CommunityWorkoutRecord>("/v1/community/workouts", {
  method: "POST",
  body: JSON.stringify({ sourceTemplateId: template.id, template, originalWorkoutId: template.lineage?.originalCommunityWorkoutId }),
});
export const unpublishCommunityWorkout = (publicationId: string) => communityRequest<void>(`/v1/community/workouts/${publicationId}`, { method: "DELETE" });
export const recordCommunityInteraction = (publicationId: string, action: "save" | "start") => communityRequest<CommunityWorkoutRecord>(`/v1/community/workouts/${publicationId}/${action}`, { method: "POST" });