// All user-facing text lives here. Components must not hard-code strings.
export const it = {
  app: {
    name: "Kuckuck",
    tagline: "il tedesco, un passo alla volta",
  },
  nav: {
    home: "Oggi",
    path: "Percorso",
    settings: "Impostazioni",
  },
  home: {
    greeting: "Kuckuck!",
    comingSoon: "Qui troverai ripassi, nuove lezioni e i tuoi progressi.",
  },
  path: {
    title: "Il tuo percorso",
    comingSoon: "Da A1 a B1, un'unità alla volta.",
  },
  settings: {
    title: "Impostazioni",
    comingSoon: "Presto qui: copia di sicurezza e preferenze.",
  },
  notFound: {
    title: "Questa pagina è volata via",
    back: "Torna a oggi",
  },
} as const;
