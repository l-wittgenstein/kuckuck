import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Exercise, GrammarItem, VocabItem } from "../../content/schema";
import { checkCloze, checkGerman, checkMeaning, gapStartsSentence, type CheckResult } from "./check";

function load<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(`../../content/${path}`, import.meta.url), "utf8")) as T;
}

const vocab = [...load<VocabItem[]>("a1/u01/vocab.json"), ...load<VocabItem[]>("a1/u02/vocab.json")];
const grammar = [
  ...load<GrammarItem[]>("a1/u01/grammar.json"),
  ...load<GrammarItem[]>("a1/u02/grammar.json"),
  ...load<GrammarItem[]>("a1/u04/grammar.json"),
];

function word(de: string): VocabItem {
  const item = vocab.find((v) => v.de === de);
  if (!item) throw new Error(`No vocab item ${de}`);
  return item;
}

function exercise(id: string): Exercise {
  for (const g of grammar) {
    const e = g.exercises.find((x) => x.id === id);
    if (e) return e;
  }
  throw new Error(`No exercise ${id}`);
}

function item(fields: Partial<VocabItem> & Pick<VocabItem, "pos" | "de" | "it">): VocabItem {
  return { id: "v-a1-9999", promptIt: "x", examples: [], ...fields };
}

function cloze(answers: string[], caseSensitive?: boolean): Exercise {
  return {
    id: "g-a1-9999-e1",
    sentence: "___ x.",
    answers,
    caseSensitive,
    translationIt: "x",
    explanationIt: "x",
  };
}

const correct = (expected: string, notes: CheckResult["notes"] = []) =>
  expect.objectContaining({ outcome: "correct", notes, expected });
const almost = (expected: string, notes: CheckResult["notes"]) =>
  expect.objectContaining({ outcome: "almost", notes, expected });
const wrong = (expected: string, notes: CheckResult["notes"] = []) =>
  expect.objectContaining({ outcome: "wrong", notes, expected });

describe("checkMeaning (German → Italian)", () => {
  it("accepts the first and any other listed meaning", () => {
    expect(checkMeaning("casa", word("Haus"))).toEqual(correct("casa"));
    expect(checkMeaning("macchina", word("Auto"))).toEqual(correct("auto"));
    expect(checkMeaning("macchina", word("Auto")).matched).toBe("macchina");
    expect(checkMeaning("casa", word("Haus")).matched).toBeUndefined();
  });

  it("is case-insensitive and ignores extra spaces and punctuation", () => {
    expect(checkMeaning("  Casa ", word("Haus"))).toEqual(correct("casa"));
    expect(checkMeaning("che  cosa", word("was"))).toEqual(correct("che cosa"));
    expect(checkMeaning("Come va", word("Wie geht's?"))).toEqual(correct("come va?"));
    expect(checkMeaning("come stai?!", word("Wie geht's?"))).toEqual(correct("come va?"));
    expect(checkMeaning("Arrivederci.", word("Auf Wiedersehen"))).toEqual(correct("arrivederci"));
  });

  it("ignores a leading Italian article", () => {
    expect(checkMeaning("la casa", word("Haus"))).toEqual(correct("casa"));
    expect(checkMeaning("l'auto", word("Auto"))).toEqual(correct("auto"));
    expect(checkMeaning("l’auto", word("Auto"))).toEqual(correct("auto"));
    expect(checkMeaning("il cane", word("Hund"))).toEqual(correct("cane"));
    expect(checkMeaning("lo zero", item({ pos: "num", de: "null", it: ["zero"] }))).toEqual(correct("zero"));
    expect(checkMeaning("gli uomini", word("Mann")).outcome).toBe("wrong");
    expect(checkMeaning("un'automobile", word("Auto"))).toEqual(correct("auto"));
    expect(checkMeaning("la sorella", word("Schwester"))).toEqual(correct("sorella"));
  });

  it("does not strip an article that is the whole answer", () => {
    expect(checkMeaning("uno", word("eins"))).toEqual(correct("uno"));
    expect(checkMeaning("un uno", word("eins"))).toEqual(correct("uno"));
  });

  it("ignores parenthetical text in expected meanings", () => {
    const vb = item({ pos: "verb", de: "heißen", it: ["chiamarsi (di nome)"] });
    expect(checkMeaning("chiamarsi", vb)).toEqual(correct("chiamarsi (di nome)"));
  });

  it("accepts several meanings if one of them matches", () => {
    expect(checkMeaning("figlio, bambino", word("Kind")).outcome).toBe("correct");
    expect(checkMeaning("figlio/bambino", word("Kind")).outcome).toBe("correct");
    expect(checkMeaning("tavolo o figlio", word("Kind")).outcome).toBe("correct");
    expect(checkMeaning("tavolo, sedia", word("Kind")).outcome).toBe("wrong");
  });

  it("accepts missing or wrong Italian accents without a note", () => {
    expect(checkMeaning("si", word("ja"))).toEqual(correct("sì"));
    expect(checkMeaning("sí", word("ja"))).toEqual(correct("sì"));
    expect(checkMeaning("si'", word("ja"))).toEqual(correct("sì"));
    const warum = item({ pos: "adv", de: "warum", it: ["perché"] });
    expect(checkMeaning("perche", warum)).toEqual(correct("perché"));
    expect(checkMeaning("perchè", warum)).toEqual(correct("perché"));
    const ist = item({ pos: "verb", de: "ist", it: ["è"] });
    expect(checkMeaning("e", ist)).toEqual(correct("è"));
  });

  it("accepts Italian typos without a note, within a tolerance by length", () => {
    // ≤ 3 letters: none
    expect(checkMeaning("chu", word("wer"))).toEqual(wrong("chi"));
    expect(checkMeaning("noo", word("nein"))).toEqual(wrong("no"));
    // 4–6: one
    expect(checkMeaning("csaa", word("Haus"))).toEqual(correct("casa"));
    expect(checkMeaning("cassa", word("Haus"))).toEqual(correct("casa"));
    expect(checkMeaning("cssaa", word("Haus"))).toEqual(wrong("casa"));
    // ≥ 7: two
    expect(checkMeaning("frattelo", word("Bruder"))).toEqual(correct("fratello"));
    expect(checkMeaning("fartelli", word("Bruder"))).toEqual(correct("fratello"));
    expect(checkMeaning("fartellii", word("Bruder"))).toEqual(wrong("fratello"));
    // a typo and a missing accent together
    const warum = item({ pos: "adv", de: "warum", it: ["perché"] });
    expect(checkMeaning("prche", warum)).toEqual(correct("perché"));
  });

  it("prefers an exact match over a typo match against another meaning", () => {
    const x = item({ pos: "noun", de: "X", article: "der", it: ["cane", "cena"] });
    expect(checkMeaning("cena", x)).toEqual(expect.objectContaining({ outcome: "correct", matched: "cena" }));
  });

  it("refuses typo tolerance for another known word", () => {
    const neun = word("neun");
    expect(checkMeaning("nome", neun)).toEqual(correct("nove"));
    const knownAnswers = vocab.flatMap((v) => v.it);
    expect(checkMeaning("nome", neun, { knownAnswers })).toEqual(wrong("nove"));
    expect(checkMeaning("nvoe", neun, { knownAnswers })).toEqual(correct("nove"));
  });

  it("rejects empty answers", () => {
    expect(checkMeaning("", word("Haus"))).toEqual(wrong("casa"));
    expect(checkMeaning("   ", word("Haus"))).toEqual(wrong("casa"));
    expect(checkMeaning(" ?! ", word("Haus"))).toEqual(wrong("casa"));
    expect(checkMeaning("la", word("Haus"))).toEqual(wrong("casa"));
  });
});

describe("checkGerman (Italian → German)", () => {
  it("accepts the exact form, ignoring the case of a phrase's first word", () => {
    expect(checkGerman("danke", word("danke"))).toEqual(correct("danke"));
    expect(checkGerman("Danke", word("danke"))).toEqual(correct("danke"));
    expect(checkGerman("hallo", word("Hallo"))).toEqual(correct("Hallo"));
    expect(checkGerman("guten Morgen", word("Guten Morgen"))).toEqual(correct("Guten Morgen"));
    expect(checkGerman("  Guten   Morgen!  ", word("Guten Morgen"))).toEqual(correct("Guten Morgen"));
  });

  it("ignores punctuation and apostrophe variants in phrases", () => {
    const wieGehts = word("Wie geht's?");
    expect(checkGerman("Wie geht's?", wieGehts)).toEqual(correct("Wie geht's?"));
    expect(checkGerman("Wie geht's", wieGehts)).toEqual(correct("Wie geht's?"));
    expect(checkGerman("wie geht’s", wieGehts)).toEqual(correct("Wie geht's?"));
    expect(checkGerman("Wie geht´s?", wieGehts)).toEqual(correct("Wie geht's?"));
    expect(checkGerman("Wie gehts", wieGehts)).toEqual(correct("Wie geht's?"));
    expect(checkGerman("Wie geht's?", wieGehts).matched).toBeUndefined();
  });

  it("accepts acceptDe alternatives and reports which one matched", () => {
    expect(checkGerman("Wie geht es dir?", word("Wie geht's?"))).toEqual(
      expect.objectContaining({ outcome: "correct", notes: [], expected: "Wie geht's?", matched: "Wie geht es dir?" }),
    );
    expect(checkGerman("wie geht es", word("Wie geht's?")).outcome).toBe("correct");
    expect(checkGerman("Tschüs", word("Tschüss"))).toEqual(correct("Tschüss"));
    expect(checkGerman("Tschüss", word("Tschüss"))).toEqual(correct("Tschüss"));
  });

  it("allows umlauts typed as ae/oe/ue/ss", () => {
    expect(checkGerman("das Maedchen", word("Mädchen"))).toEqual(correct("das Mädchen", ["umlaut"]));
    expect(checkGerman("heissen", word("heißen"))).toEqual(correct("heißen", ["umlaut"]));
    expect(checkGerman("Tschuess", word("Tschüss"))).toEqual(correct("Tschüss", ["umlaut"]));
    expect(checkGerman("tschues", word("Tschüss"))).toEqual(correct("Tschüss", ["umlaut"]));
    expect(checkGerman("fuenf", word("fünf"))).toEqual(correct("fünf", ["umlaut"]));
    expect(checkGerman("zwoelf", word("zwölf"))).toEqual(correct("zwölf", ["umlaut"]));
    expect(checkGerman("fuenfzehn", word("fünfzehn"))).toEqual(correct("fünfzehn", ["umlaut"]));
  });

  it("does not rewrite real ue/ss spellings in the answer", () => {
    const wasser = item({ pos: "noun", de: "Wasser", article: "das", it: ["acqua"] });
    expect(checkGerman("das Wasser", wasser)).toEqual(correct("das Wasser"));
    // ß for ss is two edits, not an umlaut variant.
    expect(checkGerman("das Waßer", wasser)).toEqual(wrong("das Wasser"));
    const neue = item({ pos: "adj", de: "neue", it: ["nuova"] });
    expect(checkGerman("neue", neue)).toEqual(correct("neue"));
    expect(checkGerman("neü", neue).outcome).not.toBe("correct");
  });

  it("treats umlauts without dots as almost", () => {
    expect(checkGerman("das Madchen", word("Mädchen"))).toEqual(almost("das Mädchen", ["umlaut"]));
    expect(checkGerman("funf", word("fünf"))).toEqual(almost("fünf", ["umlaut"]));
    expect(checkGerman("zwolf", word("zwölf"))).toEqual(almost("zwölf", ["umlaut"]));
    expect(checkGerman("Tschuss", word("Tschüss"))).toEqual(almost("Tschüss", ["umlaut"]));
    expect(checkGerman("heisen", word("heißen"))).toEqual(almost("heißen", ["typo"]));
  });

  it("refuses dotless or typo matches that are another known word", () => {
    const knownAnswers = vocab.map((v) => v.de);
    expect(checkGerman("nein", word("neun"))).toEqual(almost("neun", ["typo"]));
    expect(checkGerman("nein", word("neun"), { knownAnswers })).toEqual(wrong("neun"));
    expect(checkGerman("nuen", word("neun"), { knownAnswers })).toEqual(almost("neun", ["typo"]));
    const schoen = item({ pos: "adj", de: "schön", it: ["bello"] });
    expect(checkGerman("schon", schoen)).toEqual(almost("schön", ["umlaut"]));
    expect(checkGerman("schon", schoen, { knownAnswers: ["schon"] })).toEqual(wrong("schön", ["umlaut"]));
    expect(checkGerman("schoen", schoen, { knownAnswers: ["schon"] })).toEqual(correct("schön", ["umlaut"]));
  });

  it("applies typo tolerance by length, never to short words", () => {
    expect(checkGerman("wer", word("wo"))).toEqual(wrong("wo"));
    expect(checkGerman("woo", word("wo"))).toEqual(wrong("wo"));
    expect(checkGerman("wie", word("wer"))).toEqual(wrong("wer"));
    expect(checkGerman("acuh", word("auch"))).toEqual(almost("auch", ["typo"]));
    expect(checkGerman("woehr", word("woher"))).toEqual(almost("woher", ["typo"]));
    expect(checkGerman("wohre", word("woher")).outcome).toBe("almost");
    expect(checkGerman("wehor", word("woher"))).toEqual(wrong("woher"));
    expect(checkGerman("sieebn", word("sieben"))).toEqual(almost("sieben", ["typo"]));
    expect(checkGerman("Entschuldigugn", word("Entschuldigung"))).toEqual(almost("Entschuldigung", ["typo"]));
    expect(checkGerman("Entshuldigugn", word("Entschuldigung"))).toEqual(almost("Entschuldigung", ["typo"]));
    expect(checkGerman("Entshuldgugn", word("Entschuldigung"))).toEqual(wrong("Entschuldigung"));
  });

  it("prefers an exact match over a typo match of another accepted form", () => {
    const x = item({ pos: "interj", de: "Tschau", acceptDe: ["Ciao"], it: ["ciao"] });
    expect(checkGerman("Ciao", x)).toEqual(expect.objectContaining({ outcome: "correct", matched: "Ciao" }));
  });

  describe("nouns", () => {
    it("requires the article and shows it in expected", () => {
      expect(checkGerman("das Haus", word("Haus"))).toEqual(correct("das Haus"));
      expect(checkGerman("Das Haus", word("Haus"))).toEqual(correct("das Haus"));
      expect(checkGerman("DAS Haus", word("Haus"))).toEqual(correct("das Haus"));
      expect(checkGerman("die Schwester", word("Schwester"))).toEqual(correct("die Schwester"));
    });

    it("flags a missing article as wrong", () => {
      expect(checkGerman("Haus", word("Haus"))).toEqual(wrong("das Haus", ["missing-article"]));
      expect(checkGerman("haus", word("Haus"))).toEqual(wrong("das Haus", ["missing-article", "capitalization"]));
      expect(checkGerman("Hund", word("Hund"))).toEqual(wrong("der Hund", ["missing-article"]));
    });

    it("treats ein/eine in article position as a missing article", () => {
      expect(checkGerman("ein Haus", word("Haus"))).toEqual(wrong("das Haus", ["missing-article"]));
      expect(checkGerman("eine Katze", word("Katze"))).toEqual(wrong("die Katze", ["missing-article"]));
      expect(checkGerman("den Hund", word("Hund"))).toEqual(wrong("der Hund", ["missing-article"]));
    });

    it("flags a wrong article as wrong", () => {
      expect(checkGerman("der Haus", word("Haus"))).toEqual(wrong("das Haus", ["wrong-article"]));
      expect(checkGerman("die Mädchen", word("Mädchen"))).toEqual(wrong("das Mädchen", ["wrong-article"]));
      expect(checkGerman("das Sonne", word("Sonne"))).toEqual(wrong("die Sonne", ["wrong-article"]));
      expect(checkGerman("der Hnud", word("Hund"))).toEqual(almost("der Hund", ["typo"]));
      expect(checkGerman("die Hnud", word("Hund"))).toEqual(wrong("der Hund", ["wrong-article", "typo"]));
    });

    it("accepts a lowercase noun with a capitalization note", () => {
      expect(checkGerman("das haus", word("Haus"))).toEqual(correct("das Haus", ["capitalization"]));
      expect(checkGerman("das maedchen", word("Mädchen"))).toEqual(
        correct("das Mädchen", ["capitalization", "umlaut"]),
      );
      expect(checkGerman("das madchen", word("Mädchen"))).toEqual(
        almost("das Mädchen", ["capitalization", "umlaut"]),
      );
    });

    it("rejects a different noun even with the right article", () => {
      expect(checkGerman("der Mond", word("Mann"))).toEqual(wrong("der Mann"));
      expect(checkGerman("das Kind", word("Haus"))).toEqual(wrong("das Haus"));
      expect(checkGerman("der", word("Mann"))).toEqual(wrong("der Mann"));
    });

    it("rejects the plural", () => {
      expect(checkGerman("die Häuser", word("Haus")).outcome).toBe("wrong");
      expect(checkGerman("die Brüder", word("Bruder")).outcome).toBe("wrong");
    });

    it("does not ask for an article with proper nouns", () => {
      expect(checkGerman("Italien", word("Italien"))).toEqual(correct("Italien"));
      expect(checkGerman("italien", word("Italien"))).toEqual(correct("Italien", ["capitalization"]));
    });

    it("notes a missing capital inside a phrase, but not on its first word", () => {
      const phrase = (de: string) => item({ pos: "phrase", de, it: ["x"] });
      expect(checkGerman("Auf wiedersehen", phrase("Auf Wiedersehen"))).toEqual(
        correct("Auf Wiedersehen", ["capitalization"]),
      );
      expect(checkGerman("guten morgen", phrase("Guten Morgen"))).toEqual(
        correct("Guten Morgen", ["capitalization"]),
      );
      expect(checkGerman("guten Morgen", phrase("Guten Morgen"))).toEqual(correct("Guten Morgen"));
      expect(checkGerman("zu Hause", phrase("zu Hause"))).toEqual(correct("zu Hause"));
      expect(checkGerman("Wie geht's", phrase("Wie geht's?"))).toEqual(correct("Wie geht's?"));
    });

    it("accepts acceptDe for nouns with or without the article", () => {
      const foto = item({ pos: "noun", de: "Foto", article: "das", acceptDe: ["das Photo"], it: ["foto"] });
      expect(checkGerman("das Photo", foto)).toEqual(
        expect.objectContaining({ outcome: "correct", expected: "das Foto", matched: "das Photo" }),
      );
      expect(checkGerman("Photo", foto)).toEqual(wrong("das Foto", ["missing-article"]));
    });
  });

  it("rejects empty answers", () => {
    expect(checkGerman("", word("danke"))).toEqual(wrong("danke"));
    expect(checkGerman("  \n ", word("Haus"))).toEqual(wrong("das Haus"));
    expect(checkGerman("?", word("Wie geht's?"))).toEqual(wrong("Wie geht's?"));
  });
});

describe("checkCloze (grammar gaps)", () => {
  it("accepts the exact answer", () => {
    expect(checkCloze("wohne", exercise("g-a1-0003-e1"))).toEqual(correct("wohne"));
    expect(checkCloze(" Sie ", exercise("g-a1-0001-e4"))).toEqual(correct("Sie"));
    expect(checkCloze("ein.", exercise("g-a1-0006-e1"))).toEqual(correct("ein"));
  });

  it("has no typo tolerance", () => {
    expect(checkCloze("wohnt", exercise("g-a1-0003-e1"))).toEqual(wrong("wohne"));
    expect(checkCloze("habt", exercise("g-a1-0008-e2"))).toEqual(wrong("Hast"));
    expect(checkCloze("eine", exercise("g-a1-0006-e1"))).toEqual(wrong("ein"));
    expect(checkCloze("ein", exercise("g-a1-0013-e2"))).toEqual(wrong("einen"));
    expect(checkCloze("lrent", exercise("g-a1-0003-e3"))).toEqual(wrong("lernt"));
  });

  it("rejects the wrong case when the exercise is case-sensitive", () => {
    expect(checkCloze("sie", exercise("g-a1-0001-e4"))).toEqual(wrong("Sie", ["case"]));
    expect(checkCloze("SIE", exercise("g-a1-0001-e4"))).toEqual(wrong("Sie", ["case"]));
  });

  it("ignores case otherwise, noting only a lowercase noun", () => {
    expect(checkCloze("ich", exercise("g-a1-0001-e1"))).toEqual(correct("Ich"));
    expect(checkCloze("sie", exercise("g-a1-0001-e6"))).toEqual(correct("Sie"));
    expect(checkCloze("Du", exercise("g-a1-0001-e3"))).toEqual(correct("du"));
    expect(checkCloze("Das", exercise("g-a1-0005-e4"))).toEqual(correct("das"));
    expect(checkCloze("kinder", exercise("g-a1-0007-e2"))).toEqual(correct("Kinder", ["capitalization"]));
  });

  it("knows when the gap starts a sentence", () => {
    expect(gapStartsSentence("___ Sie Frau Schmidt?")).toBe(true);
    expect(gapStartsSentence("Das ist Anna. ___ wohnt in Wien.")).toBe(true);
    expect(gapStartsSentence("Wie heißen ___?")).toBe(false);
    expect(gapStartsSentence("Die ___ sind gut.")).toBe(false);
  });

  it("accepts ae/oe/ue/ss with a note", () => {
    expect(checkCloze("heisst", exercise("g-a1-0003-e4"))).toEqual(correct("heißt", ["umlaut"]));
    expect(checkCloze("Buecher", exercise("g-a1-0007-e6"))).toEqual(correct("Bücher", ["umlaut"]));
    expect(checkCloze("brueder", exercise("g-a1-0007-e1"))).toEqual(correct("Brüder", ["capitalization", "umlaut"]));
  });

  it("rejects umlauts without dots", () => {
    expect(checkCloze("Bruder", exercise("g-a1-0007-e1"))).toEqual(wrong("Brüder", ["umlaut"]));
    expect(checkCloze("Bucher", exercise("g-a1-0007-e6"))).toEqual(wrong("Bücher", ["umlaut"]));
    expect(checkCloze("Manner", cloze(["Männer"]))).toEqual(wrong("Männer", ["umlaut"]));
  });

  it("combines a case error with an umlaut note on case-sensitive gaps", () => {
    expect(checkCloze("ihnen", cloze(["Ihnen"], true))).toEqual(wrong("Ihnen", ["case"]));
    expect(checkCloze("Fuer", cloze(["für"], true))).toEqual(wrong("für", ["case", "umlaut"]));
  });

  it("accepts any listed answer, showing the first as expected", () => {
    const ex = cloze(["bin", "heiße"]);
    expect(checkCloze("heiße", ex)).toEqual(expect.objectContaining({ outcome: "correct", expected: "bin", matched: "heiße" }));
    expect(checkCloze("heisse", ex)).toEqual(correct("bin", ["umlaut"]));
  });

  it("rejects empty answers", () => {
    expect(checkCloze("", exercise("g-a1-0001-e1"))).toEqual(wrong("Ich"));
    expect(checkCloze("    ", exercise("g-a1-0001-e1"))).toEqual(wrong("Ich"));
  });
});
