import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { findBatch } from "../../content";
import { markBatchSeen, usePassedBatches } from "../../db/lessons";
import { it } from "../../i18n/it";
import { GrammarLesson } from "./GrammarLesson";
import { VocabLesson } from "./VocabLesson";

export function LessonScreen() {
  const { batchId = "" } = useParams();
  const batch = findBatch(batchId);
  const passed = usePassedBatches();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (batch) markBatchSeen(batch.id);
  }, [batch]);

  useEffect(() => {
    document.querySelector(".content")?.scrollTo(0, 0);
  }, [page]);

  if (!batch) {
    return (
      <section className="screen">
        <h1>{it.notFound.title}</h1>
        <Link to="/">{it.notFound.back}</Link>
      </section>
    );
  }

  const content = batch.items[page];
  const isLast = page === batch.items.length - 1;
  const alreadyPassed = passed?.has(batch.id);

  return (
    <section className="screen lesson">
      <header className="focus-header">
        <Link to={`/percorso/${batch.unit.id}`} className="back-link">
          ✕ {it.lesson.close}
        </Link>
        <span className="muted">{it.lesson.progress(page + 1, batch.items.length)}</span>
      </header>
      <div className="dots" aria-hidden="true">
        {batch.items.map((c, i) => (
          <span key={c.item.id} className={i <= page ? "dot dot-on" : "dot"} />
        ))}
      </div>

      {content.kind === "vocab" ? (
        <VocabLesson item={content.item} />
      ) : (
        <GrammarLesson item={content.item} />
      )}

      <div className="lesson-nav">
        <button type="button" className="button secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
          {it.lesson.previous}
        </button>
        {!isLast ? (
          <button type="button" className="button" onClick={() => setPage(page + 1)}>
            {it.lesson.next}
          </button>
        ) : alreadyPassed ? (
          <Link to={`/percorso/${batch.unit.id}`} className="button">
            {it.lesson.close}
          </Link>
        ) : (
          <button type="button" className="button" onClick={() => navigate(`/quiz/${batch.id}`)}>
            {it.lesson.toQuiz}
          </button>
        )}
      </div>
      {isLast && alreadyPassed && <p className="muted center">{it.lesson.reviewOnly}</p>}
    </section>
  );
}
