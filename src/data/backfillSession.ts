export function backfillSessionTiming(performedDate: string, recordedAt: string, currentDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(performedDate) || performedDate > currentDate) {
    throw new Error("Backfilled sessions require a valid date that is not in the future.");
  }

  return {
    performedAt: `${performedDate}T12:00:00`,
    recordedAt,
    addedLater: performedDate < currentDate,
  };
}