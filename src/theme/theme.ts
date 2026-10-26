// Light, dark, or following the phone. Kept in localStorage rather than
// the database: it's a per-device preference, and reading it
// synchronously before the first paint avoids a flash of the wrong theme.
import { useState } from "react";

export type Theme = "auto" | "light" | "dark";

const KEY = "kuckuck-theme";
const THEME_COLORS = { light: "#f6f1e7", dark: "#181a19" };

function stored(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "auto";
  } catch {
    return "auto";
  }
}

export function applyTheme(theme: Theme = stored()) {
  const root = document.documentElement;
  if (theme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);

  // The phone's status bar follows the app's colours too.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const media = meta.dataset.media ?? meta.media;
    meta.dataset.media = media; // remember the original query
    if (theme === "auto") {
      meta.media = media;
      meta.content = media.includes("dark") ? THEME_COLORS.dark : THEME_COLORS.light;
    } else {
      meta.media = "";
      meta.content = THEME_COLORS[theme];
    }
  }
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState(stored);
  return [
    theme,
    (next) => {
      try {
        if (next === "auto") localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, next);
      } catch {
        // Storage unavailable: the choice still applies for this visit.
      }
      applyTheme(next);
      setTheme(next);
    },
  ];
}
