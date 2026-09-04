import { isoDate } from "./constants.ts";

/**
 * Lunedì 00:00 e domenica 23:59:59.999 della settimana che contiene `today`.
 *
 * La settimana della paghetta va da lunedì a domenica: `getDay()` da solo
 * partirebbe da domenica, quindi la domenica va riportata indietro di sei
 * giorni e non lasciata a inizio settimana.
 */
export const getWeekBounds = (today: Date): { start: Date; end: Date } => {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dow = start.getDay(); // 0 = domenica
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  return { start, end };
};

/** Gli stessi estremi in formato ISO: i log conservano la data come stringa, non come Date. */
export const weekRange = (today: Date) => {
  const { start, end } = getWeekBounds(today);
  return { from: isoDate(start), to: isoDate(end) };
};

/** Data locale a mezzogiorno da una stringa ISO: a mezzanotte un fuso negativo sposterebbe il giorno. */
export const fromISO = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
};

/** Lunedì della settimana precedente a quella di `today`, in formato ISO. */
export const prevWeekStart = (today: Date = new Date()): string => {
  const { start } = getWeekBounds(today);
  start.setDate(start.getDate() - 7);
  return isoDate(start);
};

/** Il minimo che serve per pesare una voce di storico dentro una settimana. */
export interface WeekLog {
  /** Giorno in cui l'attività è stata fatta, non quello dell'approvazione. */
  date: string;
  pts: number;
  ok: boolean;
}

/**
 * Punti della settimana che contiene `today`.
 *
 * Contano i log approvati la cui *data dell'attività* cade fra lunedì e
 * domenica, non l'istante in cui l'admin li ha approvati: un'attività di
 * martedì approvata mercoledì resta nella settimana di martedì, e una della
 * settimana scorsa approvata oggi non entra in quella corrente.
 */
export const getWeekPts = (logs: WeekLog[], today: Date = new Date()): number => {
  const { from, to } = weekRange(today);
  return logs.filter((l) => l.ok && l.date >= from && l.date <= to).reduce((s, l) => s + l.pts, 0);
};

/** Le voci di una settimana: usato dalla paghetta per marcare come pagate solo quelle giuste. */
export const weekLogs = <T extends WeekLog>(logs: T[], today: Date = new Date()): T[] => {
  const { from, to } = weekRange(today);
  return logs.filter((l) => l.date >= from && l.date <= to);
};

/** Domenica della settimana che comincia il lunedì `week`, in formato ISO. */
export const weekEnd = (week: string): string => isoDate(getWeekBounds(fromISO(week)).end);

/**
 * La settimana è finita? La paghetta si registra solo su settimane concluse:
 * pagare il martedì la settimana in corso userebbe i punti di due giorni e
 * chiuderebbe la settimana a metà, senza poterla più ripagare.
 */
export const isWeekOver = (week: string, today: Date = new Date()): boolean => isoDate(today) > weekEnd(week);

/** Etichetta leggibile di una settimana: "25/08 – 31/08". */
export const weekLabel = (week: string): string => {
  const day = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
  return `${day(week)} – ${day(weekEnd(week))}`;
};

/**
 * Le ultime `count` settimane già concluse, dalla più recente.
 * La settimana in corso non c'è: non è ancora pagabile.
 */
export const pastWeeks = (count: number, today: Date = new Date()): string[] => {
  const out: string[] = [];
  const d = getWeekBounds(today).start;
  for (let i = 0; i < count; i++) {
    d.setDate(d.getDate() - 7);
    out.push(isoDate(d));
  }
  return out;
};
