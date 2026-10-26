// Text helpers shared by the answer checkers. Everything here is pure and
// language-agnostic except the umlaut tables.

const ZERO_WIDTH = /[​-‍⁠﻿]/g;
const APOSTROPHES = /[’‘`´ʼʹ′]/g;
const DASHES = /[‐‑‒–—―−]/g;
const QUOTES = /[“”„‟«»‹›"]/g;
// Punctuation that never changes the meaning of a typed answer.
const PUNCTUATION = /[.,!?;:"¿¡…]/g;
const EDGE_PUNCTUATION = /^[\s.,!?;:"¿¡…-]+|[\s.,!?;:"¿¡…-]+$/g;

// Trim, collapse whitespace, unify apostrophes/dashes/quotes and strip
// punctuation at both ends. Case and inner punctuation are kept.
export function normalizeText(s: string): string {
  return s
    .normalize("NFC")
    .replace(ZERO_WIDTH, "")
    .replace(APOSTROPHES, "'")
    .replace(DASHES, "-")
    .replace(QUOTES, '"')
    .replace(/\s+/g, " ")
    .replace(EDGE_PUNCTUATION, "");
}

// Removes punctuation anywhere ("Hallo, wie geht's?" → "Hallo wie geht's").
// Expects normalizeText output.
export function stripPunctuation(s: string): string {
  return s.replace(PUNCTUATION, " ").replace(/\s+/g, " ").trim();
}

export function removeApostrophes(s: string): string {
  return s.replace(/'/g, "");
}

export function removeParentheticals(s: string): string {
  return s.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

// "perché" → "perche". Also removes umlaut dots, so only use it for Italian.
export function foldAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}

const UMLAUTS: Record<string, { translit: string[]; dotless: string | null }> = {
  ä: { translit: ["ae"], dotless: "a" },
  ö: { translit: ["oe"], dotless: "o" },
  ü: { translit: ["ue"], dotless: "u" },
  Ä: { translit: ["Ae", "AE"], dotless: "A" },
  Ö: { translit: ["Oe", "OE"], dotless: "O" },
  Ü: { translit: ["Ue", "UE"], dotless: "U" },
  ß: { translit: ["ss"], dotless: null },
  ẞ: { translit: ["SS", "Ss"], dotless: null },
};

export function transliterateUmlauts(s: string): string {
  return Array.from(s, (c) => UMLAUTS[c]?.translit[0] ?? c).join("");
}

export interface UmlautMatch {
  translit: boolean; // some ä/ö/ü/ß was typed as ae/oe/ue/ss
  dotless: boolean; // some ä/ö/ü was typed without dots
}

// Does `answer` spell `expected`, allowing each umlaut of the EXPECTED form
// to be typed as itself, transliterated or without dots? Driven by the
// expected form so real "ue"/"ss" words are never rewritten. Case-sensitive:
// lowercase both sides for a case-insensitive check. Prefers matches with
// fewer dotless letters.
export function matchUmlauts(answer: string, expected: string): UmlautMatch | null {
  const exp = Array.from(expected);
  const ans = Array.from(answer);

  function walk(i: number, j: number): UmlautMatch | null {
    if (j === exp.length) {
      return i === ans.length ? { translit: false, dotless: false } : null;
    }
    const c = exp[j];
    const rule = UMLAUTS[c];
    const options: [string, keyof UmlautMatch | null][] = [[c, null]];
    if (rule) {
      for (const t of rule.translit) options.push([t, "translit"]);
      if (rule.dotless) options.push([rule.dotless, "dotless"]);
    }
    let best: UmlautMatch | null = null;
    for (const [spelling, kind] of options) {
      const chars = Array.from(spelling);
      if (!chars.every((ch, k) => ans[i + k] === ch)) continue;
      const rest = walk(i + chars.length, j + 1);
      if (!rest) continue;
      const m = { ...rest };
      if (kind) m[kind] = true;
      if (!best || score(m) < score(best)) best = m;
    }
    return best;
  }

  return walk(0, 0);
}

function score(m: UmlautMatch): number {
  return (m.dotless ? 2 : 0) + (m.translit ? 1 : 0);
}

// Optimal string alignment distance: insert, delete, substitute, or swap
// two adjacent characters, each costing 1. Works on code points.
export function editDistance(a: string, b: string): number {
  const s = Array.from(a);
  const t = Array.from(b);
  const d: number[][] = [];
  for (let i = 0; i <= s.length; i++) {
    d.push(new Array<number>(t.length + 1).fill(0));
    d[i][0] = i;
  }
  for (let j = 0; j <= t.length; j++) d[0][j] = j;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[s.length][t.length];
}

// Allowed typos for an expected answer of this many characters.
export function typoTolerance(expected: string): number {
  const length = Array.from(expected).length;
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

export function startsLowercase(s: string): boolean {
  const first = Array.from(s)[0] ?? "";
  return first !== first.toUpperCase() && first === first.toLowerCase();
}

export function startsUppercase(s: string): boolean {
  const first = Array.from(s)[0] ?? "";
  return first !== first.toLowerCase() && first === first.toUpperCase();
}
