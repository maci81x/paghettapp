import { useEffect, useState } from "react";
import type { ThemeMode } from "../design/tokens";

const KEY = "paghetta.theme";

/** Scelta dell'utente: "auto" segue il sistema, le altre due lo forzano. */
export type ThemePref = ThemeMode | "auto";

export const THEME_LABEL: Record<ThemePref, { i: string; l: string }> = {
  dark: { i: "🌙", l: "Scuro" },
  light: { i: "☀️", l: "Chiaro" },
  auto: { i: "🔄", l: "Auto" },
};

/** Ordine del ciclo al tap: scuro → chiaro → auto → scuro. */
const NEXT: Record<ThemePref, ThemePref> = { dark: "light", light: "auto", auto: "dark" };

const systemMode = (): ThemeMode => (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

export const storedPref = (): ThemePref => {
  const saved = localStorage.getItem(KEY);
  return saved === "dark" || saved === "light" || saved === "auto" ? saved : "auto";
};

/** Tema effettivo: la preferenza, risolta contro il sistema quando è "auto". */
export const storedTheme = (): ThemeMode => {
  const pref = storedPref();
  return pref === "auto" ? systemMode() : pref;
};

/** Da chiamare al boot: il login e la schermata PIN sono fuori da <Shell>. */
export const applyStoredTheme = () => {
  document.documentElement.dataset.theme = storedTheme();
};

/**
 * Tema chiaro/scuro globale: scrive `data-theme` sul documento, dove le CSS
 * variables di `design/tokens` fanno il resto. In "auto" resta in ascolto sul
 * sistema, così il tema cambia anche a app aperta.
 */
export function useThemeMode() {
  const [pref, setPref] = useState<ThemePref>(storedPref);

  useEffect(() => {
    localStorage.setItem(KEY, pref);
    const apply = () => {
      document.documentElement.dataset.theme = pref === "auto" ? systemMode() : pref;
    };
    apply();
    if (pref !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pref]);

  return { pref, label: THEME_LABEL[pref], set: setPref, toggle: () => setPref((p) => NEXT[p]) };
}
