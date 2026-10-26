# Working on Kuckuck

Kuckuck is a personal German-learning app (A1 → B1) for one learner: an Italian native speaker who uses it on a Samsung Android phone in Chrome, installed as an app. The owner tests on a Pixel. Read README.md for what the app does; this file records the decisions and conventions to keep.

## Product rules

- **Everything the learner sees is in Italian:** UI, explanations, translations, notes. All UI strings live in `src/i18n/it.ts`; components never hard-code text.
- **No references to, or comparisons with, other learning apps or products** anywhere: code, comments, content, commit messages, docs, UI. Design, wording and assets are original.
- Tone: calm, short, a little whimsical (the app is named after the cuckoo).
- Mobile-first. Check layouts at 360px and 412px wide, in light and dark, with no horizontal scroll.
- Fully local: no accounts, no backend, no API keys. Progress lives in IndexedDB on the phone.

Settled decisions (don't change without asking):
- SRS stages, derived from FSRS stability: Uovo 🥚 (< 7 days), Pulcino 🐣 (≥ 7), Passerotto 🐦 (≥ 30), Gufo 🦉 (≥ 90), Aquila 🦅 (≥ 180, retires from reviews). An item's stage is its lowest card's. Thresholds are in `src/domain/config.ts`.
- Tabs: Oggi, Percorso, Vocabolario, Impostazioni.
- The checker override reads "Invece è corretto"; once tapped it shows "Annulla" until she moves on.
- Lessons hold at most 5 items; new lessons pause while more than 40 reviews are due.
- No on-screen umlaut keys: phone keyboards have them.
- Grammar points are labelled with the "Grammatica" tag, not emoji.
- Theme: Automatico / Chiaro / Scuro, stored per device in localStorage.
- The manifest's theme and background colour is the brand green `#3f6b5a`: Android uses it for an installed app's navigation bar, and one colour has to work in both themes.

## Content conventions

- Files: `content/<level>/uNN/{unit,vocab,grammar}.json`, listed in order in `content/<level>/level.json`. Schema in `content/schema.ts`; `npm run validate-content` must report 0 errors and 0 warnings.
- IDs are stable and never reused: vocab `v-a1-0001…`, grammar `g-a1-0001…`, exercises `<grammar id>-eN`, lessons `a1-uNN-bNN`. Continue numbering from the highest existing ID.
- Every vocab item: German, Italian meanings (first one shown), a `promptIt` that makes the wanted German unambiguous (check for clashes with earlier units), 2–3 examples with Italian translations. Nouns always have `article` and `plural` (`null` if none; `pluralOnly: true` for words like die Eltern).
- `noteIt` should flag what trips up Italian speakers: genders that differ from Italian (die Sonne, der Mond, das Mädchen…), false friends, irregular forms.
- Grammar points: short Italian explanation paragraphs, a `pattern` table (lines `German – Italian` render as two columns), examples, `commonMistakes` (real mistakes, accurately labelled), and 5–7 fill-in-the-blank exercises. Exercise blanks have no typo tolerance; `caseSensitive: true` where case changes meaning (Sie/sie).
- Put each grammar point in or just before the lesson whose words it uses, and quiz it with words already taught. Keep rules accurate rather than absolute; say "di solito" where there are exceptions.
- Use only A1-appropriate German in units marked A1; anything new in an example must be clear from its translation.
- Example sentences must be natural German a native speaker would say, and translations natural Italian.

### Writing a new unit

1. Write `unit.json`, `vocab.json`, `grammar.json`; add the unit to `level.json`.
2. `npm run validate-content`, `npm test`, `npx tsc -b`.
3. Have an independent agent proofread the unit (German correctness and naturalness, Italian, accuracy of every rule, answer keys, missing accepted answers, sequencing) and report without editing. Verify each finding before applying it.
4. Play every new lesson and quiz in a browser (Playwright with `vite preview`) and confirm the expected answer is accepted for every card.
5. Commit, push, deploy (below), and confirm the new unit is live.

### A1 roadmap

Done: 1 Saluti (pronouns, sein, word order) · 2 Der, die, das (gender, ein/eine, plural, haben, 0–20) · 3 Famiglia (possessives, adjectives after sein, nicht/kein, 21–100) · 4 Cibo (accusative, essen/nehmen, möchten, mögen/gern).

Planned (about 16 units for A1, roughly 650 words):
5 La giornata (time, days, separable verbs) · 6 Appuntamenti (months, dates, ordinals, inversion after time phrases) · 7 Casa (es gibt, rooms, in/auf + dative) · 8 In città (mit/zu/bei + dative, directions) · 9 Tempo libero (können, wollen) · 10 Regole (müssen, dürfen, imperative) · 11 Lavoro (jobs, -in, arbeiten) · 12 Spesa (prices, quantities, für/ohne) · 13 Vestiti (colours, accusative pronouns) · 14 Salute (body, mir/dir) · 15–16 Il passato (Perfekt with haben, then sein; war, hatte).

## Code map

- `src/content/` loads the JSON at build time (`import.meta.glob`).
- `src/checker/` checks typed answers (typos, umlauts, articles, accents, case); heavily tested.
- `src/domain/` pure logic: cards, quiz queue, unlocking, stages, forecast, stats.
- `src/srs/scheduler.ts` is the only module that knows ts-fsrs.
- `src/db/` Dexie tables (batches, cards, reviews, flags, settings), backup/restore, flags export.
- `src/features/` screens; `src/features/session/CardSession.tsx` is the question screen shared by quizzes and reviews.
- `src/audio/` German speech synthesis; `src/pwa/` install prompt and update banner; `src/theme/` light/dark.

## Checks before every push

- `npm run validate-content`, `npm test`, `npx tsc -b`, `npm run build`.
- For UI changes, look at the screens (Playwright screenshots at phone size, light and dark); for new screens run the axe audit (`axe-core` is a dev dependency) and keep it at 0 violations.
- Vitest's on-disk module cache is turned off in `vite.config.ts` because it hid newly added content files; keep it off.
- The production build carries a Content Security Policy meta tag (same-origin only, no inline scripts). Browser tests that inject scripts (axe) need Playwright's `bypassCSP: true`. Any new external resource or inline script needs the policy updated deliberately.
- Don't use Playwright's fake clock (`page.clock`): it stalls the app's live database queries. To test reviews, let missed quiz cards come due (about a minute) instead.

## Git and deployment

- The GitHub repo is `l-wittgenstein/kuckuck` (it was renamed from `kuckcuck`).
- Other sessions may push to `main` too: fetch and merge `origin/main` before pushing (merge, don't rebase or force-push), then rerun the checks.
- Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages. After pushing, confirm the live site serves the new build.
- Commit in small, focused steps with clear messages.
