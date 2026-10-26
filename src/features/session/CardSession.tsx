// One question at a time: prompt, typed answer, feedback. Used by the
// post-lesson quiz and by review sessions, which differ only in what
// they do with each answer and how they end.
import { useReducer, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { checkCloze, checkGerman, checkMeaning, type CheckResult, type Note } from "../../checker/check";
import { speak } from "../../audio/tts";
import { FlagButton } from "../../components/FlagButton";
import { PlayButton } from "../../components/PlayButton";
import { useSettings } from "../../db/settings";
import { GermanWord, germanLabel } from "../../components/German";
import { levels } from "../../content";
import { gapStartsSentence, type CardRef } from "../../domain/cards";
import { cardsCleared, isFinished, quizReducer, startQuiz, type QuizState } from "../../domain/quiz";
import { it } from "../../i18n/it";

// Every answer in the course: a typo that lands on another real word
// (nein for neun) is a different word, not a typo.
const allVocab = levels.flatMap((l) => l.unitContents).flatMap((u) => u.vocab);
const knownGerman = allVocab.flatMap((v) => [v.de, ...(v.acceptDe ?? [])]);
const knownItalian = allVocab.flatMap((v) => v.it);

// The German worth hearing once a card is answered.
function germanOf(card: CardRef): string {
  return card.kind === "cloze"
    ? card.exercise.sentence.replace("___", card.exercise.answers[0])
    : germanLabel(card.item);
}

function noteText(card: CardRef, note: Note): string {
  if (note === "capitalization" && card.kind === "cloze" && gapStartsSentence(card.exercise.sentence)) {
    return it.quiz.notes.capitalizationSentenceStart;
  }
  return it.quiz.notes[note];
}

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
  // Where the top-left link leaves to, or a button that replaces it.
  closeTo?: string;
  close?: { label: string; onClick: () => void };
  // Ask the cards in the given order instead of shuffling them.
  ordered?: boolean;
  // Called for every submitted answer; isFirst is false on retries.
  onAnswer?: (card: CardRef, answer: string, result: CheckResult, isFirst: boolean) => void;
  // overridden=false when she taps "Annulla".
  onOverride?: (card: CardRef, isFirst: boolean, overridden: boolean) => void;
  extraFeedback?: (card: CardRef) => ReactNode;
  renderDone: (state: QuizState) => ReactNode;
}

export function CardSession({
  cards,
  closeTo = "/",
  close,
  ordered,
  onAnswer,
  onOverride,
  extraFeedback,
  renderDone,
}: CardSessionProps) {
  const [state, dispatch] = useReducer(quizReducer, cards, (c) => startQuiz(c, Math.random, ordered));
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const settings = useSettings();

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
      if (settings?.autoplay) speak(germanOf(card), { repeatSlower: false });
    }
    inputRef.current?.focus();
  }

  return (
    <section className="screen quiz">
      <header className="focus-header">
        {close ? (
          <button type="button" className="back-link link-button" onClick={close.onClick}>
            ← {close.label}
          </button>
        ) : (
          <Link to={closeTo} className="back-link">
            ✕ {it.quiz.quit}
          </Link>
        )}
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
            canOverride={feedback.result.outcome === "wrong"}
            overridden={feedback.overridden}
            onOverride={() => {
              const overridden = !feedback.overridden;
              onOverride?.(card, feedback.isFirst, overridden);
              dispatch({ type: overridden ? "override" : "undoOverride" });
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
        <h1 className="prompt-main prompt-sentence" lang="de">
          {before}
          <span className="gap">{"\u2003\u2003\u2003"}</span>
          {after}
        </h1>
        {card.exercise.hintIt && <p className="hint">({card.exercise.hintIt})</p>}
        <p className="muted">{card.exercise.translationIt}</p>
      </div>
    );
  }
  if (card.kind === "recognition") {
    return (
      <div className="prompt">
        <span className="prompt-label">{it.quiz.recognition}</span>
        <h1 className="prompt-main with-audio">
          <GermanWord item={card.item} />
          <PlayButton text={germanLabel(card.item)} size="large" />
        </h1>
      </div>
    );
  }
  return (
    <div className="prompt">
      <span className="prompt-label">
        {card.item.pos === "noun" ? it.quiz.productionNoun : it.quiz.production}
      </span>
      <h1 className="prompt-main">{card.item.promptIt}</h1>
    </div>
  );
}

function Feedback(props: {
  card: CardRef;
  answer: string;
  outcome: "correct" | "almost" | "wrong";
  notes: Note[];
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
        <span key={n}>{noteText(card, n)}</span>
      ))}
      {outcome !== "correct" && (
        <span>
          {it.quiz.answerWas} <b lang={card.kind === "recognition" ? "it" : "de"}>{props.expected}</b>
        </span>
      )}

      {card.kind === "cloze" ? (
        <>
          <span lang="de" className="example-de with-audio">
            {germanOf(card)}
            <PlayButton text={germanOf(card)} />
          </span>
          <span className="muted">{card.exercise.explanationIt}</span>
        </>
      ) : (
        <span className="with-audio">
          <span>
            <b lang="de">{germanLabel(card.item)}</b> · {card.item.it.join(", ")}
          </span>
          <PlayButton text={germanOf(card)} />
        </span>
      )}

      {props.extra}
      {outcome === "wrong" && !props.overridden && <span className="muted">{it.quiz.retryLater}</span>}
      <span className="feedback-actions">
        {props.canOverride && (
          <span>
            {props.overridden && <span className="muted">{it.quiz.overridden} · </span>}
            <button type="button" className="link-button" onClick={props.onOverride}>
              {props.overridden ? it.quiz.undoOverride : it.quiz.override}
            </button>
          </span>
        )}
        <FlagButton itemId={card.itemId} />
      </span>
    </div>
  );
}
