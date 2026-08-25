import type { CSSProperties } from "react";

export type ThemeMode = "dark" | "light";

/** Palette dark glassmorphism (default). */
const DARK = {
  bg: "#0a0a1a",
  bg2: "radial-gradient(ellipse at 50% 0%,rgba(124,92,252,.06),transparent 70%)",
  glass: "rgba(255,255,255,0.06)",
  glassH: "rgba(255,255,255,0.10)",
  gb: "rgba(255,255,255,0.09)",
  /** Superficie opaca sopra il contenuto: modali, tooltip, bottom nav. */
  surf: "rgba(15,15,30,.96)",
  /** Velo dietro le modali. */
  overlay: "rgba(0,0,0,.8)",
  /**
   * Traccia non riempita di barre e anelli. Non può essere `glass`: quella è
   * un velo bianco, pensato per il fondo scuro, e in tema chiaro sparisce
   * sulla card bianca lasciando la barra senza binario.
   */
  track: "rgba(255,255,255,0.12)",
  tx: "#f0f0f8",
  tx2: "#a0a0b8",
  tx3: "#5c5c72",
  mia: "#ff6b9d",
  miaG: "linear-gradient(135deg,#ff6b9d,#ff8fab)",
  sam: "#8b5cf6",
  samG: "linear-gradient(135deg,#8b5cf6,#a78bfa)",
  gold: "#fbbf24",
  goldG: "linear-gradient(135deg,#fbbf24,#f59e0b)",
  mint: "#34d399",
  mintG: "linear-gradient(135deg,#34d399,#6ee7b7)",
  red: "#f87171",
  acc: "#7c5cfc",
  accG: "linear-gradient(135deg,#7c5cfc,#a78bfa)",
  blue: "#60a5fa",
};

/** Stessa palette in chiaro: accenti scuriti per restare leggibili su fondo bianco. */
const LIGHT: typeof DARK = {
  bg: "#f5f4fb",
  bg2: "radial-gradient(ellipse at 50% 0%,rgba(124,92,252,.12),transparent 70%)",
  glass: "rgba(255,255,255,0.72)",
  glassH: "rgba(255,255,255,0.92)",
  gb: "rgba(24,20,60,0.10)",
  surf: "rgba(255,255,255,.97)",
  overlay: "rgba(24,20,60,.45)",
  track: "rgba(24,20,60,0.12)",
  tx: "#15152a",
  tx2: "#4c4c66",
  tx3: "#7a7a95",
  mia: "#db2777",
  miaG: "linear-gradient(135deg,#db2777,#f472b6)",
  sam: "#7c3aed",
  samG: "linear-gradient(135deg,#7c3aed,#a78bfa)",
  gold: "#b45309",
  goldG: "linear-gradient(135deg,#d97706,#b45309)",
  mint: "#047857",
  mintG: "linear-gradient(135deg,#047857,#10b981)",
  red: "#dc2626",
  acc: "#6d28d9",
  accG: "linear-gradient(135deg,#6d28d9,#8b5cf6)",
  blue: "#2563eb",
};

export const PALETTES: Record<ThemeMode, typeof DARK> = { dark: DARK, light: LIGHT };

/**
 * Token colore: ogni voce è una CSS variable, così cambiare `data-theme`
 * sul documento ritinge tutta l'app senza far ri-renderizzare React.
 */
export const P = Object.fromEntries(Object.keys(DARK).map((k) => [k, `var(--p-${k})`])) as typeof DARK;

/** Versione trasparente di un token (pct = 0-100): sostituisce il vecchio `P.gold + "15"`. */
export const alpha = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/** Superficie vetro riusabile. */
export const gls: CSSProperties = {
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  background: P.glass,
  border: `1px solid ${P.gb}`,
  borderRadius: 16,
};

/**
 * Spazio da lasciare in cima: notch, Dynamic Island o barra di stato. `max`
 * e non solo `env(...)`: il valore di ripiego di `env` scatta solo dove la
 * funzione non esiste, mentre su iPhone `env` risponde e in alcuni contesti
 * (Safari a schermo intero, PWA appena installata) risponde troppo poco. I
 * 44px sono l'altezza minima della barra di stato iOS.
 */
export const SAFE_TOP = "max(env(safe-area-inset-top, 44px), 44px)";

/** Idem in basso, per la home indicator: qui non serve un minimo. */
export const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";

/**
 * Container mobile-first condiviso da tutte le schermate. Con
 * `box-sizing: border-box` il padding resta dentro i 100vh.
 *
 * Attenzione: chi fa lo spread di `screen` e poi scrive `padding`, sovrascrive
 * anche questo `paddingTop`. In quel caso va rimesso a mano (vedi Login e
 * PinEntry).
 */
export const screen: CSSProperties = {
  maxWidth: 420,
  margin: "0 auto",
  minHeight: "100vh",
  paddingTop: SAFE_TOP,
  background: P.bg,
  backgroundImage: P.bg2,
  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
  color: P.tx,
};
