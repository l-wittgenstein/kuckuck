import type { UnitContent } from "../content";
import { itemStage, STAGES, type Stage, type StagedCard } from "./stages";

export interface ItemStats {
  stages: Record<Stage, number>;
  studied: number;
  total: number;
}

function itemIds(unit: UnitContent): string[] {
  return [...unit.vocab, ...unit.grammar].map((i) => i.id);
}

// Counts items (not cards) per stage; an item without cards is unstudied.
export function itemStats(units: UnitContent[], cardsByItem: Map<string, StagedCard[]>): ItemStats {
  const stages = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  let studied = 0;
  let total = 0;
  for (const unit of units) {
    for (const id of itemIds(unit)) {
      total++;
      const stage = itemStage(cardsByItem.get(id) ?? []);
      if (stage) {
        stages[stage]++;
        studied++;
      }
    }
  }
  return { stages, studied, total };
}
