import { describe, expect, it } from "vitest";
import { pickGermanVoice } from "./voices";

const v = (name: string, lang: string, localService = true) => ({ name, lang, localService });

describe("pickGermanVoice", () => {
  it("prefers German from Germany, then Google, then offline", () => {
    const voices = [
      v("Italiano", "it-IT"),
      v("Deutsch (Österreich)", "de-AT"),
      v("Samsung Deutsch", "de-DE"),
      v("Google Deutsch", "de-DE", false),
    ];
    expect(pickGermanVoice(voices)?.name).toBe("Google Deutsch");
  });

  it("accepts underscores and other German variants", () => {
    expect(pickGermanVoice([v("x", "it_IT"), v("y", "de_CH")])?.name).toBe("y");
  });

  it("returns nothing without a German voice", () => {
    expect(pickGermanVoice([v("Italiano", "it-IT"), v("English", "en-US")])).toBeUndefined();
    expect(pickGermanVoice([])).toBeUndefined();
  });
});
