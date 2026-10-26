// Picks the best German voice the phone offers. Kept free of browser
// globals so it can be tested with fake voice lists.

export interface VoiceLike {
  name: string;
  lang: string;
  localService: boolean;
  default?: boolean;
}

function score(v: VoiceLike): number {
  const lang = v.lang.replace("_", "-").toLowerCase();
  let s = 0;
  if (lang === "de-de") s += 100;
  else if (lang.startsWith("de")) s += 50; // de-AT, de-CH: still German
  else return -1;
  if (/google/i.test(v.name)) s += 10; // usually the most natural on Android
  if (v.localService) s += 5; // works offline
  if (v.default) s += 1;
  return s;
}

export function pickGermanVoice<V extends VoiceLike>(voices: V[]): V | undefined {
  let best: V | undefined;
  let bestScore = -1;
  for (const v of voices) {
    const s = score(v);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return best;
}
