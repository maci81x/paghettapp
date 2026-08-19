// estensione esplicita: così `node --test` esegue i test senza bundler
import { FUNDS, SPLIT, monthKey, splitByPct } from "./constants.ts";
import type { Fund, IncomeEntry, Mission, User } from "./types";

/**
 * Progresso di una missione: se è collegata ad attività lo ricavo dai
 * completamenti approvati dalla creazione in poi, così un log rifiutato o
 * cancellato non lascia progresso fantasma. Senza collegamenti resta il
 * contatore manuale.
 */
export const missionProg = (u: User, m: Mission) => {
  const ids = m.actIds ?? [];
  if (ids.length === 0) return m.prog;
  const since = m.since ?? "";
  return u.log.filter((l) => l.ok && ids.includes(l.actId) && l.date >= since).reduce((s, l) => s + l.cnt, 0);
};

/**
 * Storico entrate normalizzato: le paghette accreditate prima dell'arrivo di
 * `income` vivono solo in `pays`, qui le riporto nello stesso formato.
 */
export const allIncome = (u: User): IncomeEntry[] => {
  const income = u.income ?? [];
  const known = new Set(income.map((i) => i.id));
  const legacy: IncomeEntry[] = (u.pays ?? [])
    .filter((p) => !known.has(p.id))
    .map((p) => ({
      id: p.id,
      date: p.date,
      amount: p.amount,
      source: "Paghetta settimanale",
      split: { risparmio: SPLIT.risparmio * 100, personale: SPLIT.personale * 100, beneficenza: SPLIT.beneficenza * 100 },
      type: "paghetta" as const,
    }));
  return [...income, ...legacy].sort((a, b) => (a.date < b.date ? 1 : -1));
};

/** Le spese sono salvate come "gg/mm": le riporto all'anno corrente per confrontarle. */
const spesaMonth = (d: string) => {
  const [, mm] = d.split("/");
  return `${new Date().getFullYear()}-${mm}`;
};

export interface MonthReport {
  month: string;
  earned: number;
  spent: number;
  net: number;
  byFund: Record<Fund, number>;
}

/** Conto del mese: `back` = 0 mese corrente, 1 mese precedente. */
export const monthReport = (u: User, back = 0): MonthReport => {
  const month = monthKey(back);
  const entries = allIncome(u).filter((i) => i.date.startsWith(month));
  const earned = +entries.reduce((s, i) => s + i.amount, 0).toFixed(2);
  const spent = +u.spese.filter((s) => spesaMonth(s.d) === month).reduce((s, x) => s + x.a, 0).toFixed(2);
  const byFund = { risparmio: 0, personale: 0, beneficenza: 0 };
  entries.forEach((i) => {
    const q = splitByPct(i.amount, i.split);
    FUNDS.forEach((k) => {
      byFund[k] = +(byFund[k] + q[k]).toFixed(2);
    });
  });
  return { month, earned, spent, net: +(earned - spent).toFixed(2), byFund };
};

/** Variazione percentuale rispetto al mese scorso: null se non c'è storico. */
export const trendPct = (now: number, prev: number) => (prev > 0 ? Math.round(((now - prev) / prev) * 100) : null);

/** Media mensile delle sole paghette sugli ultimi `months` mesi. */
export const monthlyAllowanceAvg = (u: User, months = 3) => {
  const from = monthKey(months - 1);
  const rows = allIncome(u).filter((i) => i.type === "paghetta" && i.date.slice(0, 7) >= from);
  return +(rows.reduce((s, i) => s + i.amount, 0) / months).toFixed(2);
};

/** Media settimanale guadagnata, usata per stimare quanto manca a un desiderio. */
export const weeklyAvg = (u: User) => {
  const entries = allIncome(u);
  if (entries.length === 0) return 0;
  const first = entries[entries.length - 1].date;
  const days = Math.max(7, Math.round((Date.now() - new Date(first).getTime()) / 86400000) + 1);
  const total = entries.reduce((s, i) => s + i.amount, 0);
  return +((total / days) * 7).toFixed(2);
};
