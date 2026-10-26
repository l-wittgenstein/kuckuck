import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { checkCloze, checkGerman, checkMeaning } from "../../checker/check";
import { GermanWord, germanLabel } from "../../components/German";
import { allBatches, findBatch, levels, type BatchInfo } from "../../content";
import { completeQuiz, usePassedBatches } from "../../db/lessons";
import { cardsFor, type CardRef } from "../../domain/cards";
import { nextBatch } from "../../domain/progress";
import { cardsCleared, isFinished, quizReducer, startQuiz } from "../../domain/quiz";
import { it } from "../../i18n/it";

export function QuizScreen() {
  const { batchId = "" } = useParams();
  const batch = findBatch(batchId);
  if (!batch) {
    return (
      <section className="screen">
        <h1>{it.notFound.title}</h1>
        <Link to="/">{it.notFound.back}</Link>
      </section>
    );
  }
  return <Quiz key={batch.id} batch={batch} />;
}

// Every answer in the course: a typo that lands on another real word
// (nein for neun) is a different word, not a typo.
const allVocab = levels.flatMap((l) => l.unitContents).flatMap((u) => u.vocab);
const knownGerman = allVocab.flatMap((v) => [v.de, ...(v.acceptDe ?? [])]);
const knownItalian = allVocab.flatMap((v) => v.it);

function check(card: CardRef, answer: string) {
  switch (card.kind) {
    case "recognition":
      return checkMeaning(answer, card.item, { knownAnswers: knownItalian });
    case "production":
      return checkGerman(answer, card.item, { knownAnswers: knownGerman });
    case "cloze":
      return checkCloze(answer, card.exercise);
  }
}

function Quiz({ batch }: { batch: BatchInfo }) {
  const cards = useMemo(() => batch.items.flatMap(cardsFor), [batch]);
  const [state, dispatch] = useReducer(quizReducer, cards, (c) => startQuiz(c));
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = isFinished(state);

  useEffect(() => {
    if (!finished || saved) return;
    completeQuiz(batch.id, batch.unit.id, cards, state.firstAttempts).then(() => setSaved(true));
  }, [finished, saved, batch, cards, state.firstAttempts]);

  if (finished) {
    return <QuizDone batch={batch} saved={saved} firstAttempts={state.firstAttempts} total={cards.length} />;
  }

  const card = state.queue[0];
  const feedback = state.feedback;
  const german = card.kind !== "recognition";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (feedback) {
      dispatch({ type: "continue" });
      setAnswer("");
    } else if (answer.trim()) {
      dispatch({ type: "answer", answer, result: check(card, answer) });
    }
    inputRef.current?.focus();
  }

  return (
    <section className="screen quiz">
      <header className="focus-header">
        <Link to={`/percorso/${batch.unit.id}`} className="back-link">
          ✕ {it.quiz.quit}
        </Link>
        <span className="muted">{it.quiz.progress(cardsCleared(state), state.total)}</span>
      </header>
      <div className="progress-bar" aria-hidden="true">
        <span style={{ width: `${(100 * cardsCleared(state)) / state.total}%` }} />
      </div>

      <Prompt card={card} />

      <form onSubmit={submit} className="answer-form">
        <input
          ref={inputRef}
          className={`answer-input ${feedback ? `answer-${feedback.overridden ? "correct" : feedback.result.outcome}` : ""}`}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          readOnly={!!feedback}
          lang={german ? "de" : "it"}
          placeholder={german ? it.quiz.placeholderDe : it.quiz.placeholderIt}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint={feedback ? "next" : "done"}
          autoFocus
        />
        {feedback && (
          <Feedback
            card={card}
            answer={feedback.answer}
            outcome={feedback.overridden ? "correct" : feedback.result.outcome}
            notes={feedback.overridden ? [] : feedback.result.notes}
            expected={feedback.result.expected}
            canOverride={feedback.result.outcome === "wrong" && !feedback.overridden}
            overridden={feedback.overridden}
            onOverride={() => {
              dispatch({ type: "override" });
              inputRef.current?.focus();
            }}
          />
        )}
        <button type="submit" className="button wide" disabled={!feedback && !answer.trim()}>
          {feedback ? it.quiz.next : it.quiz.check}
        </button>
      </form>
    </section>
  );
}

function Prompt({ card }: { card: CardRef }) {
  if (card.kind === "cloze") {
    const [before, after] = card.exercise.sentence.split("___");
    return (
      <div className="prompt">
        <span className="prompt-label">{it.quiz.cloze}</span>
        <p className="prompt-main prompt-sentence" lang="de">
          {before}
          <span className="gap">{"\u2003\u2003\u2003"}</span>
          {after}
        </p>
        {card.exercise.hintIt && <p className="hint">({card.exercise.hintIt})</p>}
        <p className="muted">{card.exercise.translationIt}</p>
      </div>
    );
  }
  if (card.kind === "recognition") {
    return (
      <div className="prompt">
        <span className="prompt-label">{it.quiz.recognition}</span>
        <p className="prompt-main">
          <GermanWord item={card.item} />
        </p>
      </div>
    );
  }
  return (
    <div className="prompt">
      <span className="prompt-label">
        {card.item.pos === "noun" ? it.quiz.productionNoun : it.quiz.production}
      </span>
      <p className="prompt-main">{card.item.promptIt}</p>
    </div>
  );
}

function Feedback(props: {
  card: CardRef;
  answer: string;
  outcome: "correct" | "almost" | "wrong";
  notes: (keyof typeof it.quiz.notes)[];
  expected: string;
  canOverride: boolean;
  overridden: boolean;
  onOverride: () => void;
}) {
  const { card, outcome } = props;
  const title = { correct: it.quiz.correct, almost: it.quiz.almost, wrong: it.quiz.wrong }[outcome];
  return (
    <div className={`feedback feedback-${outcome}`} role="status">
      <strong>{title}</strong>
      {props.notes.map((n) => (
        <span key={n}>{it.quiz.notes[n]}</span>
      ))}
      {outcome !== "correct" && (
        <span>
          {it.quiz.answerWas} <b lang={card.kind === "recognition" ? "it" : "de"}>{props.expected}</b>
        </span>
      )}
      {props.overridden && <span>{it.quiz.overridden}</span>}

      {card.kind === "cloze" ? (
        <>
          <span lang="de" className="example-de">
            {card.exercise.sentence.replace("___", card.exercise.answers[0])}
          </span>
          <span className="muted">{card.exercise.explanationIt}</span>
        </>
      ) : (
        <span>
          <b lang="de">{germanLabel(card.item)}</b> · {card.item.it.join(", ")}
        </span>
      )}

      {outcome === "wrong" && !props.overridden && <span className="muted">{it.quiz.retryLater}</span>}
      {props.canOverride && (
        <button type="button" className="link-button" onClick={props.onOverride}>
          {it.quiz.override}
        </button>
      )}
    </div>
  );
}

function QuizDone({
  batch,
  saved,
  firstAttempts,
  total,
}: {
  batch: BatchInfo;
  saved: boolean;
  firstAttempts: Record<string, { result: { outcome: string }; overridden: boolean }>;
  total: number;
}) {
  const passed = usePassedBatches();
  const right = Object.values(firstAttempts).filter(
    (a) => a.overridden || a.result.outcome !== "wrong",
  ).length;
  const next = passed && nextBatch(allBatches, passed);

  return (
    <section className="screen quiz-done">
      <p className="big-emoji" aria-hidden="true">🐣</p>
      <h1>{it.quiz.doneTitle}</h1>
      <p>{it.quiz.doneText(batch.items.length)}</p>
      <p className="muted">{it.quiz.firstTry(right, total)}</p>
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
