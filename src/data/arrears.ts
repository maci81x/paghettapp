import { getTier, weekStartOf } from "./constants.ts";
import type { LogEntry } from "./types";
import { fromISO, isWeekOver } from "./weekBounds.ts";

/** Il minimo di una voce di storico che serve per capire se una settimana va pagata. */
export type ArrearsLog = Pick<LogEntry, "date" | "pts" | "ok" | "paid" | "rejected" | "revoked">;

/** In attesa dell'admin: né approvata, né rifiutata, né annullata. */
export const isWaiting = (l: ArrearsLog) => !l.ok && !l.rejected && !l.revoked;

/**
 * Settimane concluse, mai saldate, in cui la ragazza ha fatto qualcosa: almeno
 * una voce approvata e non ancora pagata, o una ancora da approvare.
 *
 * Regola decisa a novembre 2026: una settimana senza nessuna attività non si
 * paga. Prima valeva €2 anche a zero punti (fascia minima), e otto settimane
 * vuote facevano €16 per niente. Una settimana con le sole voci rifiutate o
 * annullate conta come vuota. Dalla più recente.
 */
export const weeksWithActivityToClose = (logs: ArrearsLog[], paidWeeks: Set<string>, today: Date = new Date()): string[] => {
  const weeks = new Set<string>();
  logs.forEach((l) => {
    if ((l.ok && !l.paid) || isWaiting(l)) weeks.add(weekStartOf(fromISO(l.date)));
  });
  return [...weeks].filter((w) => isWeekOver(w, today) && !paidWeeks.has(w)).sort((a, b) => b.localeCompare(a));
};

export interface ArrearsWeek {
  week: string;
  /** Punti approvati: decidono l'importo. */
  pts: number;
  /** Punti ancora da approvare in quella settimana. */
  waitingPts: number;
  waiting: number;
  amount: number;
}

export interface Arrears {
  weeks: ArrearsWeek[];
  amount: number;
  /** Voci da approvare dentro le settimane arretrate. */
  waiting: number;
}

/**
 * Quanto spetta, settimana per settimana, con le regole della paghetta: la
 * fascia si calcola sui soli punti approvati, come al momento di pagare.
 */
export const arrearsOf = (logs: ArrearsLog[], paidWeeks: Set<string>, today: Date = new Date()): Arrears => {
  const weeks = weeksWithActivityToClose(logs, paidWeeks, today).map((week) => {
    const inWeek = logs.filter((l) => weekStartOf(fromISO(l.date)) === week);
    const pts = inWeek.filter((l) => l.ok).reduce((s, l) => s + l.pts, 0);
    const waitingLogs = inWeek.filter(isWaiting);
    return {
      week,
      pts,
      waitingPts: waitingLogs.reduce((s, l) => s + l.pts, 0),
      waiting: waitingLogs.length,
      amount: getTier(pts).r,
    };
  });
  return {
    weeks,
    amount: Math.round(weeks.reduce((s, w) => s + w.amount, 0) * 100) / 100,
    waiting: weeks.reduce((s, w) => s + w.waiting, 0),
  };
};

/** Il promemoria "Ricordalo a papà" si può mandare una volta ogni 7 giorni. */
export const NUDGE_EVERY_DAYS = 7;

export const canNudge = (lastNudge: string | null | undefined, now: Date = new Date()): boolean => {
  if (!lastNudge) return true;
  const last = new Date(lastNudge).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= NUDGE_EVERY_DAYS * 24 * 60 * 60 * 1000;
};
