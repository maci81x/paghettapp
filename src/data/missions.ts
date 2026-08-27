// estensione esplicita: così `node --test` esegue i test senza bundler
import { USER_IDS, daysLeft } from "./constants.ts";
import type { Mission, User, UserId, Users } from "./types";

/**
 * Completamenti che una singola ragazza ha messo a segno per la missione.
 * Se ci sono attività collegate si contano i log approvati dalla creazione in
 * poi — così un log rifiutato o annullato non lascia progresso fantasma —
 * altrimenti vale il contatore che l'admin avanza a mano.
 */
export const ownProgress = (u: User, m: Mission, uid: UserId): number => {
  const ids = m.actIds ?? [];
  if (ids.length === 0) return m.progBy?.[uid] ?? m.prog ?? 0;
  const since = m.since ?? "";
  return u.log.filter((l) => l.ok && !l.revoked && ids.includes(l.actId) && l.date >= since).reduce((s, l) => s + l.cnt, 0);
};

/** Le ragazze a cui la missione è assegnata. */
/**
 * Missioni mostrate alle ragazze: le nascoste restano in `u.miss` — l'admin le
 * vede e il progresso non si perde — ma spariscono da qui.
 */
export const visibleMissions = (u: User): Mission[] => u.miss.filter((m) => !m.hidden);

export const assignees = (m: Mission): UserId[] => (m.assignee === "both" ? [...USER_IDS] : [m.assignee]);

export interface MissionProgress {
  /** Quanto ha fatto chi sta guardando. */
  own: number;
  /** Contributo di ciascuna assegnataria. */
  byUser: Partial<Record<UserId, number>>;
  /**
   * Il numero che conta verso l'obiettivo: la somma di tutte nelle missioni di
   * squadra, il solo contributo personale in quelle individuali.
   */
  current: number;
  pct: number;
  done: boolean;
}

/**
 * In squadra si arriva all'obiettivo insieme, quindi i contributi si sommano
 * e il traguardo è comune. Da sole, ognuna corre verso il proprio.
 */
export const missionProgress = (users: Users, m: Mission, uid: UserId): MissionProgress => {
  const byUser: Partial<Record<UserId, number>> = {};
  assignees(m).forEach((who) => {
    byUser[who] = ownProgress(users[who], m, who);
  });
  const own = byUser[uid] ?? 0;
  const current = m.team ? Object.values(byUser).reduce<number>((s, n) => s + (n ?? 0), 0) : own;
  const tgt = Math.max(1, m.tgt);
  return { own, byUser, current, pct: Math.min(100, (current / tgt) * 100), done: current >= tgt };
};

export type MissionState = "done" | "expired" | "active";

/** Completata batte scaduta: se il traguardo è stato tagliato, la scadenza non conta più. */
export const missionState = (m: Mission, done: boolean, today = new Date()): MissionState => {
  if (done) return "done";
  if (m.deadline && daysLeft(m.deadline, today) < 0) return "expired";
  return "active";
};

const ORDER: Record<MissionState, number> = { active: 0, done: 1, expired: 2 };

/** Prima quelle da fare, poi le completate, in fondo le scadute. */
export const byState = (a: { state: MissionState; m: Mission }, b: { state: MissionState; m: Mission }) =>
  ORDER[a.state] - ORDER[b.state] || b.m.id - a.m.id;

/**
 * Chi ha diritto ai punti e non li ha ancora ricevuti. In squadra il traguardo
 * è comune, quindi premia tutte le assegnatarie; da sole, solo chi ha
 * raggiunto il proprio obiettivo. `completedBy` impedisce il secondo premio.
 */
export const toAward = (users: Users, m: Mission): UserId[] => {
  const already = m.completedBy ?? {};
  return assignees(m).filter((uid) => {
    if (already[uid]) return false;
    const { done } = missionProgress(users, m, uid);
    return done;
  });
};
