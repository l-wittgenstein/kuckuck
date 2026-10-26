// Chrome fires beforeinstallprompt once, early; keep it so the install
// button can use it whenever she taps it.
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function listenForInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = undefined;
    notify();
  });
}

export function isInstalled(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function useInstallPrompt(): { canInstall: boolean; install: () => Promise<void> } {
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return {
    canInstall: !!deferred,
    install: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice;
      deferred = undefined;
      notify();
    },
  };
}
