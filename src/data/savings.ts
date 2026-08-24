// estensione esplicita: così `node --test` esegue i test senza bundler
import { isoDate, splitByPct } from "./constants.ts";
import { allIncome } from "./report.ts";
import type { SavingsMove, User } from "./types";

/** Le spese sono salvate come "gg/mm": le riporto all'anno corrente. */
const spesaISO = (d: string) => {
  const [dd, mm] = d.split("/");
  if (!dd || !mm) return isoDate(new Date());
  return `${new Date().getFullYear()}-${mm}-${dd}`;
};

/** Un movimento sotto il centesimo non sposta nulla: lo tengo fuori dal grafico. */
const isReal = (m: SavingsMove) => Math.abs(m.delta) >= 0.01;

/**
 * Movimenti del salvadanaio Risparmio ricostruiti dai dati già in memoria:
 * quote versate dalle entrate e spese pagate dal risparmio. È la sorgente di
 * riserva quando il database non risponde (`api.fetchSavingsHistory`).
 */
export const movesFromUser = (u: User): SavingsMove[] => {
  const versamenti: SavingsMove[] = allIncome(u).map((i) => ({
    date: i.date,
    delta: splitByPct(i.amount, i.split).risparmio,
    label: i.source,
  }));
  const prelievi: SavingsMove[] = u.spese
    .filter((s) => s.f === "risparmio")
    .map((s) => ({ date: spesaISO(s.d), delta: -s.a, label: s.ds }));
  return [...versamenti, ...prelievi].filter(isReal).sort((a, b) => a.date.localeCompare(b.date));
};

export interface SavingsPoint {
  iso: string;
  /** Etichetta gg/mm mostrata sull'asse X. */
  d: string;
  saldo: number;
}

/**
 * Andamento del saldo negli ultimi `days` giorni.
 * Il saldo di un giorno si ricava all'indietro dal saldo attuale togliendo i
 * movimenti successivi: è l'unico modo di avere una storia senza uno storico
 * dei saldi sul database.
 */
export const savingsSeries = (moves: SavingsMove[], current: number, days = 90, points = 13): SavingsPoint[] => {
  const step = Math.max(1, Math.round(days / Math.max(1, points - 1)));
  const out: SavingsPoint[] = [];
  for (let k = points - 1; k >= 0; k--) {
    const day = new Date();
    day.setDate(day.getDate() - k * step);
    const iso = isoDate(day);
    const after = moves.filter((m) => m.date > iso).reduce((s, m) => s + m.delta, 0);
    out.push({
      iso,
      d: `${day.getDate()}/${day.getMonth() + 1}`,
      saldo: +Math.max(0, current - after).toFixed(2),
    });
  }
  return out;
};

export type SavingsTrend = "up" | "flat" | "down";

export interface SavingsSummary {
  /** Saldo di oggi. */
  current: number;
  /** Somma di tutte le quote versate nel risparmio. */
  contributed: number;
  /** Somma dei prelievi fatti dal risparmio. */
  withdrawn: number;
  /** Differenza fra il saldo e quanto è stato messo dentro al netto dei prelievi. */
  growth: number;
  trend: SavingsTrend;
  /** Prossimo traguardo a scatti di €100. */
  goal: number;
  /** Quanto manca al traguardo. */
  toGoal: number;
}

/** Traguardo successivo del risparmio, a scatti di €100. */
export const nextMilestone = (v: number) => Math.max(100, Math.ceil((v + 0.01) / 100) * 100);

export const savingsSummary = (moves: SavingsMove[], current: number, series: SavingsPoint[]): SavingsSummary => {
  const contributed = +moves.filter((m) => m.delta > 0).reduce((s, m) => s + m.delta, 0).toFixed(2);
  const withdrawn = +moves.filter((m) => m.delta < 0).reduce((s, m) => s - m.delta, 0).toFixed(2);
  const growth = +(current - contributed + withdrawn).toFixed(2);

  const first = series[0]?.saldo ?? current;
  const last = series[series.length - 1]?.saldo ?? current;
  const delta = last - first;
  const trend: SavingsTrend = delta > 0.01 ? "up" : delta < -0.01 ? "down" : "flat";

  const goal = nextMilestone(current);
  return { current, contributed, withdrawn, growth, trend, goal, toGoal: +(goal - current).toFixed(2) };
};

/** Messaggio mostrato alle ragazze, scelto in base all'andamento. */
export const TREND_MESSAGE: Record<SavingsTrend, string> = {
  up: "📈 Stai andando alla grande! I tuoi risparmi crescono ogni settimana",
  flat: "💪 Continua così! Ogni euro risparmiato conta",
  down: "💡 Hai fatto qualche prelievo — prova a lasciare i risparmi per farli crescere!",
};
