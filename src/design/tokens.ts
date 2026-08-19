import type { CSSProperties } from "react";

/** Palette dark glassmorphism. */
export const P = {
  bg: "#0a0a1a",
  bg2: "radial-gradient(ellipse at 50% 0%,rgba(124,92,252,.06),transparent 70%)",
  glass: "rgba(255,255,255,0.06)",
  glassH: "rgba(255,255,255,0.10)",
  gb: "rgba(255,255,255,0.09)",
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
} as const;

/** Superficie vetro riusabile. */
export const gls: CSSProperties = {
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  background: P.glass,
  border: `1px solid ${P.gb}`,
  borderRadius: 16,
};

/** Container mobile-first condiviso da tutte le schermate. */
export const screen: CSSProperties = {
  maxWidth: 420,
  margin: "0 auto",
  minHeight: "100vh",
  background: P.bg,
  backgroundImage: P.bg2,
  fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
  color: P.tx,
};
