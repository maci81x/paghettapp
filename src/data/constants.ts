import type { Activity, Badge, Category, Freq, Fund, Level, PinKey, Period, Tier, Tod } from "./types";

export const CATS: Category[] = [
  { id: "casa", n: "Casa", i: "🏠", c: "#6366f1" },
  { id: "cucina", n: "Cucina", i: "🍳", c: "#f59e0b" },
  { id: "tia", n: "Tia", i: "🐕", c: "#8b5cf6" },
  { id: "creativita", n: "Creatività", i: "🎨", c: "#ec4899" },
  { id: "relazioni", n: "Relazioni", i: "❤️", c: "#ef4444" },
  { id: "finanza", n: "Finanza", i: "💰", c: "#10b981" },
  { id: "scuola", n: "Scuola", i: "📚", c: "#3b82f6" },
  { id: "lingue", n: "Lingue", i: "🌍", c: "#14b8a6" },
  { id: "salute", n: "Salute", i: "🥗", c: "#22c55e" },
];

export const INIT_ACTS: Activity[] = [
  { id: 1, name: "Rifarsi il letto", cat: "casa", pts: 3, pen: -5, freq: "daily", max: 1, ch: 0 },
  { id: 2, name: "Preparare colazione", cat: "cucina", pts: 3, pen: -2, freq: "daily", max: 1, ch: 0 },
  { id: 3, name: "Colazione a tema", cat: "cucina", pts: 10, pen: 0, freq: "weekly", max: 1, ch: 1, chPts: 15 },
  { id: 4, name: "Faccende di casa", cat: "casa", pts: 4, pen: -5, freq: "daily", max: 1, ch: 0 },
  { id: 5, name: "Pulire le scale", cat: "casa", pts: 3, pen: -4, freq: "weekly", max: 1, ch: 1, chPts: 10 },
  { id: 6, name: "Portare fuori Tia", cat: "tia", pts: 5, pen: -3, freq: "daily", max: 3, ch: 0 },
  { id: 7, name: "Spazzatura", cat: "casa", pts: 4, pen: -3, freq: "daily", max: 1, ch: 1, chPts: 8 },
  { id: 8, name: "Lavare i piatti", cat: "cucina", pts: 3, pen: -2, freq: "daily", max: 2, ch: 0 },
  { id: 9, name: "Stendere bucato", cat: "casa", pts: 4, pen: -2, freq: "daily", max: 1, ch: 0 },
  { id: 10, name: "Aiutare a cucinare", cat: "cucina", pts: 5, pen: 0, freq: "daily", max: 1, ch: 0 },
  { id: 11, name: "Leggere 20min", cat: "scuola", pts: 8, pen: 0, freq: "daily", max: 2, ch: 0 },
  { id: 12, name: "Compiti senza aiuto", cat: "scuola", pts: 10, pen: 0, freq: "daily", max: 1, ch: 0 },
  { id: 13, name: "Parlare inglese 10min", cat: "lingue", pts: 7, pen: 0, freq: "daily", max: 2, ch: 0 },
  { id: 14, name: "Disegnare/creare", cat: "creativita", pts: 5, pen: 0, freq: "daily", max: 2, ch: 0 },
  { id: 15, name: "Aiutare sorella", cat: "relazioni", pts: 8, pen: 0, freq: "daily", max: 3, ch: 0 },
  { id: 16, name: "Risparmiare su acquisto", cat: "finanza", pts: 6, pen: 0, freq: "weekly", max: 2, ch: 0 },
  { id: 17, name: "Sport 30min", cat: "salute", pts: 7, pen: 0, freq: "daily", max: 1, ch: 0 },
  { id: 18, name: "Preparare cena", cat: "cucina", pts: 12, pen: 0, freq: "daily", max: 1, ch: 0 },
  { id: 19, name: "Frutta o verdura", cat: "salute", pts: 3, pen: 0, freq: "daily", max: 3, ch: 0 },
  { id: 20, name: "Meditazione 5min", cat: "salute", pts: 5, pen: 0, freq: "daily", max: 2, ch: 0 },
];

export const LVLS: Level[] = [
  { n: "Esploratrice", min: 0, max: 500, i: "🌱", c: "#34d399" },
  { n: "Capitana", min: 501, max: 2000, i: "⭐", c: "#fbbf24" },
  { n: "Campionessa", min: 2001, max: 5000, i: "🏆", c: "#a78bfa" },
  { n: "Leggenda", min: 5001, max: 999999, i: "👑", c: "#ec4899" },
];

export const TIERS: Tier[] = [
  { min: 0, max: 249, r: 2 },
  { min: 250, max: 349, r: 5 },
  { min: 350, max: 499, r: 10 },
  { min: 500, max: 9999, r: 15 },
];

export const getTier = (p: number): Tier => TIERS.find((t) => p >= t.min && p <= t.max) || TIERS[0];

export const getLvl = (p: number): Level => LVLS.find((l) => p >= l.min && p <= l.max) || LVLS[0];

/** Scaglione successivo di paghetta: undefined quando si è già al massimo. */
export const nextTier = (p: number): Tier | undefined => TIERS.find((t) => t.min > p);

/** Avanzamento (0-100) dentro lo scaglione attuale verso il successivo. */
export const tierProgress = (p: number): number => {
  const next = nextTier(p);
  if (!next) return 100;
  const cur = getTier(p);
  const span = next.min - cur.min;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, ((p - cur.min) / span) * 100));
};

/** Passo fra due tacche: sulla barra i tier sono equidistanti, non in scala coi punti. */
export const TIER_TICK = 100 / (TIERS.length - 1);

/** Posizione 0-100 sull'intera barra tier: tacche superate + avanzamento nel tier corrente. */
export const tierPos = (p: number): number =>
  Math.min(100, Math.max(0, (TIERS.indexOf(getTier(p)) + tierProgress(p) / 100) * TIER_TICK));

/** PIN di default: sovrascritti da quelli salvati in localStorage. */
export const DEFAULT_PINS: Record<PinKey, string> = { mia: "2806", samira: "0811", admin: "0000" };

export const AVATARS = [
  "👧🏻", "👧🏽", "👩🏻", "👩🏽", "🧑🏻", "🧑🏽", "👸🏻", "👸🏽",
  "🦸🏻‍♀️", "🦸🏽‍♀️", "🧚🏻‍♀️", "🧚🏽‍♀️", "🐱", "🦊", "🐼", "🦋",
  "🌸", "⭐", "🎀", "🌈", "🦄", "🐉", "🌺", "💎",
];

export const TODS: { k: Tod; l: string }[] = [
  { k: "mattina", l: "☀️ Mattina" },
  { k: "pomeriggio", l: "🌤 Pomeriggio" },
  { k: "sera", l: "🌙 Sera" },
];

/** Momento della giornata dedotto dall'orario. */
export const nowTod = (): Tod => {
  const h = new Date().getHours();
  return h < 12 ? "mattina" : h < 18 ? "pomeriggio" : "sera";
};

/** actId riservato ai punti bonus assegnati a mano dall'admin. */
export const BONUS_ACT = -1;

/** actId riservato ai punti tolti a mano dall'admin. */
export const DEDUCT_ACT = -2;

/** Etichetta delle voci di storico senza attività collegata. */
export const MANUAL_ACT_LABEL: Record<number, string> = {
  [BONUS_ACT]: "🎁 Bonus",
  [DEDUCT_ACT]: "➖ Punti tolti",
};

/** Parola usata per il periodo in cui vale il limite di completamenti. */
export const PERIOD_WORD: Record<Freq, string> = {
  daily: "oggi",
  weekly: "questa settimana",
  monthly: "questo mese",
};

/** Etichette del limite di completamenti, per frequenza. */
export const MAX_LABEL: Record<Freq, string> = {
  daily: "Quante volte al giorno (max)",
  weekly: "Quante volte a settimana (max)",
  monthly: "Quante volte al mese (max)",
};

export const FREQ_UNIT: Record<Freq, string> = { daily: "giorno", weekly: "settimana", monthly: "mese" };

/** Split fisso della paghetta. */
export const SPLIT: Record<Fund, number> = { risparmio: 0.3, personale: 0.6, beneficenza: 0.1 };

export const FUND_LABEL: Record<Fund, string> = {
  risparmio: "🏦 Risparmio",
  personale: "🎒 Personale",
  beneficenza: "🤝 Beneficenza",
};

export const FUNDS: Fund[] = ["risparmio", "personale", "beneficenza"];

/**
 * Divide un importo secondo le frazioni indicate (0-1).
 * Risparmio e beneficenza sono arrotondati al centesimo, il resto va al personale:
 * così la somma delle tre quote è sempre esattamente l'importo di partenza.
 */
export const splitAmount = (amount: number, frac: Record<Fund, number>): Record<Fund, number> => {
  const risparmio = Math.round(amount * frac.risparmio * 100) / 100;
  const beneficenza = Math.round(amount * frac.beneficenza * 100) / 100;
  const personale = Math.round((amount - risparmio - beneficenza) * 100) / 100;
  return { risparmio, personale, beneficenza };
};

/** Divide la paghetta secondo lo split fisso 30/60/10. */
export const splitAllowance = (amount: number): Record<Fund, number> => splitAmount(amount, SPLIT);

/** Percentuali (0-100) → quote in euro. */
export const splitByPct = (amount: number, pct: Record<Fund, number>): Record<Fund, number> =>
  splitAmount(amount, { risparmio: pct.risparmio / 100, personale: pct.personale / 100, beneficenza: pct.beneficenza / 100 });

/** Split di default per un'entrata extra, in percentuale. */
export const DEFAULT_PCT: Record<Fund, number> = { risparmio: 30, personale: 60, beneficenza: 10 };

/** Giorni coperti da ogni periodo (usato dai grafici). */
export const PERIOD_DAYS: Record<Period, number> = { "7g": 7, "30g": 30, "3m": 90, "1a": 365 };
/** Mesi equivalenti (usato per il rendimento stimato). */
export const PERIOD_MONTHS: Record<Period, number> = { "7g": 0.25, "30g": 1, "3m": 3, "1a": 12 };

/** Rendimento medio storico S&P 500. */
export const YIELD_YEAR = 0.1;

export const USER_IDS = ["mia", "samira"] as const;

/** Badge sbloccabili: la logica di sblocco vive in `data/badges.ts`. */
export const BADGES: Badge[] = [
  { id: "first_15", n: "Prima settimana €15", i: "🥇", hint: "Arriva a 500 punti in una settimana" },
  { id: "streak_10", n: "10 giorni di streak", i: "🔥", hint: "Segna attività per 10 giorni di fila" },
  { id: "streak_30", n: "Mese di fuoco", i: "🌋", hint: "Arriva a 30 giorni di streak" },
  { id: "first_invest", n: "Primo investimento", i: "📈", hint: "Configura un investimento nella tab Investi" },
  { id: "saver_100", n: "€100 risparmiati", i: "🏦", hint: "Porta il salvadanaio Risparmio a €100" },
  { id: "pts_100_day", n: "Giornata record", i: "⚡", hint: "Fai 100 punti approvati in un solo giorno" },
  { id: "wish_bought", n: "Desiderio realizzato", i: "🎁", hint: "Compra il primo desiderio della lista" },
  { id: "all_activities", n: "Tuttofare", i: "🧹", hint: "Fai tutte le attività almeno una volta in un giorno" },
];

/** Data in formato ISO ma sul fuso locale: toISOString() userebbe UTC e in Italia sfasa il giorno. */
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayISO = () => isoDate(new Date());

/** Giorni che mancano alla data ISO indicata: negativo se è già passata. */
export const daysLeft = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((target - start) / 86400000);
};

/** Mese ISO (YYYY-MM) spostato di `back` mesi rispetto a oggi. */
export const monthKey = (back = 0) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - back);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Lunedì della settimana che contiene la data indicata, in formato ISO. */
export const weekStartOf = (date: Date) => {
  const d = new Date(date);
  const dow = d.getDay(); // 0 = domenica
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return isoDate(d);
};

/** Lunedì della settimana corrente, in formato ISO. */
export const getWeekStart = () => weekStartOf(new Date());

/**
 * Primo giorno del periodo in cui vale il limite di completamenti.
 * Un'attività settimanale con max 1 va segnata una volta a settimana, non una
 * volta al giorno: il conteggio parte da qui.
 */
export const periodStart = (freq: Freq) => {
  if (freq === "weekly") return getWeekStart();
  if (freq === "monthly") return `${monthKey(0)}-01`;
  return todayISO();
};

/** Proiezione investimento: capitale iniziale + versamento mensile, 10%/anno. */
export const mkInv = (amt: number, mo: number, ex: number) => {
  const r = YIELD_YEAR / 12;
  const rows: { m: string; investito: number; guadagno: number; totale: number }[] = [];
  let inv = 0;
  let tot = 0;
  for (let m = 1; m <= mo; m++) {
    inv += m === 1 ? amt : ex;
    tot = m === 1 ? amt * (1 + r) : (tot + ex) * (1 + r);
    rows.push({
      m: `M${m}`,
      investito: +inv.toFixed(2),
      guadagno: +(tot - inv).toFixed(2),
      totale: +tot.toFixed(2),
    });
  }
  return rows;
};
