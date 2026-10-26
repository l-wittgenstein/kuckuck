// Lessons unlock strictly in order: a batch is open once every batch
// before it (in this unit and all earlier units) has passed its quiz.
import type { BatchInfo, UnitContent } from "../content";

export type BatchStatus = "done" | "available" | "locked";

export function batchStatuses(
  batches: BatchInfo[],
  passed: ReadonlySet<string>,
): Map<string, BatchStatus> {
  const statuses = new Map<string, BatchStatus>();
  let open = true;
  for (const batch of batches) {
    if (passed.has(batch.id)) {
      statuses.set(batch.id, "done");
    } else if (open) {
      statuses.set(batch.id, "available");
      open = false;
    } else {
      statuses.set(batch.id, "locked");
    }
  }
  return statuses;
}

export function nextBatch(
  batches: BatchInfo[],
  passed: ReadonlySet<string>,
): BatchInfo | undefined {
  return batches.find((b) => !passed.has(b.id));
}

export interface UnitProgress {
  done: number;
  total: number;
  locked: boolean;
}

export function unitProgress(
  unit: UnitContent,
  statuses: Map<string, BatchStatus>,
): UnitProgress {
  const own = unit.batches.map((b) => statuses.get(b.id));
  return {
    done: own.filter((s) => s === "done").length,
    total: own.length,
    locked: own.every((s) => s === "locked"),
  };
}
