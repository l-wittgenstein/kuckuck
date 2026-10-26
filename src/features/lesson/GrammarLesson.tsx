import type { GrammarItem } from "../../../content/schema";
import { PatternTable } from "../../components/PatternTable";
import { PlayButton } from "../../components/PlayButton";
import { FlagButton } from "../../components/FlagButton";
import { it } from "../../i18n/it";

export function GrammarLesson({ item }: { item: GrammarItem }) {
  return (
    <article className="lesson-item">
      <div className="item-top">
        <span className="tag tag-grammar">{it.lesson.grammarTag}</span>
        <FlagButton itemId={item.id} />
      </div>
      <h1>{item.title}</h1>
      {item.explanationIt.map((p) => (
        <p key={p}>{p}</p>
      ))}

      <h2>{it.lesson.pattern}</h2>
      <div className="card">
        <PatternTable lines={item.pattern} />
      </div>

      <h2>{it.lesson.examples}</h2>
      <ul className="examples">
        {item.examples.map((ex) => (
          <li key={ex.de} className="example">
            <PlayButton text={ex.de} />
            <span className="example-text">
              <span lang="de" className="example-de">{ex.de}</span>
              <span className="muted">{ex.it}</span>
            </span>
          </li>
        ))}
      </ul>

      <h2>{it.lesson.mistakes}</h2>
      <ul className="mistakes">
        {item.commonMistakes.map((m) => (
          <li key={m.wrong} className="card">
            <span lang="de" className="mistake-wrong">
              <span className="sr-only">{it.lesson.wrong}: </span>✗ {m.wrong}
            </span>
            <span lang="de" className="mistake-right with-audio">
              <span>
                <span className="sr-only">{it.lesson.right}: </span>✓ {m.right}
              </span>
              <PlayButton text={m.right} />
            </span>
            <span className="muted">{m.explanationIt}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
