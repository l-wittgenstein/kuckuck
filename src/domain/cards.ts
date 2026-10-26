// A card is the unit the scheduler tracks. A word gives two cards
// (meaning, and production with article); each grammar exercise gives one.
import type { ContentItem } from "../content";
import type { Exercise, GrammarItem, VocabItem } from "../../content/schema";

export type CardKind = "recognition" | "production" | "cloze";

export type CardRef =
  | { id: string; itemId: string; kind: "recognition" | "production"; item: VocabItem }
  | { id: string; itemId: string; kind: "cloze"; item: GrammarItem; exercise: Exercise };

export function cardsFor(content: ContentItem): CardRef[] {
  if (content.kind === "vocab") {
    const item = content.item;
    return (["recognition", "production"] as const).map((kind) => ({
      id: `${item.id}:${kind}`,
      itemId: item.id,
      kind,
      item,
    }));
  }
  const item = content.item;
  return item.exercises.map((exercise) => ({
    // "g-a1-0001-e3" → "g-a1-0001:e3"
    id: `${item.id}:${exercise.id.slice(item.id.length + 1)}`,
    itemId: item.id,
    kind: "cloze",
    item,
    exercise,
  }));
}

// A blank that opens a sentence needs a capital for that reason alone,
// not because the word is a noun.
export function gapStartsSentence(sentence: string): boolean {
  return /^(|.*[.!?]\s+)$/.test(sentence.split("___")[0]);
}
