// Loads the JSON content at build time. Validation happens in
// `npm run validate-content`, so here the files are trusted as typed.
import type {
  GrammarItem,
  Level,
  Manifest,
  Unit,
  VocabItem,
} from "../../content/schema";

const files = import.meta.glob<{ default: unknown }>("../../content/**/*.json", {
  eager: true,
});

function file<T>(path: string): T {
  const mod = files[`../../content/${path}`];
  if (!mod) throw new Error(`Missing content file: ${path}`);
  return mod.default as T;
}

export interface UnitContent extends Unit {
  vocab: VocabItem[];
  grammar: GrammarItem[];
}

export interface LevelContent extends Level {
  unitContents: UnitContent[];
}

export const manifest = file<Manifest>("manifest.json");

export const levels: LevelContent[] = manifest.levels.map((levelId) => {
  const level = file<Level>(`${levelId}/level.json`);
  return {
    ...level,
    unitContents: level.units.map((unitId) => {
      const dir = `${levelId}/${unitId.split("-")[1]}`;
      return {
        ...file<Unit>(`${dir}/unit.json`),
        vocab: file<VocabItem[]>(`${dir}/vocab.json`),
        grammar: file<GrammarItem[]>(`${dir}/grammar.json`),
      };
    }),
  };
});

export function findUnit(unitId: string): UnitContent | undefined {
  return levels.flatMap((l) => l.unitContents).find((u) => u.id === unitId);
}

export type ContentItem =
  | { kind: "vocab"; item: VocabItem }
  | { kind: "grammar"; item: GrammarItem };

export interface BatchInfo {
  id: string;
  index: number; // 0-based position in the unit
  unit: UnitContent;
  items: ContentItem[];
}

const itemsById = new Map<string, ContentItem>();
for (const unit of levels.flatMap((l) => l.unitContents)) {
  for (const item of unit.vocab) itemsById.set(item.id, { kind: "vocab", item });
  for (const item of unit.grammar) itemsById.set(item.id, { kind: "grammar", item });
}

export function findItem(itemId: string): ContentItem | undefined {
  return itemsById.get(itemId);
}

// Every batch of every unit, in the order she studies them.
export const allBatches: BatchInfo[] = levels
  .flatMap((l) => l.unitContents)
  .flatMap((unit) =>
    unit.batches.map((batch, index) => ({
      id: batch.id,
      index,
      unit,
      items: batch.itemIds.map((id) => itemsById.get(id)!),
    })),
  );

export function findBatch(batchId: string): BatchInfo | undefined {
  return allBatches.find((b) => b.id === batchId);
}
