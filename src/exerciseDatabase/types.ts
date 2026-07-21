export type StableId = string;
export type IsoTimestamp = string;

export type ExerciseStatus = "draft" | "reviewed" | "published" | "archived";
export type MuscleRole = "primary" | "secondary" | "synergist" | "stabilizer" | "supporting" | "antagonist" | "dynamic_stabilizer";
export type RelationshipType = "regression" | "progression" | "substitution" | "variation";
export type TrackingValueType = "integer" | "decimal" | "duration" | "distance" | "boolean" | "text" | "tempo";
export type TrackingUnit = "reps" | "kg" | "lb" | "seconds" | "minutes" | "metres" | "feet" | "yards" | "kilometres" | "miles" | "min_per_km" | "min_per_mile" | "km_per_hour" | "miles_per_hour" | "kilocalories" | "watts" | "rpm" | "bpm" | "heart_rate_zone" | "metres_elevation" | "percent_incline" | "rpe" | "rir" | "percent" | "rounds" | "steps" | "none";
export type MuscleContribution = "high" | "moderate" | "low";
export type ExerciseType = "strength" | "hypertrophy" | "muscular_endurance" | "cardiovascular" | "power" | "plyometric" | "speed" | "agility" | "mobility" | "flexibility" | "stability" | "balance" | "rehabilitation" | "warm_up" | "cool_down" | "recovery" | "sport_specific" | "skill_practice" | "breathing";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type ReviewState = "unreviewed" | "in_review" | "approved" | "rejected";

export interface ExerciseAlias { id: StableId; exerciseId: StableId; alias: string; locale: string; }
export type MuscleVisibility = "front" | "back" | "side";
export type Laterality = "left" | "right" | "bilateral";
export interface Muscle { id: StableId; displayName: string; commonName: string; anatomicalName: string; parentMuscleGroupId?: StableId; bodyRegion: string; visibility: MuscleVisibility[]; laterality: Laterality[]; visualSvgTargetId: string; description: string; aliases: string[]; active: boolean; }
export interface ExerciseMuscle { muscleId: StableId; role: MuscleRole; contributionLevel: MuscleContribution; contributionPercent?: number; visualRegionId: string; intensity: 1 | 2 | 3; notes?: string; }
export type EquipmentGroup = "no_equipment" | "free_weights" | "benches_and_supports" | "bands_and_cables" | "gym_machines" | "cardio_equipment" | "conditioning";
export type Suitability = "home" | "gym" | "outdoor";
export type ResistanceType = "none" | "bodyweight" | "gravity" | "free_weight" | "elastic" | "cable" | "selectorized" | "plate_loaded" | "motorized" | "air" | "magnetic" | "friction" | "water" | "partner";
export interface Equipment { id: StableId; displayName: string; equipmentGroup: EquipmentGroup; aliases: string[]; suitability: Suitability[]; resistanceType: ResistanceType; imageRef?: string; iconRef?: string; active: boolean; }
export interface ExerciseEquipment { equipmentId: StableId; required: boolean; quantity?: number; notes?: string; }
export interface MovementPattern { id: StableId; displayName: string; active: boolean; }
export interface ExerciseCategory { id: StableId; name: string; exerciseType: ExerciseType; }

export interface Tempo { eccentricSeconds?: number; pauseBottomSeconds?: number; concentricSeconds?: number; pauseTopSeconds?: number; notation: string; }
export interface TrackingField { id: StableId; label: string; valueType: TrackingValueType; units: TrackingUnit[]; defaultUnit: TrackingUnit; required: boolean; perSide?: boolean; minimum?: number; maximum?: number; step?: number; }
export interface ExerciseTrackingTemplate { id: StableId; name: string; fields: TrackingField[]; requiredFieldIds: StableId[]; optionalFieldIds: StableId[]; supportedUnits: TrackingUnit[]; defaultUnits: Partial<Record<string,TrackingUnit>>; supportsSides: boolean; supportsTempo: boolean; supportsAssistanceWeight: boolean; supportsAddedWeight: boolean; supportsHeartRate: boolean; supportsIntervals: boolean; supportsWarmups: boolean; supportsRounds: boolean; }
export interface ExerciseRelationship { id: StableId; fromExerciseId: StableId; toExerciseId: StableId; type: RelationshipType; reason: string; priority: number; }
export interface ExerciseSourceMetadata { sourceName: string; sourceUrl?: string; license?: string; importedAt?: IsoTimestamp; externalId?: string; }
export interface ExerciseReviewMetadata { state: ReviewState; reviewedBy?: string; reviewedAt?: IsoTimestamp; reviewNotes?: string; version: number; }

export interface Exercise {
  id: StableId;
  canonicalName: string;
  displayName: string;
  slug: string;
  aliases: string[];
  shortDescription: string;
  instructions: string[];
  setupCues: string[];
  executionCues: string[];
  breathingCues: string[];
  commonMistakes: string[];
  safetyNotes: string[];
  muscles: ExerciseMuscle[];
  equipment: ExerciseEquipment[];
  categoryId: StableId;
  exerciseType: ExerciseType;
  exerciseTypeIds: ExerciseType[];
  movementPatternIds: StableId[];
  bodyPositionIds: StableId[];
  gripIds: StableId[];
  stanceIds: StableId[];
  loadPlacementIds: StableId[];
  rangeOfMotionId: StableId;
  impactLevelId: StableId;
  difficulty: Difficulty;
  accessibilityTags: string[];
  contraindicationTags: string[];
  skillDemand: 1 | 2 | 3 | 4 | 5;
  technicalComplexity: 1 | 2 | 3 | 4 | 5;
  balanceDemand: 1 | 2 | 3 | 4 | 5;
  mobilityDemand: 1 | 2 | 3 | 4 | 5;
  trackingTemplateId: StableId;
  defaultUnits: Partial<Record<string, TrackingUnit>>;
  defaultTempo?: Tempo;
  tempoSupport: boolean;
  holdPositionIds: string[];
  unilateral: boolean;
  timedHold: boolean;
  cardio: boolean;
  relationships: ExerciseRelationship[];
  tags: string[];
  source: ExerciseSourceMetadata;
  review: ExerciseReviewMetadata;
  status: ExerciseStatus;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface Workout { id: StableId; ownerUserId: StableId; name: string; performedAt: IsoTimestamp; enteredAt: IsoTimestamp; exercises: WorkoutExercise[]; notes?: string; }
export interface WorkoutExercise { id: StableId; workoutId: StableId; exerciseId: StableId; position: number; sets: WorkoutSet[]; notes?: string; }
export interface WorkoutSet { id: StableId; workoutExerciseId: StableId; position: number; completed: boolean; values: Record<string, number | string | boolean | Tempo | null>; }
export interface CardioPerformance { durationSeconds: number; distance?: number; distanceUnit?: Extract<TrackingUnit, "metres" | "kilometres" | "miles">; averageHeartRate?: number; averageWatts?: number; cadenceRpm?: number; }
export interface TimedHoldPerformance { durationSeconds: number; addedLoad?: number; loadUnit?: Extract<TrackingUnit, "kg" | "lb">; }
export interface UnilateralPerformance { left: Record<string, number | null>; right: Record<string, number | null>; alternated: boolean; }

export interface ExerciseDatabase { exercises: Exercise[]; muscles: Muscle[]; equipment: Equipment[]; trackingTemplates: ExerciseTrackingTemplate[]; categories: ExerciseCategory[]; movementPatterns: MovementPattern[]; }

export interface RawExerciseImport { sourceId?: string; name: string; aliases?: string[]; category?: string; equipment?: string[]; muscles?: Array<{ name: string; role?: string }>; tracking?: string; source?: ExerciseSourceMetadata; [key: string]: unknown; }
export interface NormalizationIssue { path: string; code: string; message: string; severity: "error" | "warning"; }
