# Kuckuck

Un'app personale per imparare il tedesco, da A1 a B1. Spiegazioni, traduzioni e interfaccia sono in italiano.

*Il tedesco, un passo alla volta.*

## Sviluppo

```
npm install
npm run dev        # server locale
npm run build      # build di produzione in dist/
```

Stack: Vite, React, TypeScript. I progressi restano sul telefono (IndexedDB).

## Pubblicazione

Il workflow `.github/workflows/deploy.yml` costruisce l'app e la pubblica su GitHub Pages a ogni push su `main`.
In *Settings → Pages* scegli **GitHub Actions** come sorgente.
