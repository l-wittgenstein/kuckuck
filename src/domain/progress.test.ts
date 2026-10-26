import { describe, expect, it } from "vitest";
import { allBatches, findUnit } from "../content";
import { batchStatuses, nextBatch, unitProgress } from "./progress";

const ids = allBatches.map((b) => b.id);

describe("lesson unlocking", () => {
  it("opens only the first lesson at the start", () => {
    const statuses = batchStatuses(allBatches, new Set());
    expect(statuses.get(ids[0])).toBe("available");
    expect([...statuses.values()].filter((s) => s === "available")).toHaveLength(1);
    expect(nextBatch(allBatches, new Set())?.id).toBe("a1-u01-b01");
  });

  it("opens the next lesson after a pass", () => {
    const statuses = batchStatuses(allBatches, new Set([ids[0]]));
    expect(statuses.get(ids[0])).toBe("done");
    expect(statuses.get(ids[1])).toBe("available");
    expect(statuses.get(ids[2])).toBe("locked");
  });

  it("keeps unit 2 locked until every unit 1 lesson has passed", () => {
    const unit1 = findUnit("a1-u01")!;
    const unit2 = findUnit("a1-u02")!;
    const allButLast = new Set(unit1.batches.slice(0, -1).map((b) => b.id));
    expect(unitProgress(unit2, batchStatuses(allBatches, allButLast)).locked).toBe(true);

    const all = new Set(unit1.batches.map((b) => b.id));
    const statuses = batchStatuses(allBatches, all);
    expect(unitProgress(unit1, statuses)).toEqual({ done: 7, total: 7, locked: false });
    expect(unitProgress(unit2, statuses).locked).toBe(false);
    expect(nextBatch(allBatches, all)?.id).toBe("a1-u02-b01");
  });

  it("reports nothing next when everything is done", () => {
    expect(nextBatch(allBatches, new Set(ids))).toBeUndefined();
  });
});
