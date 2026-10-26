import { describe, expect, it } from "vitest";
import {
  editDistance,
  foldAccents,
  matchUmlauts,
  normalizeText,
  stripPunctuation,
  transliterateUmlauts,
  typoTolerance,
} from "./normalize";

describe("normalizeText", () => {
  it("trims, collapses whitespace and strips edge punctuation", () => {
    expect(normalizeText("  Guten \t Morgen!  ")).toBe("Guten Morgen");
    expect(normalizeText("¿¡Hallo?!")).toBe("Hallo");
    expect(normalizeText("«casa»")).toBe("casa");
    expect(normalizeText("“casa”")).toBe("casa");
    expect(normalizeText("Hallo Welt")).toBe("Hallo Welt");
    expect(normalizeText("Ha​us")).toBe("Haus");
  });

  it("unifies apostrophes and dashes", () => {
    expect(normalizeText("geht’s")).toBe("geht's");
    expect(normalizeText("geht‘s")).toBe("geht's");
    expect(normalizeText("geht`s")).toBe("geht's");
    expect(normalizeText("geht´s")).toBe("geht's");
    expect(normalizeText("E–Mail")).toBe("E-Mail");
  });

  it("composes decomposed umlauts", () => {
    expect(normalizeText("fünf")).toBe("fünf");
  });
});

describe("stripPunctuation", () => {
  it("removes inner punctuation but keeps apostrophes", () => {
    expect(stripPunctuation("Hallo, wie geht's?")).toBe("Hallo wie geht's");
  });
});

describe("foldAccents / transliterateUmlauts", () => {
  it("folds Italian accents", () => {
    expect(foldAccents("perché sì è")).toBe("perche si e");
  });

  it("transliterates umlauts", () => {
    expect(transliterateUmlauts("Mädchen heißt Übung")).toBe("Maedchen heisst Uebung");
  });
});

describe("matchUmlauts", () => {
  it("reports how the expected umlauts were typed", () => {
    expect(matchUmlauts("fünf", "fünf")).toEqual({ translit: false, dotless: false });
    expect(matchUmlauts("fuenf", "fünf")).toEqual({ translit: true, dotless: false });
    expect(matchUmlauts("funf", "fünf")).toEqual({ translit: false, dotless: true });
    expect(matchUmlauts("Uebung", "Übung")).toEqual({ translit: true, dotless: false });
    expect(matchUmlauts("fuunf", "fünf")).toBeNull();
    expect(matchUmlauts("wasser", "waßer")).toEqual({ translit: true, dotless: false });
    expect(matchUmlauts("waßer", "wasser")).toBeNull();
  });
});

describe("editDistance", () => {
  it("counts an adjacent swap as one edit", () => {
    expect(editDistance("Hnud", "Hund")).toBe(1);
    expect(editDistance("casa", "casa")).toBe(0);
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("ca", "abc")).toBe(3);
  });

  it("scales tolerance with length", () => {
    expect(typoTolerance("wer")).toBe(0);
    expect(typoTolerance("auch")).toBe(1);
    expect(typoTolerance("sieben")).toBe(1);
    expect(typoTolerance("Mädchen")).toBe(2);
  });
});
