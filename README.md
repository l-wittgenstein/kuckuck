# Kuckuck

A personal app for learning German from A1 to B1, written for an Italian speaker. All explanations, translations and the interface are in Italian.

*Il tedesco, un passo alla volta.*

Live at https://l-wittgenstein.github.io/kuckuck/

## How it works

- **A guided path:** content is organised in levels and units; lessons unlock in order and the home screen always shows the next step.
- **Lesson, quiz, reviews:** each lesson introduces up to five words or grammar points, then a short typed quiz; after that the items enter spaced-repetition reviews scheduled with FSRS.
- **Typed answers:** words are asked both ways (German → Italian, Italian → German with the article), grammar as fill-in-the-blank. The checker tolerates small typos, ae/oe/ue/ss for umlauts and missing Italian accents, with a gentle note; a wrong article is wrong.
- **Stages:** items climb from Uovo to Pulcino, Passerotto, Gufo and Aquila as the scheduler's stability grows; Aquila items leave the reviews.
- **Also:** German audio through the phone's voice, a searchable vocabulary list, flags for content that looks wrong, light/dark themes, offline use, and backup/restore of progress.

## Development

```
npm install
npm run dev               # local server
npm test                  # unit tests
npm run validate-content  # check the content files
npm run build             # validate content, type-check, build into dist/
```

Stack: Vite, React and TypeScript; Dexie (IndexedDB) for progress; ts-fsrs for scheduling; vite-plugin-pwa for offline use. Progress stays on the phone.

## Content

All learning material lives in `content/`, separate from the code:

```
content/
  manifest.json          content version and levels
  schema.ts              shape of the files (zod)
  validate.ts            checks: articles, plurals, punctuation, lessons
  a1/level.json          the level's units, in order
  a1/u01/unit.json       title, summary and lessons (at most 5 items each)
  a1/u01/vocab.json      words
  a1/u01/grammar.json    grammar points and their exercises
```

IDs (`v-a1-0001`, `g-a1-0001`, …) are never changed or reused, because progress is keyed by them. To fix a word, edit its text; `npm run validate-content` reports mistakes. See [AGENTS.md](AGENTS.md) for the conventions used when writing content.

## On the phone

- **Install:** open the site in Chrome → menu (⋮) → "Installa app". After the first visit it works offline.
- **Updates:** a new version shows an "Aggiorna" bar; nothing reloads in the middle of a quiz. Changes to the icon, name or system-bar colours reach an installed app only when Chrome refreshes it (within a day or two of opening it) or after reinstalling.
- **Backup:** progress lives only on the phone. *Impostazioni → Copia di sicurezza* saves a `.json` file and restores it, also on another phone.
- **Audio:** uses the phone's German voice. If there is none, *Impostazioni → Audio* explains how to install it.

## Icons

`scripts/icon.svg` is the drawing; `node scripts/render-icons.cjs` regenerates the PNGs in `public/` (needs Playwright).

## Deployment

`.github/workflows/deploy.yml` runs the tests, builds the app and publishes it to GitHub Pages on every push to `main`. In *Settings → Pages* the source must be **GitHub Actions**.
