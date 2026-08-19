import type { User } from "../data/types";

export const COLOR_PRESETS = [
  { name: "Rosa", from: "#ec4899", to: "#f43f5e" },
  { name: "Viola", from: "#8b5cf6", to: "#a855f7" },
  { name: "Azzurro", from: "#06b6d4", to: "#3b82f6" },
  { name: "Verde", from: "#10b981", to: "#34d399" },
  { name: "Arancio", from: "#f97316", to: "#fb923c" },
  { name: "Fucsia", from: "#d946ef", to: "#ec4899" },
  { name: "Blu Notte", from: "#1e3a5f", to: "#4a90d9" },
  { name: "Tramonto", from: "#f59e0b", to: "#ef4444" },
  { name: "Menta", from: "#6ee7b7", to: "#a7f3d0" },
  { name: "Lilla", from: "#c084fc", to: "#e879f9" },
];

export const BG_PATTERNS: { name: string; value: string; size?: string }[] = [
  { name: "Liscio", value: "none" },
  {
    name: "Stelle",
    value:
      "radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.15), transparent), radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.1), transparent), radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.12), transparent)",
  },
  {
    name: "Bolle",
    value:
      "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 40%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.07) 0%, transparent 45%)",
  },
  {
    name: "Righe",
    value: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)",
  },
  {
    name: "Griglia",
    value: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
    size: "16px 16px",
  },
];

/** Il pattern a griglia ha bisogno di una dimensione: gli altri si ripetono da soli. */
export const bgSizeFor = (value?: string) => BG_PATTERNS.find((b) => b.value === value)?.size;

/** Gradiente scelto dalla figlia, o quello di fabbrica del suo profilo. */
export const userGrad = (u: User) => (u.themeColors ? `linear-gradient(135deg,${u.themeColors.from},${u.themeColors.to})` : u.grad);

/** Tinta piatta abbinata al gradiente: usata per bordi, testi e anelli. */
export const userColor = (u: User) => u.themeColors?.from ?? u.c;

/** Nome mostrato alla figlia: il nickname se l'ha scelto. */
export const userName = (u: User) => u.nickname?.trim() || u.n;
