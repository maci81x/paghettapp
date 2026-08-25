// estensione esplicita: così `node --test` esegue i test senza bundler
import { FUNDS, isoDate, todayISO, weekStartOf } from "./constants.ts";
import { allIncome } from "./report.ts";
import type { Fund, IncomeEntry, Spesa, User } from "./types";

/** Finestre temporali offerte dai filtri. */
export type Range = "week" | "month" | "prevMonth" | "all";

export const RANGES: { k: Range; l: string }[] = [
  { k: "week", l: "Questa settimana" },
  { k: "month", l: "Questo mese" },
  { k: "prevMonth", l: "Ultimo mese" },
  { k: "all", l: "Tutto" },
];

/** Tipi di entrata che valgono soldi. I punti bonus stanno nello storico punti. */
export type IncomeKind = IncomeEntry["type"];

export const INCOME_KINDS: { k: IncomeKind; l: string; icon: string }[] = [
  { k: "paghetta", l: "Paghetta", icon: "🟢" },
  { k: "extra", l: "Extra", icon: "💝" },
  { k: "regalo", l: "Regalo", icon: "🎁" },
];

export const incomeIcon = (k: IncomeKind) => INCOME_KINDS.find((x) => x.k === k)?.icon ?? "💝";

/** Filtro sulla conferma di ricezione: solo l'admin lo usa. */
export type ConfirmFilter = "all" | "yes" | "no";

export interface MovementFilter {
  range: Range;
  /** Vuoto = nessun tipo escluso. */
  kinds: IncomeKind[];
  /** Vuoto = tutti i salvadanai. */
  funds: Fund[];
  confirmed?: ConfirmFilter;
}

export const emptyFilter = (): MovementFilter => ({ range: "month", kinds: [], funds: [], confirmed: "all" });

export const isFiltered = (f: MovementFilter) =>
  f.range !== "month" || f.kinds.length > 0 || f.funds.length > 0 || (f.confirmed ?? "all") !== "all";

/**
 * Primo giorno del mese spostato di `back` mesi rispetto a `today`. Ricavato
 * da `today` e non dall'orologio di sistema, così l'intera famiglia di
 * funzioni risponde davvero alla data che le viene passata.
 */
const monthStart = (today: Date, back = 0) => {
  const d = new Date(today.getFullYear(), today.getMonth() - back, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

/** Primo giorno del periodo, o "" per "Tutto". */
export const rangeStart = (range: Range, today = new Date()): string => {
  switch (range) {
    case "week":
      return weekStartOf(today);
    case "month":
      return monthStart(today, 0);
    case "prevMonth":
      return monthStart(today, 1);
    case "all":
      return "";
  }
};

/**
 * "Ultimo mese" è il mese precedente, quindi ha anche una fine: senza di
 * quella mostrerebbe anche il mese in corso e coinciderebbe con "Tutto".
 */
export const inRange = (date: string, range: Range, today = new Date()): boolean => {
  if (!date) return false;
  const from = rangeStart(range, today);
  if (range === "all") return true;
  if (range === "prevMonth") return date >= from && date < monthStart(today, 0);
  return date >= from;
};

/**
 * Giorno di una spesa. Le voci salvate prima che il campo esistesse hanno solo
 * "gg/mm": si assume l'anno corrente, come già faceva il conto mensile.
 */
export const spesaDate = (s: Spesa, today = new Date()): string => {
  if (s.date) return s.date;
  const [dd, mm] = s.d.split("/");
  return dd && mm ? `${today.getFullYear()}-${mm}-${dd}` : isoDate(today);
};

export interface Movements {
  income: IncomeEntry[];
  spese: Spesa[];
}

/** Entrate e uscite che passano il filtro, dalle più recenti. */
export const filterMovements = (u: User, f: MovementFilter, today = new Date()): Movements => {
  const confirmed = f.confirmed ?? "all";
  const income = allIncome(u).filter((i) => {
    if (!inRange(i.date, f.range, today)) return false;
    if (f.kinds.length > 0 && !f.kinds.includes(i.type)) return false;
    // la conferma riguarda solo le paghette: le altre entrate le registra già la ragazza
    if (confirmed !== "all" && i.type === "paghetta" && (i.confirmed ?? false) !== (confirmed === "yes")) return false;
    return true;
  });
  const spese = u.spese
    .filter((s) => inRange(spesaDate(s, today), f.range, today))
    .filter((s) => f.funds.length === 0 || f.funds.includes(s.f))
    .sort((a, b) => (spesaDate(a, today) < spesaDate(b, today) ? 1 : -1));
  return { income, spese };
};

export interface Summary {
  byKind: Record<IncomeKind, { total: number; count: number }>;
  byFund: Record<Fund, { total: number; count: number }>;
  totalIn: number;
  totalOut: number;
  balance: number;
  count: number;
}

const r2 = (n: number) => +n.toFixed(2);

/** Totali dei movimenti già filtrati: è quello che la card riepilogo mostra. */
export const summarize = ({ income, spese }: Movements): Summary => {
  const byKind = Object.fromEntries(INCOME_KINDS.map((k) => [k.k, { total: 0, count: 0 }])) as Summary["byKind"];
  income.forEach((i) => {
    const slot = byKind[i.type];
    if (!slot) return;
    slot.total = r2(slot.total + i.amount);
    slot.count += 1;
  });

  const byFund = Object.fromEntries(FUNDS.map((k) => [k, { total: 0, count: 0 }])) as Summary["byFund"];
  spese.forEach((s) => {
    const slot = byFund[s.f];
    if (!slot) return;
    slot.total = r2(slot.total + s.a);
    slot.count += 1;
  });

  const totalIn = r2(income.reduce((s, i) => s + i.amount, 0));
  const totalOut = r2(spese.reduce((s, x) => s + x.a, 0));
  return { byKind, byFund, totalIn, totalOut, balance: r2(totalIn - totalOut), count: income.length + spese.length };
};

export const summaryOf = (u: User, f: MovementFilter, today = new Date()) => summarize(filterMovements(u, f, today));

export const rangeLabel = (range: Range) => RANGES.find((r) => r.k === range)?.l ?? "";

/** Riepilogo in testo semplice, pronto da incollare in un messaggio. */
export const summaryText = (range: Range, rows: { name: string; summary: Summary }[]): string => {
  const eur = (n: number) => `€${n.toFixed(2)}`;
  const lines = [`📊 Riepilogo — ${rangeLabel(range)}`, ""];
  rows.forEach(({ name, summary }) => {
    lines.push(`${name}`);
    INCOME_KINDS.forEach(({ k, l, icon }) => {
      const slot = summary.byKind[k];
      if (slot.count > 0) lines.push(`  ${icon} ${l}: ${eur(slot.total)} (${slot.count})`);
    });
    lines.push(`  💰 Totale entrate: ${eur(summary.totalIn)}`);
    lines.push(`  💸 Totale uscite: ${eur(summary.totalOut)}`);
    lines.push(`  📊 Saldo: ${eur(summary.balance)}`);
    lines.push("");
  });
  lines.push(`Generato il ${todayISO()}`);
  return lines.join("\n");
};
