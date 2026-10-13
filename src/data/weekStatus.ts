import type { Payment } from "./types";
import { isWeekOver } from "./weekBounds.ts";

/**
 * Stato di una settimana dal punto di vista della paghetta:
 *   in_corso      → la settimana corrente, non ancora chiudibile;
 *   da_confermare → finita, importo calcolato dal tier, in attesa dell'admin;
 *   confermata    → l'admin ha confermato l'importo del tier;
 *   modificata    → l'admin ha cambiato l'importo prima di confermare.
 *
 * Non c'è un'approvazione automatica: una settimana resta da confermare
 * finché l'admin non la chiude.
 */
export type WeekStatus = "in_corso" | "da_confermare" | "confermata" | "modificata";

export const weekStatus = (week: string, pay: Payment | undefined, today: Date = new Date()): WeekStatus => {
  if (pay) return pay.tier !== undefined && Math.abs(pay.tier - pay.amount) > 0.004 ? "modificata" : "confermata";
  return isWeekOver(week, today) ? "da_confermare" : "in_corso";
};

export const WEEK_STATUS_LABEL: Record<WeekStatus, string> = {
  in_corso: "⏳ In corso",
  da_confermare: "🟠 Da confermare",
  confermata: "✅ Confermata",
  modificata: "✏️ Modificata",
};
