import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { germanLabel } from "../../components/German";
import { StageBadge } from "../../components/Stage";
import { findItem } from "../../content";
import { loadDueCards, overrideReview, recordReview, type ReviewOutcome } from "../../db/reviews";
import { cardsFor, type CardRef } from "../../domain/cards";
import { drillQueue, sessionResults, type ItemResult } from "../../domain/results";
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
      onOverride={(card, isFirst, overridden) => {
        if (!isFirst) return;
        save(card, async (previous) =>
          previous ? overrideReview(card.id, previous, overridden) : undefined,
        );
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
      renderDone={(state) => <ReviewDone cards={cards} state={state} outcomes={outcomes} />}
    />
  );
}

function ReviewDone({
  cards,
  state,
  outcomes,
}: {
  cards: CardRef[];
  state: QuizState;
  outcomes: Record<string, ReviewOutcome>;
}) {
  const [drilling, setDrilling] = useState(false);
  const [drills, setDrills] = useState(0);
  const results = sessionResults(cards, state.firstAttempts);
  const missed = results.wrong.flatMap((r) => r.missed);
  // Several cards of one item can each report the same promotion.
  const promotedItems = new Set(
    Object.entries(outcomes)
      .filter(([, o]) => stageRank(o.stageAfter) > stageRank(o.stageBefore))
      .map(([cardId]) => cardId.split(":")[0]),
  );
  const pct = Math.round((100 * results.rightCards) / Math.max(1, results.answeredCards));

  if (drilling) {
    const back = () => setDrilling(false);
    return (
      <CardSession
        key={drills}
        cards={drillQueue(missed)}
        ordered
        close={{ label: it.review.toResults, onClick: back }}
        renderDone={() => <BackWhenDone onDone={back} />}
      />
    );
  }

  return (
    <section className="screen quiz-done">
      <p className="big-emoji" aria-hidden="true">🐦</p>
      <h1>{it.review.doneTitle}</h1>
      <div className="results">
        <p>{it.review.doneText(results.rightCards, results.answeredCards)}</p>
        <div
          className="accuracy"
          role="img"
          aria-label={it.review.accuracy(pct)}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        {promotedItems.size > 0 && <p>{it.review.promoted(promotedItems.size)}</p>}
        {drills > 0 && <p className="muted">{it.review.drillDone}</p>}

        {results.wrong.length > 0 && (
          <>
            <h2>
              {it.review.wrongItems(results.wrong.length)}
              <button
                type="button"
                className="button small"
                onClick={() => {
                  setDrills((n) => n + 1);
                  setDrilling(true);
                }}
              >
                ↻ {it.review.drill}
              </button>
            </h2>
            <p className="muted">{it.review.drillHint}</p>
            <ResultChips results={results.wrong} wrong />
          </>
        )}
        {results.right.length > 0 && (
          <>
            <h2>{it.review.rightItems(results.right.length)}</h2>
            <ResultChips results={results.right} />
          </>
        )}
      </div>
      <div className="stack">
        <Link to="/" className="button wide">
          {it.quiz.backHome}
        </Link>
      </div>
    </section>
  );
}

function ResultChips({ results, wrong }: { results: ItemResult[]; wrong?: boolean }) {
  return (
    <ul className="result-chips">
      {results.map(({ itemId, item }) => (
        <li key={itemId} className={`result-chip ${wrong ? "is-wrong" : ""}`}>
          {"exercises" in item ? (
            <>
              <span className="de">{item.title}</span>
              <span className="it">{it.lesson.grammarTag}</span>
            </>
          ) : (
            <>
              <span className="de" lang="de">
                {germanLabel(item)}
              </span>
              <span className="it">{item.it[0]}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

// The drill has no screen of its own at the end: back to the results.
function BackWhenDone({ onDone }: { onDone: () => void }) {
  useEffect(onDone, [onDone]);
  return null;
}
