import { useLiveQuery } from "dexie-react-hooks";
import { newSrsState } from "../srs/scheduler";
import { db, type CardRecord, type KuckuckDB } from "./db";

export function useAllCards(): CardRecord[] | undefined {
  return useLiveQuery(() => db.cards.toArray());
}

export function groupByItem(cards: CardRecord[]): Map<string, CardRecord[]> {
  const byItem = new Map<string, CardRecord[]>();
  for (const card of cards) {
    const list = byItem.get(card.itemId);
    if (list) list.push(card);
    else byItem.set(card.itemId, [card]);
  }
  return byItem;
}

// "Ricomincia da capo": every card of the item back to new, due now.
export async function resetItem(itemId: string, now = new Date(), database: KuckuckDB = db) {
  await database.transaction("rw", database.cards, async () => {
    const cards = await database.cards.where("itemId").equals(itemId).toArray();
    for (const card of cards) {
      await database.cards.update(card.id, { srs: newSrsState(now), due: now, retired: false });
    }
  });
}
