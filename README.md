# Kuckuck

Un'app personale per imparare il tedesco, da A1 a B1. Spiegazioni, traduzioni e interfaccia sono in italiano.

*Il tedesco, un passo alla volta.*

## Sviluppo

```
npm install
npm run dev        # server locale
npm run build      # controlla i contenuti, poi build di produzione in dist/
npm test           # test
npm run validate-content
```

## Contenuti

Tutto il materiale didattico sta in `content/`, separato dal codice:

```
content/
  manifest.json          versione dei contenuti e livelli
  schema.ts              forma dei file (zod)
  validate.ts            controlli: articoli, plurali, punteggiatura, lotti
  a1/level.json
  a1/u01/unit.json       titolo, descrizione e lotti di lezione (max 5 elementi)
  a1/u01/vocab.json      parole
  a1/u01/grammar.json    regole di grammatica ed esercizi
```

Gli id (`v-a1-0001`, `g-a1-0001`, …) non si cambiano e non si riusano: i progressi sono legati a loro.
Per correggere una parola basta modificare il testo; `npm run validate-content` segnala gli errori.

Stack: Vite, React, TypeScript. I progressi restano sul telefono (IndexedDB).

## Sul telefono

- **Installare:** apri il sito in Chrome → menu (⋮) → «Installa app». Dopo la prima apertura funziona anche offline.
- **Aggiornamenti:** quando esce una nuova versione compare un avviso «Aggiorna»; niente si ricarica a metà di un quiz.
- **Copia di sicurezza:** i progressi restano solo sul telefono. In *Impostazioni → Copia di sicurezza* si salva un file `.json` e da lì si ripristina (anche su un altro telefono).
- **Audio:** usa la voce tedesca del telefono. Se manca, *Impostazioni → Audio* spiega come installarla.

## Icone

`scripts/icon.svg` è il disegno; `node scripts/render-icons.cjs` rigenera i PNG in `public/` (serve Playwright).

## Pubblicazione

Il workflow `.github/workflows/deploy.yml` costruisce l'app e la pubblica su GitHub Pages a ogni push su `main`.
In *Settings → Pages* scegli **GitHub Actions** come sorgente.
