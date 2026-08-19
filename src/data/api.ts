import type { PostgrestError } from "@supabase/supabase-js";
import { isoDate, nowTod } from "./constants.ts";
import { supabase } from "./supabase.ts";
import type { Activity, Fund, InvestCfg, LogEntry, Mission, Tod, UserId, Wish } from "./types";

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
}

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
}

export interface IncomeRow {
  id: number;
  user_id: string;
  type: "allowance" | "extra" | "bonus";
  amount: number;
  tier: number | null;
  week_pts: number | null;
  note: string | null;
  /** Quote in euro, non percentuali. */
  split_personal: number | null;
  split_savings: number | null;
  split_charity: number | null;
  created_at: string;
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
  cat: r.category,
  pts: r.points,
  pen: r.penalty ?? 0,
  freq: r.frequency,
  max: r.max_completions,
  ch: r.challenge ? 1 : 0,
  chPts: r.challenge_points ?? 0,
  duration: r.duration ?? undefined,
});

export const toLog = (r: LogRow): LogEntry => ({
  id: r.id,
  actId: r.activity_id ?? BONUS_ACT_ID,
  date: isoDate(new Date(r.created_at)),
  cnt: r.times,
  note: r.note ?? "",
  tod: DB_TOD[r.moment] ?? "mattina",
  pts: r.points,
  ok: r.approved,
  paid: r.paid,
});

export const toMission = (r: MissionRow, uid: UserId): Mission => ({
  id: r.id,
  name: r.name,
  desc: r.description ?? "",
  prog: r.progress?.[uid] ?? 0,
  tgt: r.target,
  pts: r.points,
  team: !!r.team,
  deadline: r.deadline ?? "",
  assignee: r.assigned_to.length > 1 ? "both" : ((r.assigned_to[0] as UserId) ?? "mia"),
  actIds: r.linked_activities ?? [],
  since: r.since ?? "",
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
export const schema = { extended: false };

export const probeSchema = async () => {
  const { error } = await supabase.from("activities").select("penalty").limit(1);
  schema.extended = !error;
  return schema.extended;
};

/** Toglie dal payload le colonne che il database non ha ancora. */
const strip = <T extends Record<string, unknown>>(payload: T, extendedKeys: string[]): T => {
  if (schema.extended) return payload;
  const out = { ...payload };
  extendedKeys.forEach((k) => delete out[k]);
  return out;
};

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

export const fetchActivityLogs = (userId?: string, options?: { since?: Date; paid?: boolean }) => {
  let q = supabase.from("activity_logs").select("*").order("created_at");
  if (userId) q = q.eq("user_id", userId);
  if (options?.since) q = q.gte("created_at", options.since.toISOString());
  if (options?.paid !== undefined) q = q.eq("paid", options.paid);
  return wrap<LogRow[]>(q);
};

export const createActivityLog = (d: { userId: string; actId: number | null; pts: number; cnt: number; tod: Tod; note: string; approved?: boolean }) =>
  wrap<LogRow[]>(
    supabase
      .from("activity_logs")
      .insert({
        user_id: d.userId,
        activity_id: d.actId,
        points: d.pts,
        times: d.cnt,
        moment: TOD_DB[d.tod],
        note: d.note,
        approved: d.approved ?? false,
      })
      .select(),
  );

export const approveLog = (logId: number) => wrap<LogRow[]>(supabase.from("activity_logs").update({ approved: true }).eq("id", logId).select());

export const rejectLog = (logId: number) => wrap<LogRow[]>(supabase.from("activity_logs").delete().eq("id", logId).select());

export const markLogsPaid = (logIds: number[], paid = true) =>
  wrap<LogRow[]>(supabase.from("activity_logs").update({ paid }).in("id", logIds).select());

/* ── missioni ── */

export const fetchMissions = () => wrap<MissionRow[]>(supabase.from("missions").select("*").eq("active", true).order("id"));

const missionPayload = (m: Omit<Mission, "id">, targets: UserId[]) =>
  strip(
    {
      name: m.name,
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
      .insert({
        user_id: d.userId,
        type: d.type,
        amount: d.amount,
        note: d.note,
        tier: d.tier ?? null,
        week_pts: d.weekPts ?? null,
        split_personal: d.quote?.personale ?? null,
        split_savings: d.quote?.risparmio ?? null,
        split_charity: d.quote?.beneficenza ?? null,
      })
      .select(),
  );

export const deleteIncome = (id: number) => wrap<IncomeRow[]>(supabase.from("income").delete().eq("id", id).select());

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
