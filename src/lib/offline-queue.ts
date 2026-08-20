// Pending shopping-list changes made while offline, persisted so they can
// be replayed against the server once the connection comes back. Keyed by
// list ("shopping" = derived from the menu, "extra" = added by hand) and
// item id; a later change for the same item simply replaces the earlier
// one instead of piling up, since only the latest intent matters.

export type PendingChange =
  | { kind: "shopping" | "extra"; type: "toggle"; itemId: string; purchased: boolean }
  | { kind: "shopping" | "extra"; type: "remove"; itemId: string };

const STORAGE_KEY = "saborsemanal:shopping:offline-queue";

function readQueue(): PendingChange[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingChange[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingChange[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage can be unavailable in privacy-restricted browsers; the
    // change still applied locally to the in-memory UI state, it just
    // won't survive a reload before reconnecting.
  }
}

export function loadPendingChanges(kind: "shopping" | "extra"): PendingChange[] {
  return readQueue().filter((change) => change.kind === kind);
}

export function enqueueChange(change: PendingChange) {
  const queue = readQueue().filter(
    (existing) =>
      !(existing.kind === change.kind && existing.itemId === change.itemId),
  );
  queue.push(change);
  writeQueue(queue);
}

// Removes and returns every queued change for one list, leaving the other
// list's pending changes (if any) untouched.
export function dequeueChanges(kind: "shopping" | "extra"): PendingChange[] {
  const queue = readQueue();
  const [matching, rest] = [
    queue.filter((change) => change.kind === kind),
    queue.filter((change) => change.kind !== kind),
  ];
  writeQueue(rest);
  return matching;
}
