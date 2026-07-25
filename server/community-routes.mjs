const workoutGoals = new Set(["Strength", "Muscle", "General fitness", "Conditioning", "Mobility"]);
const workoutLevels = new Set(["Beginner", "Intermediate", "Advanced"]);
const workoutLocations = new Set(["Gym", "Home", "Anywhere"]);
const workoutDays = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const text = (value, maximum = 200) => String(value ?? "").trim().slice(0, maximum);

function publicationSnapshot(input) {
  if (!input || typeof input !== "object") return null;
  const name = text(input.name, 120);
  const description = text(input.description, 1200);
  const focus = text(input.focus, 80);
  const duration = Number(input.duration);
  const equipment = Array.isArray(input.equipment) ? [...new Set(input.equipment.map((item) => text(item, 80)).filter(Boolean))].slice(0, 20) : [];
  const exercises = Array.isArray(input.exercises) ? input.exercises.slice(0, 30).map((exercise) => ({
    exerciseName: text(exercise?.exerciseName, 160),
    canonicalExerciseId: text(exercise?.canonicalExerciseId, 160) || undefined,
    sets: Number(exercise?.sets),
    reps: text(exercise?.reps, 100),
    rest: Number(exercise?.rest),
  })) : [];
  const validExercises = exercises.length > 0 && exercises.every((exercise) => exercise.exerciseName && Number.isInteger(exercise.sets) && exercise.sets >= 1 && exercise.sets <= 20 && exercise.reps && Number.isFinite(exercise.rest) && exercise.rest >= 0 && exercise.rest <= 600);
  if (!name || !focus || !workoutGoals.has(input.goal) || !workoutLevels.has(input.level) || !Number.isInteger(duration) || duration < 5 || duration > 240 || !equipment.length || !workoutLocations.has(input.location) || !validExercises) return null;
  const preferredDay = input.preferredDay && workoutDays.has(input.preferredDay) ? input.preferredDay : undefined;
  return { name, description, focus, goal: input.goal, level: input.level, duration, equipment, location: input.location, preferredDay, exercises };
}

function derivativeFingerprint(snapshot) {
  return JSON.stringify({ focus: snapshot.focus, goal: snapshot.goal, level: snapshot.level, duration: snapshot.duration, equipment: snapshot.equipment, location: snapshot.location, exercises: snapshot.exercises });
}

function mapCommunityWorkout(row) {
  return {
    id: row.id,
    sourceTemplateId: row.source_template_id,
    template: row.template_snapshot,
    creator: { id: row.owner_user_id, displayName: row.display_name, username: row.username },
    originalWorkoutId: row.original_workout_id,
    originalCreator: row.original_creator_id ? { id: row.original_creator_id, displayName: row.original_creator_name, username: row.original_creator_username } : null,
    version: row.version,
    saves: row.save_count,
    starts: row.start_count,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    ownedByViewer: Boolean(row.owned_by_viewer),
  };
}

const returningCommunityWorkout = `select w.*,u.display_name,c.username,(w.owner_user_id=$2)::boolean owned_by_viewer,
  ou.id original_creator_id,ou.display_name original_creator_name,oc.username original_creator_username
  from community_workouts w join app_users u on u.id=w.owner_user_id
  join local_credentials c on c.owner_user_id=w.owner_user_id
  left join community_workouts ow on ow.id=w.original_workout_id
  left join app_users ou on ou.id=ow.owner_user_id left join local_credentials oc on oc.owner_user_id=ou.id
  where w.id=$1`;

export function registerCommunityRoutes(app, { pool }) {
  app.get("/v1/community/workouts", { preHandler: app.authenticate }, async (request) => {
    const limit = Math.min(50, Math.max(1, Number(request.query?.limit) || 24));
    const offset = Math.max(0, Number(request.query?.offset) || 0);
    const result = await pool.query(`select w.*,u.display_name,c.username,(w.owner_user_id=$3)::boolean owned_by_viewer,
      ou.id original_creator_id,ou.display_name original_creator_name,oc.username original_creator_username
      from community_workouts w join app_users u on u.id=w.owner_user_id
      join local_credentials c on c.owner_user_id=w.owner_user_id
      left join community_workouts ow on ow.id=w.original_workout_id
      left join app_users ou on ou.id=ow.owner_user_id left join local_credentials oc on oc.owner_user_id=ou.id
      where w.status='published' and u.deleted_at is null and u.status='active'
      order by w.updated_at desc,w.id desc limit $1 offset $2`, [limit + 1, offset, request.user.sub]);
    const hasMore = result.rows.length > limit;
    return { workouts: result.rows.slice(0, limit).map(mapCommunityWorkout), nextOffset: hasMore ? offset + limit : null };
  });

  app.post("/v1/community/workouts", { preHandler: app.authenticate, config: { rateLimit: { max: 30, timeWindow: "1 hour" } } }, async (request, reply) => {
    const sourceTemplateId = text(request.body?.sourceTemplateId, 200);
    const snapshot = publicationSnapshot(request.body?.template);
    if (!sourceTemplateId || !snapshot) return reply.code(400).send({ error: "A complete, valid workout is required before publishing." });
    let originalWorkoutId = uuidPattern.test(String(request.body?.originalWorkoutId ?? "")) ? request.body.originalWorkoutId : null;
    if (originalWorkoutId) {
      const original = await pool.query("select coalesce(root.id,w.id) id,coalesce(root.template_snapshot,w.template_snapshot) template_snapshot from community_workouts w left join community_workouts root on root.id=w.original_workout_id where w.id=$1 and w.status='published'", [originalWorkoutId]);
      if (!original.rows[0]) return reply.code(409).send({ error: "The original Community workout is no longer available for attribution." });
      originalWorkoutId = original.rows[0].id;
      if (derivativeFingerprint(snapshot) === derivativeFingerprint(original.rows[0].template_snapshot)) return reply.code(409).send({ error: "Make a meaningful training change before publishing this copy. You can still save it privately or share the original." });
    }
    const saved = await pool.query(`insert into community_workouts(owner_user_id,source_template_id,template_snapshot,original_workout_id)
      values($1,$2,$3::jsonb,$4) on conflict(owner_user_id,source_template_id) do update set
      template_snapshot=excluded.template_snapshot,original_workout_id=coalesce(community_workouts.original_workout_id,excluded.original_workout_id),
      status='published',version=community_workouts.version+1,updated_at=now(),published_at=case when community_workouts.status='archived' then now() else community_workouts.published_at end
      returning id`, [request.user.sub, sourceTemplateId, JSON.stringify(snapshot), originalWorkoutId]);
    const result = await pool.query(returningCommunityWorkout, [saved.rows[0].id, request.user.sub]);
    return reply.code(201).send(mapCommunityWorkout(result.rows[0]));
  });

  app.delete("/v1/community/workouts/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const result = await pool.query("update community_workouts set status='archived',updated_at=now() where id=$1 and owner_user_id=$2 and status='published' returning id", [request.params.id, request.user.sub]);
    if (!result.rows[0]) return reply.code(404).send({ error: "Published workout not found or not owned by this account." });
    return reply.code(204).send();
  });

  app.post("/v1/community/workouts/:id/:action", { preHandler: app.authenticate, config: { rateLimit: { max: 120, timeWindow: "1 hour" } } }, async (request, reply) => {
    const action = request.params.action;
    if (!new Set(["save", "start"]).has(action)) return reply.code(404).send({ error: "Community action not found." });
    const column = action === "save" ? "save_count" : "start_count";
    const updated = await pool.query(`update community_workouts set ${column}=${column}+1 where id=$1 and status='published' returning id`, [request.params.id]);
    if (!updated.rows[0]) return reply.code(404).send({ error: "Community workout not found." });
    const result = await pool.query(returningCommunityWorkout, [updated.rows[0].id, request.user.sub]);
    return mapCommunityWorkout(result.rows[0]);
  });
}