// What a finished review session shows: which items she got right on the
// first try, which she missed, and the extra-practice queue for the misses.
import type { GrammarItem, VocabItem } from "../../content/schema";
import type { CardRef } from "./cards";
import type { FirstAttempt } from "./quiz";
import { shuffled } from "./quiz";

export interface ItemResult {
  itemId: string;
  item: VocabItem | GrammarItem;
  // Cards of this item answered wrong on the first try (not overridden).
  missed: CardRef[];
}

export interface SessionResults {
  right: ItemResult[];
  wrong: ItemResult[];
  // First tries that counted as right, out of all answered cards.
  rightCards: number;
  answeredCards: number;
}

export function isMiss(attempt: FirstAttempt): boolean {
  return attempt.result.outcome === "wrong" && !attempt.overridden;
}

// One entry per item, in the order its first card was asked. An item is
// wrong if any of its cards was missed.
export function sessionResults(cards: CardRef[], firstAttempts: Record<string, FirstAttempt>): SessionResults {
  const byItem = new Map<string, ItemResult>();
  let answeredCards = 0;
  let rightCards = 0;
  for (const card of cards) {
    const attempt = firstAttempts[card.id];
    if (!attempt) continue;
    answeredCards++;
    let entry = byItem.get(card.itemId);
    if (!entry) {
      entry = { itemId: card.itemId, item: card.item, missed: [] };
      byItem.set(card.itemId, entry);
    }
    if (isMiss(attempt)) entry.missed.push(card);
    else rightCards++;
  }
  const items = [...byItem.values()];
  return {
    right: items.filter((r) => r.missed.length === 0),
    wrong: items.filter((r) => r.missed.length > 0),
    rightCards,
    answeredCards,
  };
}

// Each missed card `rounds` times: shuffled within each round, and never
// the same card twice in a row where that can be avoided.
export function drillQueue(cards: CardRef[], rounds = 3, random: () => number = Math.random): CardRef[] {
  const queue: CardRef[] = [];
  for (let r = 0; r < rounds; r++) {
    const round = shuffled(cards, random);
    if (round.length > 1 && queue.length > 0 && round[0].id === queue[queue.length - 1].id) {
      [round[0], round[1]] = [round[1], round[0]];
    }
    queue.push(...round);
  }
  return queue;
}
