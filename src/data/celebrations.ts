export type EarnedMoment = {
  id: string;
  kind: "first" | "comeback" | "rhythm" | "program";
  eyebrow: string;
  title: string;
  detail: string;
};

type DatedRecord = { performedAt?: string | null; startedAt?: string | null; finishedAt?: string | null };

const dayMs = 86_400_000;

function recordTime(record: DatedRecord) {
  return new Date(record.performedAt ?? record.finishedAt ?? record.startedAt ?? 0).getTime();
}

function mondayKey(value: number) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Math.floor(date.getTime() / (dayMs * 7));
}

export function deriveEarnedMoments(
  previousRecords: DatedRecord[],
  completedAt: string,
  programWeekComplete = false,
): EarnedMoment[] {
  const now = new Date(completedAt).getTime();
  if (!Number.isFinite(now)) return [];

  const validTimes = previousRecords.map(recordTime).filter((time) => Number.isFinite(time) && time > 0 && time < now).sort((a, b) => a - b);
  const moments: EarnedMoment[] = [];

  if (validTimes.length === 0) {
    moments.push({ id: "first-workout", kind: "first", eyebrow: "THE FIRST MARK", title: "Your North story starts here.", detail: "One completed session is now a real record you can build on." });
  } else {
    const daysAway = Math.floor((now - validTimes.at(-1)!) / dayMs);
    if (daysAway >= 14) moments.push({ id: `comeback-${new Date(completedAt).toISOString().slice(0, 10)}`, kind: "comeback", eyebrow: "BACK ON THE PATH", title: "The comeback counts.", detail: `${daysAway} days away, then you chose to return. North remembers the return—not the gap.` });
  }

  const weekKeys = new Set([...validTimes, now].map(mondayKey));
  let rhythm = 1;
  const currentWeek = mondayKey(now);
  while (weekKeys.has(currentWeek - rhythm)) rhythm += 1;
  if ([2, 4, 8, 12, 26, 52].includes(rhythm)) moments.push({ id: `rhythm-${rhythm}-${currentWeek}`, kind: "rhythm", eyebrow: "RHYTHM BUILT", title: `${rhythm} weeks of showing up.`, detail: "Not perfection. A repeatable rhythm with room for real life." });

  if (programWeekComplete) moments.push({ id: `program-week-${currentWeek}`, kind: "program", eyebrow: "WEEK COMPLETE", title: "The plan became action.", detail: "Every planned program session for this week now has a completed record." });
  return moments;
}
