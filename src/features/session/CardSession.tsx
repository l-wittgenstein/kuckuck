// One question at a time: prompt, typed answer, feedback. Used by the
// post-lesson quiz and by review sessions, which differ only in what
// they do with each answer and how they end.
import { useReducer, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { checkCloze, checkGerman, checkMeaning, type CheckResult } from "../../checker/check";
import { FlagButton } from "../../components/FlagButton";
import { GermanWord, germanLabel } from "../../components/German";
import { levels } from "../../content";
import type { CardRef } from "../../domain/cards";
import { cardsCleared, isFinished, quizReducer, startQuiz, type QuizState } from "../../domain/quiz";
import { it } from "../../i18n/it";

// Every answer in the course: a typo that lands on another real word
// (nein for neun) is a different word, not a typo.
const allVocab = levels.flatMap((l) => l.unitContents).flatMap((u) => u.vocab);
const knownGerman = allVocab.flatMap((v) => [v.de, ...(v.acceptDe ?? [])]);
const knownItalian = allVocab.flatMap((v) => v.it);

function check(card: CardRef, answer: string): CheckResult {
  switch (card.kind) {
    case "recognition":
      return checkMeaning(answer, card.item, { knownAnswers: knownItalian });
    case "production":
      return checkGerman(answer, card.item, { knownAnswers: knownGerman });
    case "cloze":
      return checkCloze(answer, card.exercise);
  }
}

export interface CardSessionProps {
  cards: CardRef[];
  closeTo: string;
  // Called for every submitted answer; isFirst is false on retries.
  onAnswer?: (card: CardRef, answer: string, result: CheckResult, isFirst: boolean) => void;
  onOverride?: (card: CardRef, isFirst: boolean) => void;
  extraFeedback?: (card: CardRef) => ReactNode;
  renderDone: (state: QuizState) => ReactNode;
}

export function CardSession({ cards, closeTo, onAnswer, onOverride, extraFeedback, renderDone }: CardSessionProps) {
  const [state, dispatch] = useReducer(quizReducer, cards, (c) => startQuiz(c));
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (isFinished(state)) return <>{renderDone(state)}</>;

  const card = state.queue[0];
  const feedback = state.feedback;
  const german = card.kind !== "recognition";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (feedback) {
      dispatch({ type: "continue" });
      setAnswer("");
    } else if (answer.trim()) {
      const result = check(card, answer);
      onAnswer?.(card, answer, result, !(card.id in state.firstAttempts));
      dispatch({ type: "answer", answer, result });
    }
    inputRef.current?.focus();
  }

  return (
    <section className="screen quiz">
      <header className="focus-header">
        <Link to={closeTo} className="back-link">
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
              onOverride?.(card, feedback.isFirst);
              dispatch({ type: "override" });
              inputRef.current?.focus();
            }}
            extra={extraFeedback?.(card)}
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
  extra?: ReactNode;
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

      {props.extra}
      {outcome === "wrong" && !props.overridden && <span className="muted">{it.quiz.retryLater}</span>}
      <span className="feedback-actions">
        {props.canOverride && (
          <button type="button" className="link-button" onClick={props.onOverride}>
            {it.quiz.override}
          </button>
        )}
        <FlagButton itemId={card.itemId} />
      </span>
    </div>
  );
}
