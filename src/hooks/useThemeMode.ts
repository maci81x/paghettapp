import { useEffect, useState } from "react";
import type { ThemeMode } from "../design/tokens";

const KEY = "paghetta.theme";

/** Scelta salvata, altrimenti quella di sistema. */
export const storedTheme = (): ThemeMode => {
  const saved = localStorage.getItem(KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

/** Da chiamare al boot: il login e la schermata PIN sono fuori da <Shell>. */
export const applyStoredTheme = () => {
  document.documentElement.dataset.theme = storedTheme();
};

/**
 * Tema chiaro/scuro globale: scrive `data-theme` sul documento, dove le CSS
 * variables di `design/tokens` fanno il resto.
 */
export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(storedTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem(KEY, mode);
  }, [mode]);
  return { mode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")) };
}
