import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StageBadge } from "../../components/Stage";
import { allBatches, findItem } from "../../content";
import { resetItem } from "../../db/cards";
import { db } from "../../db/db";
import { resurrectCard } from "../../db/reviews";
import { cardsFor } from "../../domain/cards";
import { cardStage, itemStage } from "../../domain/stages";
import { it } from "../../i18n/it";
import { GrammarLesson } from "../lesson/GrammarLesson";
import { VocabLesson } from "../lesson/VocabLesson";

const relative = new Intl.RelativeTimeFormat("it", { numeric: "auto" });

function when(due: Date, now: Date): string {
  const minutes = Math.round((due.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return it.vocab.dueNow;
  if (minutes < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

export function ItemScreen() {
  const { itemId = "" } = useParams();
  const content = findItem(itemId);
  const records = useLiveQuery(() => db.cards.where("itemId").equals(itemId).toArray(), [itemId]);
  const [message, setMessage] = useState("");

  if (!content) {
    return (
      <section className="screen">
        <h1>{it.notFound.title}</h1>
        <Link to="/vocabolario">{it.vocab.back}</Link>
      </section>
    );
  }
  if (!records) return null;

  const now = new Date();
  const byId = new Map(records.map((r) => [r.id, r]));
  const stage = itemStage(records);
  const batch = allBatches.find((b) => b.items.some((i) => i.item.id === itemId));
  const retired = records.filter((r) => r.retired);

  async function reset() {
    if (!window.confirm(it.vocab.resetConfirm)) return;
    await resetItem(itemId);
    setMessage(it.vocab.resetDone);
  }

  async function bringBack() {
    for (const r of retired) await resurrectCard(r.id);
    setMessage(it.vocab.bringBackDone);
  }

  return (
    <section className="screen">
      <Link to="/vocabolario" className="back-link">
        ← {it.vocab.back}
      </Link>

      {content.kind === "vocab" ? <VocabLesson item={content.item} /> : <GrammarLesson item={content.item} />}

      <h2>{it.vocab.cardsTitle}</h2>
      {!stage ? (
        <p className="muted">
          {batch ? it.vocab.notYet(batch.unit.order, batch.index + 1) : it.vocab.unstudied}
        </p>
      ) : (
        <>
          <ul className="item-list">
            {cardsFor(content).map((card, i) => {
              const record = byId.get(card.id);
              if (!record) return null;
              return (
                <li key={card.id} className="card card-row">
                  <span>
                    <strong>
                      {card.kind === "cloze" ? it.vocab.cardKind.cloze(i + 1) : it.vocab.cardKind[card.kind]}
                    </strong>
                    <span className="muted small">
                      {record.retired ? it.vocab.retired : `${it.vocab.due} ${when(record.due, now)}`}
                    </span>
                  </span>
                  <StageBadge stage={cardStage(record)} />
                </li>
              );
            })}
          </ul>
          <div className="stack">
            {retired.length > 0 && (
              <button type="button" className="button wide" onClick={bringBack}>
                {it.vocab.bringBack}
              </button>
            )}
            <button type="button" className="button secondary wide" onClick={reset}>
              {it.vocab.reset}
            </button>
          </div>
          {message && <p className="note" role="status">{message}</p>}
        </>
      )}
    </section>
  );
}
