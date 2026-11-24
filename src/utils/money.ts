/**
 * Importo scritto a mano: virgola o punto, arrotondato al centesimo. `null`
 * se non è un numero positivo. Gli input con `inputMode="decimal"` su iPhone
 * mostrano la virgola, e `parseFloat("3,50")` darebbe 3.
 */
export const parseAmount = (raw: string): number | null => {
  const n = Number(raw.trim().replace(",", "."));
  if (!raw.trim() || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
};

/** 16 → "€16,00", 1234.5 → "€1.234,50": virgola per i decimali, punto per le migliaia. */
export const fmtEuro = (n: number): string => {
  const neg = n < 0;
  const [int, dec] = Math.abs(Math.round(n * 100) / 100).toFixed(2).split(".");
  return `${neg ? "−" : ""}€${int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`;
};
