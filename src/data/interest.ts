// estensione esplicita: così `node --test` esegue i test senza bundler
import { YIELD_YEAR } from "./constants.ts";

/** Tasso mensile: il 10% annuo capitalizzato dodici volte. */
export const MONTH_RATE = YIELD_YEAR / 12;

/** Quanti mesi arretrati si recuperano al massimo in una passata. */
export const MAX_CATCHUP = 120;

/** "2026-08" dal giorno indicato. */
export const periodOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const shift = (period: string, months: number) => {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1 + months, 1);
  return periodOf(d);
};

export const nextPeriod = (period: string) => shift(period, 1);
export const prevPeriod = (period: string) => shift(period, -1);

/** "2026-08" → "Agosto 2026". */
const MONTHS = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
export const periodLabel = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${y}` : period;
};

/**
 * Mesi ancora da capitalizzare. Il mese in corso non si tocca: gli interessi
 * si accreditano a mese chiuso, quindi si arriva al mese precedente a oggi.
 * `last` è l'ultimo periodo già accreditato, `start` quello del primo
 * movimento del risparmio.
 */
export const pendingPeriods = (last: string | null, start: string, today = new Date(), max = MAX_CATCHUP): string[] => {
  const until = prevPeriod(periodOf(today));
  let cursor = last ? nextPeriod(last) : start;
  const out: string[] = [];
  while (cursor <= until && out.length < max) {
    out.push(cursor);
    cursor = nextPeriod(cursor);
  }
  return out;
};

/** Interesse di un mese sul saldo indicato, al centesimo. */
export const monthlyInterest = (balance: number) => +Math.max(0, balance * MONTH_RATE).toFixed(2);

/** Rendimento effettivo: quanto hanno reso i soldi messi dentro. */
export const effectiveYield = (interest: number, contributed: number) => (contributed > 0 ? +((interest / contributed) * 100).toFixed(2) : 0);
