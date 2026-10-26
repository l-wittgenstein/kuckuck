// Decides whether a typed answer is correct, nearly correct or wrong.
// A wrong "correct" teaches her a mistake, so every tolerance here is
// narrow and an exact match always wins over a tolerant one.
import type { Exercise, VocabItem } from "../../content/schema";
import {
  editDistance,
  foldAccents,
  matchUmlauts,
  normalizeText,
  removeApostrophes,
  removeParentheticals,
  startsLowercase,
  startsUppercase,
  stripPunctuation,
  transliterateUmlauts,
  typoTolerance,
} from "./normalize";

export type Outcome = "correct" | "almost" | "wrong";
export type Note =
  | "typo"
  | "capitalization"
  | "umlaut"
  | "accent"
  | "missing-article"
  | "wrong-article"
  | "case";

export interface CheckResult {
  outcome: Outcome;
  notes: Note[];
  expected: string; // canonical answer to display
  // The accepted form the answer was matched against, when it isn't
  // `expected` (e.g. "Tschüs", or "figlio" for an item shown as "bambino").
  matched?: string;
}

export interface CheckOptions {
  // Every answer that is right for SOME item in the course (all `de`, or
  // all `it` meanings). An answer equal to one of them that isn't accepted
  // for this item is a different word, not a typo: "nein" for "neun".
  knownAnswers?: readonly string[];
}

interface Graded {
  outcome: Outcome;
  notes: Note[];
  rank: number; // lower is better; correct < 10 ≤ almost < 50 ≤ wrong
  form: string;
}

const ARTICLES = new Set(["der", "die", "das"]);

function best(candidates: (Graded | null)[]): Graded | null {
  let top: Graded | null = null;
  for (const c of candidates) if (c && (!top || c.rank < top.rank)) top = c;
  return top;
}

function result(outcome: Outcome, notes: Note[], expected: string, matched?: string): CheckResult {
  const r: CheckResult = { outcome, notes, expected };
  if (matched !== undefined && matched !== expected) r.matched = matched;
  return r;
}

// ---------------------------------------------------------------- Italian

const ITALIAN_ARTICLE = /^(?:(?:gli|il|lo|la|le|i|uno|una|un)\s+|(?:l|un)'\s*)(?=\S)/;

function italianKey(s: string): string {
  const text = removeParentheticals(stripPunctuation(normalizeText(s))).toLowerCase();
  return removeApostrophes(text.replace(ITALIAN_ARTICLE, "")).replace(/\s+/g, " ").trim();
}

// "figlio, bambino", "figlio / bambino", "figlio o bambino".
function answerParts(answer: string): string[] {
  const whole = normalizeText(answer);
  const parts = whole.split(/\s*[,/;]\s*|\s+(?:o|oppure)\s+/i);
  return [whole, ...parts].filter((p) => p.trim() !== "");
}

export function checkMeaning(
  answer: string,
  item: VocabItem,
  options: CheckOptions = {},
): CheckResult {
  const expected = item.it[0];
  const forms = item.it.map((raw) => ({ raw, key: italianKey(raw) })).filter((f) => f.key !== "");
  const own = new Set(forms.map((f) => f.key));
  const known = new Set((options.knownAnswers ?? []).map(italianKey));

  const graded: (Graded | null)[] = [];
  for (const part of answerParts(answer)) {
    const a = italianKey(part);
    if (a === "") continue;
    const otherWord = known.has(a) && !own.has(a);
    for (const f of forms) graded.push(gradeItalian(a, f.key, f.raw, otherWord));
  }
  const top = best(graded);
  if (!top) return result("wrong", [], expected);
  return result(top.outcome, top.notes, expected, top.form);
}

function gradeItalian(a: string, f: string, form: string, otherWord: boolean): Graded | null {
  if (a === f) return { outcome: "correct", notes: [], rank: 0, form };
  const af = foldAccents(a);
  const ff = foldAccents(f);
  if (af === ff) return { outcome: "correct", notes: ["accent"], rank: 1, form };
  if (otherWord) return null;
  const tolerance = typoTolerance(f);
  const d = editDistance(a, f);
  if (d <= tolerance) return { outcome: "almost", notes: ["typo"], rank: 10 + d, form };
  const dFolded = editDistance(af, ff);
  if (dFolded <= tolerance) {
    return { outcome: "almost", notes: ["typo", "accent"], rank: 15 + dFolded, form };
  }
  return null;
}

// ----------------------------------------------------------------- German

// Comparison key for German vocab: case kept, punctuation and apostrophes
// dropped ("Wie gehts" is a valid spelling of "Wie geht's?").
function germanKey(s: string): string {
  return removeApostrophes(stripPunctuation(normalizeText(s))).replace(/\s+/g, " ").trim();
}

function withoutArticle(key: string): string {
  const [first, ...rest] = key.split(" ");
  return rest.length > 0 && ARTICLES.has(first.toLowerCase()) ? rest.join(" ") : key;
}

// Grades `a` against one accepted form `f` (both germanKey output, no article).
function gradeGerman(a: string, f: string, isNoun: boolean, otherWord: boolean): Graded | null {
  const la = a.toLowerCase();
  const lf = f.toLowerCase();
  const notes: Note[] = [];
  if (isNoun && startsUppercase(f) && startsLowercase(a)) notes.push("capitalization");

  const m = matchUmlauts(la, lf);
  if (m) {
    if (m.translit || m.dotless) notes.push("umlaut");
    if (m.dotless) {
      // Dots change the word; if the dotless spelling is another real word
      // ("schon" for "schön") it's wrong, not a near miss.
      if (otherWord) return { outcome: "wrong", notes, rank: 60, form: f };
      return { outcome: "almost", notes, rank: 10 + notes.length, form: f };
    }
    return { outcome: "correct", notes, rank: notes.length, form: f };
  }

  if (otherWord) return null;
  const tolerance = typoTolerance(f);
  const d = editDistance(la, lf);
  const dTranslit = editDistance(la, transliterateUmlauts(lf));
  if (Math.min(d, dTranslit) > tolerance) return null;
  notes.push("typo");
  if (dTranslit < d) notes.push("umlaut");
  return { outcome: "almost", notes, rank: 20 + Math.min(d, dTranslit) + notes.length, form: f };
}

export function checkGerman(
  answer: string,
  item: VocabItem,
  options: CheckOptions = {},
): CheckResult {
  const article = item.pos === "noun" ? item.article : undefined;
  const isNoun = item.pos === "noun";
  const expected = article ? `${article} ${item.de}` : item.de;
  const display = (form: string) => (article ? `${article} ${form}` : form);

  const accepted = [item.de, ...(item.acceptDe ?? [])];
  // acceptDe entries for nouns may or may not repeat the article.
  const forms = accepted.map((raw) => ({
    raw: article ? withoutArticle(raw.trim()) : raw,
    key: article ? withoutArticle(germanKey(raw)) : germanKey(raw),
  }));
  const own = new Set(forms.map((f) => f.key.toLowerCase()));
  const known = new Set(
    (options.knownAnswers ?? []).map((k) => {
      const kk = germanKey(k);
      return (article ? withoutArticle(kk) : kk).toLowerCase();
    }),
  );

  const key = germanKey(answer);
  if (key === "") return result("wrong", [], expected);

  const grade = (a: string) => {
    const otherWord = known.has(a.toLowerCase()) && !own.has(a.toLowerCase());
    return best(
      forms.map((f) => {
        const g = gradeGerman(a, f.key, isNoun, otherWord);
        return g && { ...g, form: f.raw };
      }),
    );
  };

  if (!article) {
    const top = grade(key);
    if (!top) return result("wrong", [], expected);
    return result(top.outcome, top.notes, expected, top.form);
  }

  const [first, ...rest] = key.split(" ");
  const typedArticle =
    rest.length > 0 && ARTICLES.has(first.toLowerCase()) ? first.toLowerCase() : null;
  if (typedArticle) {
    const top = grade(rest.join(" "));
    if (!top) return result("wrong", [], expected);
    if (typedArticle !== article) {
      return result("wrong", ["wrong-article", ...top.notes], expected, display(top.form));
    }
    return result(top.outcome, top.notes, expected, display(top.form));
  }

  // No der/die/das: the whole answer, or the answer after "ein"/"eine"/...,
  // may still be the right noun.
  const top = best([grade(key), rest.length > 0 ? grade(rest.join(" ")) : null]);
  if (!top) return result("wrong", [], expected);
  return result("wrong", ["missing-article", ...top.notes], expected, display(top.form));
}

// ------------------------------------------------------------------ Cloze

// Grammar gaps: no typo tolerance, because a one-letter difference
// ("wohne"/"wohnt") is usually the very mistake being tested.
export function checkCloze(answer: string, exercise: Exercise): CheckResult {
  const expected = exercise.answers[0];
  const a = stripPunctuation(normalizeText(answer));
  if (a === "") return result("wrong", [], expected);

  const graded = exercise.answers.map((raw): Graded | null => {
    const f = stripPunctuation(normalizeText(raw));
    if (a === f) return { outcome: "correct", notes: [], rank: 0, form: raw };
    const m = matchUmlauts(a.toLowerCase(), f.toLowerCase());
    if (!m) return null;
    const caseDiffers = matchUmlauts(a, f) === null;
    const notes: Note[] = [];
    if (exercise.caseSensitive && caseDiffers) notes.push("case");
    else if (caseDiffers && startsUppercase(f) && startsLowercase(a)) notes.push("capitalization");
    if (m.translit || m.dotless) notes.push("umlaut");
    // Missing dots are wrong here: "Bruder" for "Brüder" is the plural error.
    if (m.dotless) return { outcome: "wrong", notes, rank: 60, form: raw };
    if (exercise.caseSensitive && caseDiffers) {
      return { outcome: "wrong", notes, rank: 55, form: raw };
    }
    return { outcome: "correct", notes, rank: notes.length, form: raw };
  });

  const top = best(graded);
  if (!top) return result("wrong", [], expected);
  return result(top.outcome, top.notes, expected, top.form);
}
