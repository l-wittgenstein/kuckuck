import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { allBatches, findBatch, type BatchInfo } from "../../content";
import { completeQuiz, usePassedBatches } from "../../db/lessons";
import { cardsFor, type CardRef } from "../../domain/cards";
import { nextBatch } from "../../domain/progress";
import type { FirstAttempt } from "../../domain/quiz";
import { it } from "../../i18n/it";
import { CardSession } from "../session/CardSession";

export function QuizScreen() {
  const { batchId = "" } = useParams();
  const batch = findBatch(batchId);
  const cards = useMemo(() => batch?.items.flatMap(cardsFor) ?? [], [batch]);
  if (!batch) {
    return (
      <section className="screen">
        <h1>{it.notFound.title}</h1>
        <Link to="/">{it.notFound.back}</Link>
      </section>
    );
  }
  return (
    <CardSession
      key={batch.id}
      cards={cards}
      closeTo={`/percorso/${batch.unit.id}`}
      renderDone={(state) => <QuizDone batch={batch} cards={cards} firstAttempts={state.firstAttempts} />}
    />
  );
}

function QuizDone({
  batch,
  cards,
  firstAttempts,
}: {
  batch: BatchInfo;
  cards: CardRef[];
  firstAttempts: Record<string, FirstAttempt>;
}) {
  const [saved, setSaved] = useState(false);
  const passed = usePassedBatches();

  useEffect(() => {
    completeQuiz(batch.id, batch.unit.id, cards, firstAttempts).then(() => setSaved(true));
  }, [batch, cards, firstAttempts]);

  const right = Object.values(firstAttempts).filter(
    (a) => a.overridden || a.result.outcome !== "wrong",
  ).length;
  const next = saved && passed ? nextBatch(allBatches, passed) : undefined;

  return (
    <section className="screen quiz-done">
      <p className="big-emoji" aria-hidden="true">🐣</p>
      <h1>{it.quiz.doneTitle}</h1>
      <p>{it.quiz.doneText(batch.items.length)}</p>
      <p className="muted">{it.quiz.firstTry(right, cards.length)}</p>
      {!saved ? (
        <p className="muted">{it.quiz.saving}</p>
      ) : (
        <div className="stack">
          {next && (
            <Link to={`/lezione/${next.id}`} className="button wide">
              {it.quiz.nextLesson}
            </Link>
          )}
          <Link to="/" className="button secondary wide">
            {it.quiz.backHome}
          </Link>
        </div>
      )}
    </section>
  );
}
