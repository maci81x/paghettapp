import type { PostgrestError } from "@supabase/supabase-js";
import { isoDate, nowTod } from "./constants.ts";
import { MONTH_RATE, monthlyInterest, pendingPeriods } from "./interest.ts";
import { supabase } from "./supabase.ts";
import type { Activity, Fund, InterestLog, InvestCfg, LogEntry, Mission, SavingsMove, Tod, UserId, Wish } from "./types";

/* ══════════════════════════════════════════════════════════════
   Traduzione fra i nomi del database (inglese) e quelli dell'app
   ══════════════════════════════════════════════════════════════ */

export type DbFund = "personal" | "savings" | "charity";
export type DbTod = "morning" | "afternoon" | "evening";

export const FUND_DB: Record<Fund, DbFund> = { personale: "personal", risparmio: "savings", beneficenza: "charity" };
export const DB_FUND: Record<DbFund, Fund> = { personal: "personale", savings: "risparmio", charity: "beneficenza" };
const TOD_DB: Record<Tod, DbTod> = { mattina: "morning", pomeriggio: "afternoon", sera: "evening" };
const DB_TOD: Record<DbTod, Tod> = { morning: "mattina", afternoon: "pomeriggio", evening: "sera" };

/* ── righe del database ── */

export interface UserRow {
  id: string;
  name: string;
  /** Sparisce con la migrazione dei PIN: da lì in poi vive solo in `user_pins`. */
  pin?: string;
  avatar: string;
  color: string;
  grad: string;
  total_pts: number;
  streak: number;
  last_active: string | null;
  profile_photo: string | null;
  nickname: string | null;
  theme_colors: { from: string; to: string } | null;
  bg_pattern: string | null;
}

export interface PiggyRow {
  id: number;
  user_id: string;
  type: DbFund;
  balance: number;
  note?: string | null;
  /** Aggiunta dalla migrazione `piggybanks_nickname`: assente finché non è applicata. */
  nickname?: string | null;
}

export interface ActRow {
  id: number;
  name: string;
  description: string | null;
  emoji: string;
  category: string;
  points: number;
  frequency: Activity["freq"];
  max_completions: number;
  duration: number | null;
  visible_to: string[];
  active: boolean;
  penalty?: number | null;
  challenge?: boolean | null;
  challenge_points?: number | null;
}

export interface LogRow {
  id: number;
  user_id: string;
  activity_id: number | null;
  points: number;
  times: number;
  moment: DbTod;
  note: string | null;
  approved: boolean;
  paid: boolean;
  created_at: string;
  /** Aggiunte dalla migrazione `activity_logs_kind_revoked`: assenti finché non è applicata. */
  entry_kind?: LogKind | null;
  revoked?: boolean | null;
}

/** Natura di una voce senza attività collegata. */
export type LogKind = "bonus" | "deduct";

export interface MissionRow {
  id: number;
  name: string;
  description: string | null;
  emoji: string;
  points: number;
  deadline: string | null;
  assigned_to: string[];
  linked_activities: number[];
  progress: Record<string, number> | null;
  target: number;
  active: boolean;
  team?: boolean | null;
  since?: string | null;
  /** Aggiunta dalla migrazione `missions_completed_by`: assente finché non è applicata. */
  completed_by?: Record<string, string> | null;
}

export interface IncomeRow {
  id: number;
  user_id: string;
  type: "allowance" | "extra" | "bonus" | "gift";
  amount: number;
  tier: number | null;
  week_pts: number | null;
  note: string | null;
  /** Quote in euro, non percentuali. */
  split_personal: number | null;
  split_savings: number | null;
  split_charity: number | null;
  created_at: string;
  /** Aggiunte dalla migrazione `income_confirmed`: assenti finché non è applicata. */
  confirmed?: boolean | null;
  confirmed_at?: string | null;
}

export interface ExpenseRow {
  id: number;
  user_id: string;
  amount: number;
  description: string;
  piggybank_type: DbFund;
  created_at: string;
}

export interface WishRow {
  id: number;
  user_id: string;
  name: string;
  cost: number;
  /** Quanto già messo da parte per questo desiderio (colonna numerica). */
  fund: number;
  priority: number;
  bought: boolean;
  created_at: string;
  piggybank_type?: string | null;
}

export interface BadgeRow {
  id: number;
  user_id: string;
  badge_key: string;
  unlocked_at: string;
}

export interface InvRow {
  id: number;
  user_id: string;
  principal: number;
  monthly_add: number;
  rate: number;
  start_date: string;
  lock_months: number;
}

/* ── conversioni riga → modello dell'app ── */

export const toActivity = (r: ActRow): Activity => ({
  id: r.id,
  name: r.name,
  emoji: r.emoji || undefined,
  cat: r.category,
  pts: r.points,
  pen: r.penalty ?? 0,
  freq: r.frequency,
  max: r.max_completions,
  ch: r.challenge ? 1 : 0,
  chPts: r.challenge_points ?? 0,
  duration: r.duration ?? undefined,
});

/**
 * Bonus o penalità? Con la colonna `entry_kind` è scritto; senza, l'unico
 * indizio è il segno dei punti (un bonus negativo finisce fra le penalità).
 */
export const logKind = (r: LogRow): LogKind => r.entry_kind ?? (r.points < 0 ? "deduct" : "bonus");

export const toLog = (r: LogRow): LogEntry => ({
  id: r.id,
  actId: r.activity_id ?? (logKind(r) === "deduct" ? DEDUCT_ACT_ID : BONUS_ACT_ID),
  date: isoDate(new Date(r.created_at)),
  cnt: r.times,
  note: r.note ?? "",
  tod: DB_TOD[r.moment] ?? "mattina",
  pts: r.points,
  ok: r.approved,
  paid: r.paid,
  revoked: !!r.revoked,
});

export const toMission = (r: MissionRow, uid: UserId): Mission => ({
  id: r.id,
  name: r.name,
  emoji: r.emoji || "🎯",
  desc: r.description ?? "",
  prog: r.progress?.[uid] ?? 0,
  tgt: r.target,
  pts: r.points,
  team: !!r.team,
  deadline: r.deadline ?? "",
  assignee: r.assigned_to.length > 1 ? "both" : ((r.assigned_to[0] as UserId) ?? "mia"),
  actIds: r.linked_activities ?? [],
  since: r.since ?? "",
  progBy: (r.progress ?? {}) as Mission["progBy"],
  completedBy: (r.completed_by ?? {}) as Mission["completedBy"],
});

export const toWish = (r: WishRow): Wish => ({
  id: r.id,
  name: r.name,
  cost: Number(r.cost),
  fund: DB_FUND[(r.piggybank_type as DbFund) ?? "personal"] ?? "personale",
  priority: (r.priority === 1 || r.priority === 3 ? r.priority : 2) as 1 | 2 | 3,
  done: r.bought,
});

export const toInvest = (r?: InvRow): InvestCfg => ({
  amt: r ? Number(r.principal) : 0,
  mo: r ? r.lock_months : 12,
  ex: r ? Number(r.monthly_add) : 5,
});

/** L'app usa questo id fittizio per i punti bonus; nel database la colonna resta NULL. */
export const BONUS_ACT_ID = -1;

/** Come sopra, per i punti tolti a mano dall'admin. */
export const DEDUCT_ACT_ID = -2;

/* ══════════════════════════════════════════════════════════════
   Chiamate
   ══════════════════════════════════════════════════════════════ */

export interface Result<T> {
  data: T | null;
  error: string | null;
}

const wrap = async <T>(p: PromiseLike<{ data: T | null; error: PostgrestError | null }>): Promise<Result<T>> => {
  try {
    const { data, error } = await p;
    return error ? { data: null, error: error.message } : { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : String(e) };
  }
};

/**
 * Le colonne aggiunte dalla migrazione dell'app (penalità, sfide, squadra,
 * note dei salvadanai, salvadanaio del desiderio) potrebbero non esserci
 * ancora: le rilevo una volta e, se mancano, le lascio fuori dalle scritture.
 */
export const schema = { extended: false, incomeConfirm: false, logExtras: false, piggyName: false, missionDone: false, interest: false };

export const probeSchema = async () => {
  const { error } = await supabase.from("activities").select("penalty").limit(1);
  schema.extended = !error;
  return schema.extended;
};

/** La conferma di ricezione arriva con una migrazione a parte: la rilevo da sola. */
export const probeIncomeConfirm = async () => {
  const { error } = await supabase.from("income").select("confirmed").limit(1);
  schema.incomeConfirm = !error;
  return schema.incomeConfirm;
};

/**
 * Il nome dei salvadanai vive in `piggybanks.nickname`. Senza quella colonna
 * i nomi non sono salvabili: l'app non li chiede e usa le etichette generiche,
 * invece di bloccare la ragazza davanti a un modale che non può funzionare.
 */
export const probePiggyName = async () => {
  const { error } = await supabase.from("piggybanks").select("nickname").limit(1);
  schema.piggyName = !error;
  return schema.piggyName;
};

/**
 * `missions.completed_by` è la guardia contro il doppio premio. Senza quella
 * colonna i punti non vengono assegnati in automatico: premiare senza poterlo
 * ricordare significherebbe premiare di nuovo al prossimo caricamento.
 */
export const probeMissionDone = async () => {
  const { error } = await supabase.from("missions").select("completed_by").limit(1);
  schema.missionDone = !error;
  return schema.missionDone;
};

/**
 * Gli interessi si accreditano solo se esiste `interest_log`: è quella tabella,
 * col suo vincolo UNIQUE, a impedire che lo stesso mese venga pagato due volte.
 * Senza, l'app resta alle sole proiezioni.
 */
export const probeInterest = async () => {
  const { error } = await supabase.from("interest_log").select("id").limit(1);
  schema.interest = !error;
  return schema.interest;
};

/** Idem per le colonne dello storico dei punti (`entry_kind`, `revoked`). */
export const probeLogExtras = async () => {
  const { error } = await supabase.from("activity_logs").select("entry_kind").limit(1);
  schema.logExtras = !error;
  return schema.logExtras;
};

/** Toglie dal payload le colonne indicate quando `when` è vero. */
const stripIf = <T extends Record<string, unknown>>(when: boolean, payload: T, keys: string[]): T => {
  if (!when) return payload;
  const out = { ...payload };
  keys.forEach((k) => delete out[k]);
  return out;
};

/** Toglie dal payload le colonne che il database non ha ancora. */
const strip = <T extends Record<string, unknown>>(payload: T, extendedKeys: string[]): T => stripIf(!schema.extended, payload, extendedKeys);

/* ── utenti ── */

export const fetchUsers = () => wrap<UserRow[]>(supabase.from("users").select("*"));

export const fetchUser = (id: string) => wrap<UserRow>(supabase.from("users").select("*").eq("id", id).single());

export const updateUser = (id: string, fields: Partial<UserRow>) =>
  wrap<UserRow[]>(supabase.from("users").update(fields).eq("id", id).select());

/* ── PIN ──
   Dopo la migrazione i PIN non arrivano più al client: si verificano con le
   funzioni SQL. Se le funzioni non ci sono ancora, `pinRpc` resta false e
   l'app ricade sul confronto locale. */

export const schemaPins = { rpc: false };

export const probePinRpc = async () => {
  // pin vuoto: la funzione risponde false senza contare come tentativo utile
  const { error } = await supabase.rpc("check_pin", { p_user_id: "admin", p_pin: "" });
  schemaPins.rpc = !error;
  return schemaPins.rpc;
};

export const checkPin = (userId: string, pin: string) =>
  wrap<boolean>(supabase.rpc("check_pin", { p_user_id: userId, p_pin: pin }));

export const setPinRpc = (userId: string, oldPin: string, newPin: string) =>
  wrap<boolean>(supabase.rpc("set_pin", { p_user_id: userId, p_old_pin: oldPin, p_new_pin: newPin }));

export const adminSetPinRpc = (adminPin: string, userId: string, newPin: string) =>
  wrap<boolean>(supabase.rpc("admin_set_pin", { p_admin_pin: adminPin, p_user_id: userId, p_new_pin: newPin }));

/* ── attività ── */

export const fetchActivities = () => wrap<ActRow[]>(supabase.from("activities").select("*").eq("active", true).order("id"));

export const createActivity = (a: Omit<Activity, "id">) =>
  wrap<ActRow[]>(
    supabase
      .from("activities")
      .insert(
        strip(
          {
            name: a.name,
            emoji: a.emoji || "⭐",
            category: a.cat,
            points: a.pts,
            frequency: a.freq,
            max_completions: a.max,
            duration: a.duration ?? null,
            penalty: a.pen,
            challenge: !!a.ch,
            challenge_points: a.chPts ?? 0,
          },
          ["penalty", "challenge", "challenge_points"],
        ),
      )
      .select(),
  );

export const updateActivity = (id: number, a: Omit<Activity, "id">) =>
  wrap<ActRow[]>(
    supabase
      .from("activities")
      .update(
        strip(
          {
            name: a.name,
            emoji: a.emoji || "⭐",
            category: a.cat,
            points: a.pts,
            frequency: a.freq,
            max_completions: a.max,
            duration: a.duration ?? null,
            penalty: a.pen,
            challenge: !!a.ch,
            challenge_points: a.chPts ?? 0,
          },
          ["penalty", "challenge", "challenge_points"],
        ),
      )
      .eq("id", id)
      .select(),
  );

/** Soft delete: la riga resta per non rompere i log già registrati. */
export const deleteActivity = (id: number) => wrap<ActRow[]>(supabase.from("activities").update({ active: false }).eq("id", id).select());

/* ── log dei completamenti ── */

export const fetchActivityLogs = (userId?: string, options?: { since?: Date; paid?: boolean; approved?: boolean }) => {
  let q = supabase.from("activity_logs").select("*").order("created_at");
  if (userId) q = q.eq("user_id", userId);
  if (options?.since) q = q.gte("created_at", options.since.toISOString());
  if (options?.paid !== undefined) q = q.eq("paid", options.paid);
  if (options?.approved !== undefined) q = q.eq("approved", options.approved);
  return wrap<LogRow[]>(q);
};

export const createActivityLog = (d: {
  userId: string;
  actId: number | null;
  pts: number;
  cnt: number;
  tod: Tod;
  note: string;
  approved?: boolean;
  kind?: LogKind;
}) =>
  wrap<LogRow[]>(
    supabase
      .from("activity_logs")
      .insert(
        stripIf(!schema.logExtras, {
          user_id: d.userId,
          activity_id: d.actId,
          points: d.pts,
          times: d.cnt,
          moment: TOD_DB[d.tod],
          note: d.note,
          approved: d.approved ?? false,
          entry_kind: d.actId === null ? (d.kind ?? "bonus") : null,
        }, ["entry_kind"]),
      )
      .select(),
  );

export const approveLog = (logId: number) =>
  wrap<LogRow[]>(
    supabase
      .from("activity_logs")
      .update(stripIf(!schema.logExtras, { approved: true, revoked: false }, ["revoked"]))
      .eq("id", logId)
      .select(),
  );

export const rejectLog = (logId: number) => wrap<LogRow[]>(supabase.from("activity_logs").delete().eq("id", logId).select());

/** Correzione della nota da parte della ragazza, finché la voce è in attesa. */
export const updateLogNote = (logId: number, note: string) =>
  wrap<LogRow[]>(supabase.from("activity_logs").update({ note }).eq("id", logId).select());

/**
 * Riallinea `users.total_pts` alla somma dei punti approvati.
 * Il totale è un contatore incrementale: dopo un annullamento o
 * un'eliminazione va ricalcolato dai log, non aggiustato a mano.
 */
export const recalcTotalPoints = async (userId: string): Promise<Result<number>> => {
  const logs = await fetchActivityLogs(userId, { approved: true });
  if (logs.error) return { data: null, error: logs.error };
  const total = (logs.data ?? []).reduce((s, l) => s + Number(l.points), 0);
  const up = await updateUser(userId, { total_pts: total });
  return up.error ? { data: null, error: up.error } : { data: total, error: null };
};

/**
 * Annulla un'approvazione: la voce resta a storico come annullata e i punti
 * escono dal totale. Le missioni collegate si aggiornano da sole, perché il
 * loro progresso si calcola dai soli completamenti approvati.
 */
export const revokeLog = async (logId: number): Promise<Result<LogRow[]>> => {
  const res = await wrap<LogRow[]>(
    supabase
      .from("activity_logs")
      .update(stripIf(!schema.logExtras, { approved: false, revoked: true }, ["revoked"]))
      .eq("id", logId)
      .select(),
  );
  const row = res.data?.[0];
  if (row) await recalcTotalPoints(row.user_id);
  return res;
};

/** Elimina del tutto una voce sbagliata e ricalcola il totale dei punti. */
export const deleteLog = async (logId: number): Promise<Result<LogRow[]>> => {
  const res = await wrap<LogRow[]>(supabase.from("activity_logs").delete().eq("id", logId).select());
  const row = res.data?.[0];
  if (row) await recalcTotalPoints(row.user_id);
  return res;
};

/** Punti tolti a mano dall'admin: log già approvato con punti negativi. */
export const deductPoints = (userId: string, points: number, reason: string) =>
  createActivityLog({
    userId,
    actId: null,
    pts: -Math.abs(points),
    cnt: 1,
    tod: nowTod(),
    note: reason,
    approved: true,
    kind: "deduct",
  });

export const markLogsPaid = (logIds: number[], paid = true) =>
  wrap<LogRow[]>(supabase.from("activity_logs").update({ paid }).in("id", logIds).select());

/* ── missioni ── */

export const fetchMissions = () => wrap<MissionRow[]>(supabase.from("missions").select("*").eq("active", true).order("id"));

const missionPayload = (m: Omit<Mission, "id">, targets: UserId[]) =>
  strip(
    {
      name: m.name,
      emoji: m.emoji || "🎯",
      description: m.desc,
      points: m.pts,
      deadline: m.deadline || null,
      assigned_to: targets,
      linked_activities: m.actIds,
      target: m.tgt,
      team: m.team,
      since: m.since || null,
    },
    ["team", "since"],
  );

export const createMission = (m: Omit<Mission, "id">, targets: UserId[]) =>
  wrap<MissionRow[]>(
    supabase
      .from("missions")
      .insert({ ...missionPayload(m, targets), progress: Object.fromEntries(targets.map((t) => [t, 0])) })
      .select(),
  );

export const updateMission = (id: number, m: Omit<Mission, "id">, targets: UserId[]) =>
  wrap<MissionRow[]>(supabase.from("missions").update(missionPayload(m, targets)).eq("id", id).select());

export const deleteMission = (id: number) => wrap<MissionRow[]>(supabase.from("missions").update({ active: false }).eq("id", id).select());

/** Contatore manuale, per le missioni senza attività collegate. */
export const setMissionProgress = (id: number, progress: Record<string, number>) =>
  wrap<MissionRow[]>(supabase.from("missions").update({ progress }).eq("id", id).select());

/** Segna chi è stato premiato: è la guardia contro il doppio premio. */
export const setMissionCompleted = (id: number, completedBy: Record<string, string>) => {
  if (!schema.missionDone) return Promise.resolve<Result<MissionRow[]>>({ data: [], error: null });
  return wrap<MissionRow[]>(supabase.from("missions").update({ completed_by: completedBy }).eq("id", id).select());
};

/** Punti premio di una missione: log già approvato, come i punti bonus. */
export const awardMissionPoints = (userId: string, points: number, missionName: string) =>
  createActivityLog({ userId, actId: null, pts: points, cnt: 1, tod: nowTod(), note: `🎯 ${missionName}`, approved: true });

/* ── salvadanai ── */

export const fetchPiggybanks = (userId?: string) => {
  const q = supabase.from("piggybanks").select("*");
  return wrap<PiggyRow[]>(userId ? q.eq("user_id", userId) : q);
};

/**
 * Somma `delta` al saldo. Postgres non espone un increment via PostgREST, quindi
 * leggo e riscrivo.
 * ponytail: read-modify-write; con più di due dispositivi che pagano insieme
 * servirebbe una funzione SQL `increment_piggybank`.
 */
export const updatePiggybank = async (userId: string, type: Fund, delta: number): Promise<Result<PiggyRow[]>> => {
  const dbType = FUND_DB[type];
  const current = await wrap<PiggyRow>(supabase.from("piggybanks").select("*").eq("user_id", userId).eq("type", dbType).single());
  if (current.error || !current.data) return { data: null, error: current.error ?? "salvadanaio non trovato" };
  const balance = Math.max(0, +(Number(current.data.balance) + delta).toFixed(2));
  return wrap<PiggyRow[]>(supabase.from("piggybanks").update({ balance }).eq("id", current.data.id).select());
};

export const setPiggybankNote = (userId: string, type: Fund, note: string) => {
  if (!schema.extended) return Promise.resolve<Result<PiggyRow[]>>({ data: [], error: null });
  return wrap<PiggyRow[]>(supabase.from("piggybanks").update({ note }).eq("user_id", userId).eq("type", FUND_DB[type]).select());
};

/** Nome del salvadanaio scelto dalla ragazza. */
export const setPiggybankName = (userId: string, type: Fund, nickname: string) => {
  if (!schema.piggyName) return Promise.resolve<Result<PiggyRow[]>>({ data: [], error: null });
  return wrap<PiggyRow[]>(supabase.from("piggybanks").update({ nickname }).eq("user_id", userId).eq("type", FUND_DB[type]).select());
};

/* ── entrate ── */

export const fetchIncome = (userId?: string) => {
  const q = supabase.from("income").select("*").order("created_at", { ascending: false });
  return wrap<IncomeRow[]>(userId ? q.eq("user_id", userId) : q);
};

export const createIncome = (d: {
  userId: string;
  type: IncomeRow["type"];
  amount: number;
  note: string;
  quote?: Record<Fund, number>;
  tier?: number;
  weekPts?: number;
}) =>
  wrap<IncomeRow[]>(
    supabase
      .from("income")
      .insert(
        // solo la paghetta va confermata: le entrate extra le registra già la ragazza
        stripIf(!schema.incomeConfirm, {
          user_id: d.userId,
          type: d.type,
          amount: d.amount,
          note: d.note,
          tier: d.tier ?? null,
          week_pts: d.weekPts ?? null,
          split_personal: d.quote?.personale ?? null,
          split_savings: d.quote?.risparmio ?? null,
          split_charity: d.quote?.beneficenza ?? null,
          confirmed: d.type !== "allowance",
          confirmed_at: d.type !== "allowance" ? new Date().toISOString() : null,
        }, ["confirmed", "confirmed_at"]),
      )
      .select(),
  );

/**
 * Regalo: tutto nel Personale. Se il database non accetta ancora il tipo
 * 'gift' (manca la migrazione `income_gift_type`) ripiega su 'extra': la nota
 * porta comunque il marchio 🎁, che è come l'app lo riconosce e lo mostra.
 */
export const createGift = async (d: { userId: string; amount: number; note: string }): Promise<Result<IncomeRow[]>> => {
  const payload = { userId: d.userId, amount: d.amount, note: d.note, quote: { risparmio: 0, personale: d.amount, beneficenza: 0 } };
  const res = await createIncome({ ...payload, type: "gift" });
  if (!res.error) return res;
  return createIncome({ ...payload, type: "extra" });
};

export const deleteIncome = (id: number) => wrap<IncomeRow[]>(supabase.from("income").delete().eq("id", id).select());

/** La ragazza conferma di aver ricevuto la paghetta. */
export const confirmIncome = (incomeId: number) =>
  wrap<IncomeRow[]>(supabase.from("income").update({ confirmed: true, confirmed_at: new Date().toISOString() }).eq("id", incomeId).select());

/**
 * Movimenti del salvadanaio Risparmio letti dal database, dal più vecchio al
 * più recente: quote versate dalle entrate e spese pagate dal risparmio.
 * Alimenta il grafico dell'andamento; se il database non risponde le viste
 * ricadono sulla ricostruzione dai dati già in memoria (`data/savings.ts`).
 */
export const fetchSavingsHistory = async (userId: string): Promise<Result<SavingsMove[]>> => {
  const [inc, exp, int] = await Promise.all([
    wrap<IncomeRow[]>(supabase.from("income").select("*").eq("user_id", userId).order("created_at")),
    wrap<ExpenseRow[]>(
      supabase.from("expenses").select("*").eq("user_id", userId).eq("piggybank_type", FUND_DB.risparmio).order("created_at"),
    ),
    fetchInterestHistory(userId),
  ]);
  const failed = inc.error ?? exp.error;
  if (failed) return { data: null, error: failed };

  const versamenti: SavingsMove[] = (inc.data ?? []).map((r) => ({
    date: isoDate(new Date(r.created_at)),
    delta: Number(r.split_savings ?? 0),
    label: r.note ?? (r.type === "allowance" ? "Paghetta settimanale" : "Entrata extra"),
  }));
  const prelievi: SavingsMove[] = (exp.data ?? []).map((r) => ({
    date: isoDate(new Date(r.created_at)),
    delta: -Number(r.amount),
    label: r.description,
  }));

  // senza gli interessi la curva si scosterebbe dal saldo vero di mese in mese
  const interessi: SavingsMove[] = (int.data ?? []).map((r) => ({ date: r.date, delta: r.amount, label: `📈 Interessi ${r.period}` }));

  const moves = [...versamenti, ...prelievi, ...interessi].filter((m) => Math.abs(m.delta) >= 0.01).sort((a, b) => a.date.localeCompare(b.date));
  return { data: moves, error: null };
};

/* ── interessi ── */

export interface InterestRow {
  id: number;
  user_id: string;
  piggybank_type: string;
  balance_before: number;
  interest_amount: number;
  rate_applied: number;
  period: string;
  created_at: string;
}

export const toInterest = (r: InterestRow): InterestLog => ({
  id: r.id,
  period: r.period,
  balanceBefore: Number(r.balance_before),
  amount: Number(r.interest_amount),
  rate: Number(r.rate_applied),
  date: isoDate(new Date(r.created_at)),
});

/** Storico degli accrediti, dal più vecchio al più recente. */
export const fetchInterestHistory = async (userId: string, type: Fund = "risparmio"): Promise<Result<InterestLog[]>> => {
  if (!schema.interest) return { data: [], error: null };
  const res = await wrap<InterestRow[]>(
    supabase.from("interest_log").select("*").eq("user_id", userId).eq("piggybank_type", FUND_DB[type]).order("period"),
  );
  return res.error ? { data: null, error: res.error } : { data: (res.data ?? []).map(toInterest), error: null };
};

export interface Capitalization {
  monthsCapitalized: number;
  totalInterest: number;
}

/**
 * Accredita gli interessi di tutti i mesi chiusi non ancora pagati.
 *
 * L'ordine conta: prima si scrive la ricevuta, poi si tocca il saldo. Il
 * vincolo UNIQUE fa fallire la seconda scrittura quando due dispositivi
 * partono insieme, e chi perde non accredita nulla. Se invece è il saldo a
 * non aggiornarsi, la ricevuta viene ritirata così il mese si ritenta: meglio
 * riprovare che perdere l'interesse di un mese in silenzio.
 */
export const capitalizeInterest = async (userId: string, startPeriod: string, type: Fund = "risparmio"): Promise<Result<Capitalization>> => {
  if (!schema.interest) return { data: { monthsCapitalized: 0, totalInterest: 0 }, error: null };
  const dbType = FUND_DB[type];

  const done = await wrap<{ period: string }[]>(
    supabase.from("interest_log").select("period").eq("user_id", userId).eq("piggybank_type", dbType).order("period", { ascending: false }).limit(1),
  );
  if (done.error) return { data: null, error: done.error };

  const periods = pendingPeriods(done.data?.[0]?.period ?? null, startPeriod);
  let monthsCapitalized = 0;
  let totalInterest = 0;

  for (const period of periods) {
    const piggy = await wrap<PiggyRow>(supabase.from("piggybanks").select("*").eq("user_id", userId).eq("type", dbType).single());
    if (piggy.error || !piggy.data) return { data: null, error: piggy.error ?? "salvadanaio non trovato" };

    const balanceBefore = Number(piggy.data.balance);
    const interest = monthlyInterest(balanceBefore);

    // la riga va scritta anche a interesse zero, altrimenti il mese verrebbe
    // riprovato a ogni avvio finché il saldo resta a zero
    const row = await wrap<InterestRow[]>(
      supabase
        .from("interest_log")
        .insert({
          user_id: userId,
          piggybank_type: dbType,
          balance_before: balanceBefore,
          interest_amount: interest,
          rate_applied: +MONTH_RATE.toFixed(6),
          period,
        })
        .select(),
    );
    // conflitto sull'UNIQUE: quel mese l'ha già accreditato qualcun altro
    if (row.error) break;

    if (interest > 0) {
      const up = await wrap<PiggyRow[]>(
        supabase.from("piggybanks").update({ balance: +(balanceBefore + interest).toFixed(2) }).eq("id", piggy.data.id).select(),
      );
      if (up.error) {
        const id = row.data?.[0]?.id;
        if (id) await wrap(supabase.from("interest_log").delete().eq("id", id).select());
        return { data: null, error: up.error };
      }
    }
    monthsCapitalized += 1;
    totalInterest = +(totalInterest + interest).toFixed(2);
  }

  return { data: { monthsCapitalized, totalInterest }, error: null };
};

/* ── spese ── */

export const fetchExpenses = (userId?: string) => {
  const q = supabase.from("expenses").select("*").order("created_at", { ascending: false });
  return wrap<ExpenseRow[]>(userId ? q.eq("user_id", userId) : q);
};

export const createExpense = (d: { userId: string; amount: number; description: string; fund: Fund }) =>
  wrap<ExpenseRow[]>(
    supabase.from("expenses").insert({ user_id: d.userId, amount: d.amount, description: d.description, piggybank_type: FUND_DB[d.fund] }).select(),
  );

/* ── desideri ── */

export const fetchWishes = (userId?: string) => {
  const q = supabase.from("wishes").select("*").order("id");
  return wrap<WishRow[]>(userId ? q.eq("user_id", userId) : q);
};

export const createWish = (userId: string, w: Omit<Wish, "id" | "done">) =>
  wrap<WishRow[]>(
    supabase
      .from("wishes")
      .insert(strip({ user_id: userId, name: w.name, cost: w.cost, priority: w.priority, piggybank_type: FUND_DB[w.fund] }, ["piggybank_type"]))
      .select(),
  );

export const updateWish = (id: number, w: Partial<Omit<Wish, "id">>) =>
  wrap<WishRow[]>(
    supabase
      .from("wishes")
      .update(
        strip(
          {
            ...(w.name !== undefined ? { name: w.name } : {}),
            ...(w.cost !== undefined ? { cost: w.cost } : {}),
            ...(w.priority !== undefined ? { priority: w.priority } : {}),
            ...(w.done !== undefined ? { bought: w.done } : {}),
            ...(w.fund !== undefined ? { piggybank_type: FUND_DB[w.fund] } : {}),
          },
          ["piggybank_type"],
        ),
      )
      .eq("id", id)
      .select(),
  );

export const deleteWish = (id: number) => wrap<WishRow[]>(supabase.from("wishes").delete().eq("id", id).select());

/* ── badge ── */

export const fetchBadges = (userId?: string) => {
  const q = supabase.from("badges").select("*");
  return wrap<BadgeRow[]>(userId ? q.eq("user_id", userId) : q);
};

/** upsert: il vincolo UNIQUE(user_id, badge_key) evita i doppioni. */
export const unlockBadge = (userId: string, badgeKey: string) =>
  wrap<BadgeRow[]>(supabase.from("badges").upsert({ user_id: userId, badge_key: badgeKey }, { onConflict: "user_id,badge_key" }).select());

/* ── investimenti ── */

export const fetchInvestments = (userId?: string) => {
  const q = supabase.from("investments").select("*").order("id");
  return wrap<InvRow[]>(userId ? q.eq("user_id", userId) : q);
};

export const createInvestment = (userId: string, cfg: InvestCfg) =>
  wrap<InvRow[]>(
    supabase.from("investments").insert({ user_id: userId, principal: cfg.amt, monthly_add: cfg.ex, lock_months: cfg.mo }).select(),
  );

export const updateInvestment = (id: number, cfg: InvestCfg) =>
  wrap<InvRow[]>(supabase.from("investments").update({ principal: cfg.amt, monthly_add: cfg.ex, lock_months: cfg.mo }).eq("id", id).select());

/* ── punti bonus ── */

/** Log già approvato (senza attività collegata) più una riga di storico in income. */
export const addBonusPoints = async (userId: string, points: number, reason: string) => {
  const log = await createActivityLog({ userId, actId: null, pts: points, cnt: 1, tod: nowTod(), note: reason, approved: true });
  if (log.error) return log;
  await createIncome({ userId, type: "bonus", amount: 0, note: reason });
  return log;
};
