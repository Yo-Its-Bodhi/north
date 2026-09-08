// Apply only the edits made since this device last saw the account document.
// Unchanged days/records must retain newer values written by another device.
export function mergeAccountData(base: unknown, local: unknown, remote: unknown): unknown {
  if (JSON.stringify(base) === JSON.stringify(local)) return remote;
  if (Array.isArray(local) && Array.isArray(remote) && (base == null || Array.isArray(base))) {
    const before = Array.isArray(base) ? base : [];
    const key = (item: unknown): string | undefined => {
      if (!item || typeof item !== "object") return undefined;
      const row = item as Record<string, unknown>;
      const id = row.id ?? row.finishedAt ?? row.date;
      return typeof id === "string" ? id : undefined;
    };
    // Only uniquely identifiable collections can be merged without guessing.
    if ([before, local, remote].every((rows) => rows.every((row) => key(row)) && new Set(rows.map(key)).size === rows.length)) {
      const prior = new Map(before.map((row) => [key(row), row]));
      const edits = new Map(local.map((row) => [key(row), row]));
      const merged = remote.filter((row) => !prior.has(key(row)) || edits.has(key(row))).map((row) => {
        const id = key(row);
        if (!edits.has(id)) return row;
        return mergeAccountData(prior.get(id), edits.get(id), row);
      });
      const present = new Set(remote.map(key));
      for (const row of local) if (!present.has(key(row)) && (!prior.has(key(row)) || JSON.stringify(prior.get(key(row))) !== JSON.stringify(row))) merged.push(row);
      return merged;
    }
  }
  if (base && local && remote && !Array.isArray(base) && !Array.isArray(local) && !Array.isArray(remote) && typeof base === "object" && typeof local === "object" && typeof remote === "object") {
    const before = base as Record<string, unknown>, edits = local as Record<string, unknown>;
    const merged = { ...remote } as Record<string, unknown>;
    for (const key of new Set([...Object.keys(before), ...Object.keys(edits)])) {
      if (JSON.stringify(before[key]) === JSON.stringify(edits[key])) continue;
      if (!(key in edits)) delete merged[key];
      else merged[key] = mergeAccountData(before[key], edits[key], merged[key]);
    }
    return merged;
  }
  return local;
}
