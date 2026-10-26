import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { StageBadge } from "../../components/Stage";
import { findItem } from "../../content";
import { loadDueCards, overrideReview, recordReview, type ReviewOutcome } from "../../db/reviews";
import { cardsFor, type CardRef } from "../../domain/cards";
import type { QuizState } from "../../domain/quiz";
import { stageRank } from "../../domain/stages";
import { it } from "../../i18n/it";
import { CardSession } from "../session/CardSession";

// Reviews of everything due now. The first answer to each card is rated
// and saved immediately; retries after a miss are practice only.
export function ReviewScreen() {
  const [cards, setCards] = useState<CardRef[]>();
  const [outcomes, setOutcomes] = useState<Record<string, ReviewOutcome>>({});
  const saved = useRef<Record<string, ReviewOutcome>>({});
  // Saves run one after another, so an override never overtakes the
  // review it corrects.
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    loadDueCards().then((due) => {
      const refs = due.flatMap((record) => {
        const content = findItem(record.itemId);
        // Content removed since she learned it: skip the card.
        return content ? cardsFor(content).filter((c) => c.id === record.id) : [];
      });
      setCards(refs);
    });
  }, []);

  if (!cards) return <p className="screen muted">{it.review.loading}</p>;
  if (cards.length === 0) {
    return (
      <section className="screen quiz-done">
        <p className="big-emoji" aria-hidden="true">🪺</p>
        <p>{it.review.none}</p>
        <Link to="/" className="button secondary wide">
          {it.quiz.backHome}
        </Link>
      </section>
    );
  }

  function save(card: CardRef, run: (previous?: ReviewOutcome) => Promise<ReviewOutcome | undefined>) {
    queue.current = queue.current
      .then(async () => {
        const outcome = await run(saved.current[card.id]);
        if (!outcome) return;
        saved.current = { ...saved.current, [card.id]: outcome };
        setOutcomes(saved.current);
      })
      .catch((e) => console.error("Saving the review failed", e));
  }

  return (
    <CardSession
      cards={cards}
      closeTo="/"
      onAnswer={(card, answer, result, isFirst) => {
        if (isFirst) save(card, () => recordReview(card.id, answer, result));
      }}
      onOverride={(card, isFirst) => {
        if (!isFirst) return;
        save(card, async (previous) => (previous ? overrideReview(card.id, previous) : undefined));
      }}
      extraFeedback={(card) => {
        const o = outcomes[card.id];
        if (!o) return null;
        return (
          <span className="stage-change">
            {o.stageBefore !== o.stageAfter && (
              <>
                <StageBadge stage={o.stageBefore} /> →{" "}
              </>
            )}
            <StageBadge stage={o.stageAfter} />
          </span>
        );
      }}
      renderDone={(state) => <ReviewDone state={state} outcomes={outcomes} />}
    />
  );
}

function ReviewDone({ state, outcomes }: { state: QuizState; outcomes: Record<string, ReviewOutcome> }) {
  const attempts = Object.values(state.firstAttempts);
  const right = attempts.filter((a) => a.overridden || a.result.outcome !== "wrong").length;
  // Several cards of one item can each report the same promotion.
  const promotedItems = new Set(
    Object.entries(outcomes)
      .filter(([, o]) => stageRank(o.stageAfter) > stageRank(o.stageBefore))
      .map(([cardId]) => cardId.split(":")[0]),
  );

  return (
    <section className="screen quiz-done">
      <p className="big-emoji" aria-hidden="true">🐦</p>
      <h1>{it.review.doneTitle}</h1>
      <p>{it.review.doneText(right, state.total)}</p>
      {promotedItems.size > 0 && <p>{it.review.promoted(promotedItems.size)}</p>}
      <div className="stack">
        <Link to="/" className="button wide">
          {it.quiz.backHome}
        </Link>
      </div>
    </section>
  );
}
