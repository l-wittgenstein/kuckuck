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
