import { useCallback, useEffect, useState } from "react";
import * as api from "../data/api";
import { BONUS_ACT_ID, DB_FUND, toActivity, toInvest, toLog, toMission, toWish } from "../data/api";
import { earnedBadges } from "../data/badges";
import { periodOf } from "../data/interest";
import { toAward } from "../data/missions";
import { movesFromUser } from "../data/savings";
import {
  DEDUCT_ACT,
  DEFAULT_PINS,
  FUNDS,
  FUND_NAME_MAX,
  GIFT_PCT,
  MISSION_ACT,
  PERIOD_DAYS,
  SPLIT,
  USER_IDS,
  getTier,
  getWeekStart,
  allowanceNote,
  allowanceWeek,
  giftNote,
  isGiftNote,
  isoDate,
  nowTod,
  periodStart,
  splitAllowance,
  splitByPct,
  todayISO,
  weekStartOf,
} from "../data/constants";
import { fromISO, getWeekPts, isWeekOver, pastWeeks, weekLogs } from "../data/weekBounds";
import { fmtDay } from "../utils/dates";
import { clearPending, loadCache, loadPending, queuePending, savePending, saveCache } from "../data/storage";
import type { PendingOp } from "../data/storage";
import type {
  Activity,
  ActivityDraft,
  Fund,
  IncomeEntry,
  InvestCfg,
  LogEntry,
  Mission,
  Payment,
  Period,
  PinKey,
  Tod,
  User,
  UserId,
  Users,
  Wish,
} from "../data/types";
import { P } from "../design/tokens";

/* ── operazioni di scrittura, indicizzate per nome così la coda offline è serializzabile ── */
const OPS = {
  updateUser: api.updateUser,
  createActivity: api.createActivity,
  updateActivity: api.updateActivity,
  deleteActivity: api.deleteActivity,
  toggleActivityHidden: api.toggleActivityHidden,
  createActivityLog: api.createActivityLog,
  approveLog: api.approveLog,
  rejectLog: api.rejectLog,
  updateLogNote: api.updateLogNote,
  revokeLog: api.revokeLog,
  deleteLog: api.deleteLog,
  deductPoints: api.deductPoints,
  penalizeActivity: api.penalizeActivity,
  markLogsPaid: api.markLogsPaid,
  createMission: api.createMission,
  updateMission: api.updateMission,
  deleteMission: api.deleteMission,
  toggleMissionHidden: api.toggleMissionHidden,
  setMissionProgress: api.setMissionProgress,
  setMissionCompleted: api.setMissionCompleted,
  awardMissionPoints: api.awardMissionPoints,
  updatePiggybank: api.updatePiggybank,
  setPiggybankNote: api.setPiggybankNote,
  setPiggybankName: api.setPiggybankName,
  createGift: api.createGift,
  createIncome: api.createIncome,
  deleteIncome: api.deleteIncome,
  confirmIncome: api.confirmIncome,
  createExpense: api.createExpense,
  createWish: api.createWish,
  updateWish: api.updateWish,
  deleteWish: api.deleteWish,
  unlockBadge: api.unlockBadge,
  createInvestment: api.createInvestment,
  updateInvestment: api.updateInvestment,
  addBonusPoints: api.addBonusPoints,
};
type OpName = keyof typeof OPS;

const runOp = (op: PendingOp) => (OPS[op.name as OpName] as (...a: never[]) => Promise<api.Result<unknown>>)(...(op.args as never[]));

const emptyFunds = (): Record<Fund, number> => ({ risparmio: 0, personale: 0, beneficenza: 0 });

const mkUser = (row: api.UserRow | undefined, uid: UserId): User => ({
  n: row?.name ?? uid,
  c: row?.color ?? (uid === "mia" ? P.mia : P.sam),
  av: row?.avatar ?? "👧",
  grad: row?.grad ?? (uid === "mia" ? P.miaG : P.samG),
  totalPts: row?.total_pts ?? 0,
  streak: row?.streak ?? 0,
  w: emptyFunds(),
  wN: { risparmio: "", personale: "", beneficenza: "" },
  wNick: { risparmio: "", personale: "", beneficenza: "" },
  inv: toInvest(),
  spese: [],
  log: [],
  miss: [],
  pays: [],
  income: [],
  wishes: [],
  badges: [],
  badgeAt: {},
  profilePhoto: row?.profile_photo ?? undefined,
  nickname: row?.nickname ?? undefined,
  themeColors: row?.theme_colors ?? undefined,
  bgPattern: row?.bg_pattern ?? undefined,
});

const emptyUsers = (): Users => ({ mia: mkUser(undefined, "mia"), samira: mkUser(undefined, "samira") });

/** Quote in euro salvate su income → percentuali usate dal modello dell'app. */
const quotesToPct = (q: Record<Fund, number>): Record<Fund, number> => {
  const total = FUNDS.reduce((s, k) => s + q[k], 0);
  if (total <= 0) return { risparmio: SPLIT.risparmio * 100, personale: SPLIT.personale * 100, beneficenza: SPLIT.beneficenza * 100 };
  return { risparmio: (q.risparmio / total) * 100, personale: (q.personale / total) * 100, beneficenza: (q.beneficenza / total) * 100 };
};

/**
 * Tipo mostrato dall'app. Il regalo si riconosce dal marchio nella nota anche
 * quando il database non accetta ancora 'gift' e lo ha salvato come 'extra'.
 */
const incomeKind = (r: api.IncomeRow): IncomeEntry["type"] => {
  if (r.type === "allowance") return "paghetta";
  if (r.type === "gift" || isGiftNote(r.note ?? "")) return "regalo";
  return "extra";
};

const rowQuotes = (r: api.IncomeRow): Record<Fund, number> => ({
  risparmio: Number(r.split_savings ?? 0),
  personale: Number(r.split_personal ?? 0),
  beneficenza: Number(r.split_charity ?? 0),
});

/**
 * Stato della conferma di ricezione. Finché la migrazione `income_confirmed`
 * non è applicata le colonne non arrivano: le entrate risultano già confermate
 * così l'app non chiede una conferma che non saprebbe salvare.
 */
const rowConfirm = (r: api.IncomeRow): { confirmed: boolean; confirmedAt?: string } => {
  if (!api.schema.incomeConfirm) return { confirmed: true };
  // timestamp completo: alle ragazze mostriamo anche l'ora della conferma
  return { confirmed: !!r.confirmed, confirmedAt: r.confirmed_at ?? undefined };
};

interface Snapshot {
  users: Users;
  acts: Activity[];
  pins: Record<PinKey, string>;
  invIds: Partial<Record<UserId, number>>;
}

/** Assembla il modello dell'app a partire dalle righe del database. */
function buildSnapshot(rows: {
  users: api.UserRow[];
  piggy: api.PiggyRow[];
  acts: api.ActRow[];
  logs: api.LogRow[];
  missions: api.MissionRow[];
  income: api.IncomeRow[];
  expenses: api.ExpenseRow[];
  wishes: api.WishRow[];
  badges: api.BadgeRow[];
  investments: api.InvRow[];
}): Snapshot {
  const users = {} as Users;
  const invIds: Partial<Record<UserId, number>> = {};

  USER_IDS.forEach((uid) => {
    const u = mkUser(
      rows.users.find((r) => r.id === uid),
      uid,
    );

    rows.piggy
      .filter((p) => p.user_id === uid)
      .forEach((p) => {
        const fund = DB_FUND[p.type];
        if (!fund) return;
        u.w[fund] = Number(p.balance);
        u.wN[fund] = p.note ?? "";
        if (u.wNick) u.wNick[fund] = p.nickname ?? "";
      });

    const logRows = rows.logs.filter((l) => l.user_id === uid);
    u.log = logRows.map(toLog);

    u.miss = rows.missions.filter((m) => m.assigned_to?.includes(uid)).map((m) => toMission(m, uid));

    u.spese = rows.expenses
      .filter((e) => e.user_id === uid)
      .map((e) => ({
        id: e.id,
        d: new Date(e.created_at).toLocaleDateString("it", { day: "2-digit", month: "2-digit" }),
        date: isoDate(new Date(e.created_at)),
        ds: e.description,
        a: Number(e.amount),
        f: DB_FUND[e.piggybank_type] ?? "personale",
      }));

    const incomeRows = rows.income.filter((i) => i.user_id === uid);
    u.income = incomeRows
      .filter((i) => i.type !== "bonus")
      .map<IncomeEntry>((i) => ({
        id: i.id,
        date: isoDate(new Date(i.created_at)),
        amount: Number(i.amount),
        source: i.note ?? (i.type === "allowance" ? "Paghetta settimanale" : "Entrata extra"),
        split: quotesToPct(rowQuotes(i)),
        type: incomeKind(i),
        ...rowConfirm(i),
      }));

    // le voci saldate da un accredito sono quelle pagate fra un accredito e il precedente
    const paidLogs = logRows.filter((l) => l.paid).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const allowances = incomeRows.filter((i) => i.type === "allowance").sort((a, b) => a.created_at.localeCompare(b.created_at));
    u.pays = allowances
      .map<Payment>((row, idx) => {
        const prev = idx > 0 ? allowances[idx - 1].created_at : "";
        return {
          id: row.id,
          // la settimana saldata sta nella sua colonna; senza, nella nota; per le
          // righe più vecchie di entrambe resta il lunedì del giorno di accredito
          week: row.week_start ?? allowanceWeek(row.note) ?? weekStartOf(new Date(row.created_at)),
          date: isoDate(new Date(row.created_at)),
          pts: row.week_pts ?? 0,
          amount: Number(row.amount),
          split: rowQuotes(row),
          logIds: paidLogs.filter((l) => l.created_at <= row.created_at && l.created_at > prev).map((l) => l.id),
          ...rowConfirm(row),
        };
      })
      .reverse();

    u.wishes = rows.wishes.filter((w) => w.user_id === uid).map(toWish);

    const badgeRows = rows.badges.filter((b) => b.user_id === uid);
    u.badges = badgeRows.map((b) => b.badge_key);
    u.badgeAt = Object.fromEntries(badgeRows.map((b) => [b.badge_key, isoDate(new Date(b.unlocked_at))]));

    const inv = rows.investments.find((i) => i.user_id === uid);
    u.inv = toInvest(inv);
    if (inv) invIds[uid] = inv.id;

    users[uid] = u;
  });

  // dopo la migrazione dei PIN la colonna non esiste più: la mappa resta vuota
  // e il confronto locale non può accettare nulla
  const pins = {} as Record<PinKey, string>;
  rows.users.forEach((r) => {
    if (r.pin) pins[r.id as PinKey] = r.pin;
  });

  return { users, acts: rows.acts.map(toActivity), pins, invIds };
}

/**
 * Unica fonte dati dell'app: legge da Supabase, tiene in React lo stesso modello
 * che prima viveva in localStorage e rispedisce ogni scrittura al database.
 * Offline: parte dall'ultima cache e mette le scritture in coda.
 */
export function useSupabase() {
  // si parte dall'ultima cache: se il database non risponde l'app è già usabile
  const [users, setUsers] = useState<Users>(() => loadCache<Snapshot>()?.users ?? emptyUsers());
  const [acts, setActs] = useState<Activity[]>(() => loadCache<Snapshot>()?.acts ?? []);
  const [pins, setPins] = useState<Record<PinKey, string>>(() => loadCache<Snapshot>()?.pins ?? { ...DEFAULT_PINS });
  const [invIds, setInvIds] = useState<Partial<Record<UserId, number>>>(() => loadCache<Snapshot>()?.invIds ?? {});
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── caricamento ── */

  const load = useCallback(async () => {
    await Promise.all([
      api.probeSchema(),
      api.probePinRpc(),
      api.probeIncomeConfirm(),
      api.probeLogExtras(),
      api.probePiggyName(),
      api.probeMissionDone(),
      api.probeInterest(),
      api.probeActivityHidden(),
      api.probeMissionHidden(),
      api.probeActivityDate(),
      api.probeIncomeWeek(),
    ]);
    const [u, p, a, l, m, i, e, w, b, inv] = await Promise.all([
      api.fetchUsers(),
      api.fetchPiggybanks(),
      api.fetchActivities(),
      api.fetchActivityLogs(),
      api.fetchMissions(),
      api.fetchIncome(),
      api.fetchExpenses(),
      api.fetchWishes(),
      api.fetchBadges(),
      api.fetchInvestments(),
    ]);
    const failed = [u, p, a, l, m, i, e, w, b, inv].find((r) => r.error);
    if (failed || !u.data) {
      setOffline(true);
      setError(failed?.error ?? "database non raggiungibile");
      setLoading(false);
      return;
    }
    const snap = buildSnapshot({
      users: u.data,
      piggy: p.data ?? [],
      acts: a.data ?? [],
      logs: l.data ?? [],
      missions: m.data ?? [],
      income: i.data ?? [],
      expenses: e.data ?? [],
      wishes: w.data ?? [],
      badges: b.data ?? [],
      investments: inv.data ?? [],
    });
    setUsers(snap.users);
    setActs(snap.acts);
    setPins(snap.pins);
    setInvIds(snap.invIds);
    setOffline(false);
    setError(null);
    setLoading(false);

    // Interessi dei mesi chiusi: si parte dal primo movimento del risparmio,
    // il vincolo UNIQUE sul database impedisce di pagare due volte lo stesso
    // mese anche se due dispositivi aprono l'app insieme.
    if (api.schema.interest) {
      let credited = false;
      for (const uid of USER_IDS) {
        const first = movesFromUser(snap.users[uid])[0]?.date;
        const res = await api.capitalizeInterest(uid, periodOf(first ? new Date(first) : new Date()));
        if (res.data && res.data.monthsCapitalized > 0) credited = true;
      }
      // i saldi sono cambiati sul database: li rileggo invece di ricalcolarli qui
      if (credited) {
        const fresh = await api.fetchPiggybanks();
        if (fresh.data) {
          setUsers((prev) => {
            const out = { ...prev };
            USER_IDS.forEach((uid) => {
              const w = { ...out[uid].w };
              fresh.data!.filter((row) => row.user_id === uid).forEach((row) => {
                const fund = DB_FUND[row.type];
                if (fund) w[fund] = Number(row.balance);
              });
              out[uid] = { ...out[uid], w };
            });
            return out;
          });
        }
      }
    }
  }, []);

  /**
   * La cache è la fotografia da cui riparte l'app al prossimo avvio: se resta
   * ferma all'ultimo fetch, tutto ciò che è stato cancellato dopo torna a
   * galla al primo avvio in cui il database non risponde. Va riscritta a ogni
   * cambio di stato, non solo dopo il caricamento.
   */
  useEffect(() => {
    if (loading) return;
    saveCache<Snapshot>({ users, acts, pins, invIds });
  }, [loading, users, acts, pins, invIds]);

  /** Rispedisce le scritture rimaste in sospeso, poi ricarica. */
  const flush = useCallback(async () => {
    const pending = loadPending();
    if (pending.length === 0) return;
    const rest: PendingOp[] = [];
    for (const op of pending) {
      const res = await runOp(op);
      if (res.error) {
        console.warn(`[paghettapp] "${op.name}" non riuscita di nuovo, resta in coda:`, res.error);
        rest.push(op);
      }
    }
    savePending(rest);
    if (rest.length === 0) clearPending();
  }, []);

  useEffect(() => {
    void (async () => {
      await flush();
      await load();
    })();
  }, [flush, load]);

  /* ── scritture ── */

  /** Esegue l'operazione; se il database non risponde la mette in coda. */
  const send = useCallback(async <T>(name: OpName, args: unknown[]): Promise<T | null> => {
    const res = await runOp({ name, args });
    if (res.error) {
      // senza questo una delete rifiutata dal database è indistinguibile da una
      // riuscita: sparisce dalla UI e torna al primo fetch, senza un segnale
      console.warn(`[paghettapp] "${name}" non riuscita, messa in coda:`, res.error, args);
      queuePending({ name, args });
      setOffline(true);
      return null;
    }
    setOffline(false);
    return (Array.isArray(res.data) ? (res.data[0] as T) : (res.data as T)) ?? null;
  }, []);

  const patch = useCallback((uid: UserId, fn: (u: User) => User) => setUsers((p) => ({ ...p, [uid]: fn(p[uid]) })), []);

  /* ── letture (identiche alla versione localStorage) ── */

  const todayPts = (uid: UserId) => users[uid].log.filter((l) => l.date === todayISO() && l.ok).reduce((s, l) => s + l.pts, 0);

  /**
   * Punti della settimana in corso (lunedì-domenica), calcolati dalla *data
   * dell'attività*: non è più un contatore che l'approvazione o l'accredito
   * spostano. Un'attività di martedì approvata mercoledì pesa nella settimana
   * di martedì, e una della settimana scorsa approvata oggi non entra in
   * questa. Per una settimana diversa da quella corrente c'è `weekPtsOn`.
   */
  const weekPts = (uid: UserId) => getWeekPts(users[uid].log);

  /** Punti di una settimana qualunque, dal lunedì ISO che la identifica. */
  const weekPtsOn = (uid: UserId, week: string) => getWeekPts(users[uid].log, fromISO(week));

  // una voce annullata dall'admin è già decisa: non torna in coda di approvazione
  const pendingCnt = (uid: UserId) => users[uid].log.filter((l) => !l.ok && !l.revoked).length;

  const allPending = USER_IDS.reduce((s, uid) => s + pendingCnt(uid), 0);

  const todayDone = (uid: UserId, actId: number) =>
    users[uid].log.filter((l) => l.date === todayISO() && l.actId === actId).reduce((s, l) => s + l.cnt, 0);

  /**
   * Completamenti nel periodo in cui vale il limite dell'attività: un'attività
   * settimanale con max 1 va segnata una volta a settimana, non una al giorno.
   * Le voci annullate non contano: l'attività torna disponibile.
   */
  const periodDone = (uid: UserId, act: Activity) => {
    const from = periodStart(act.freq);
    return users[uid].log.filter((l) => l.actId === act.id && l.date >= from && !l.revoked).reduce((s, l) => s + l.cnt, 0);
  };

  const todayByTod = (uid: UserId, actId: number) => {
    const out: Record<Tod, number> = { mattina: 0, pomeriggio: 0, sera: 0 };
    users[uid].log
      .filter((l) => l.date === todayISO() && l.actId === actId)
      .forEach((l) => {
        out[l.tod] += l.cnt;
      });
    return out;
  };

  const periodSeries = (uid: UserId, period: Period) => {
    const days = PERIOD_DAYS[period];
    const step = days <= 30 ? 1 : days <= 90 ? 7 : 30;
    const buckets = Math.min(Math.ceil(days / step), 12);
    const u = users[uid];
    const out: { d: string; pts: number; spese: number }[] = [];
    for (let b = buckets - 1; b >= 0; b--) {
      const end = new Date();
      end.setDate(end.getDate() - b * step);
      const start = new Date(end);
      start.setDate(start.getDate() - (step - 1));
      const sIso = isoDate(start);
      const eIso = isoDate(end);
      const pts = u.log.filter((l) => l.ok && l.date >= sIso && l.date <= eIso).reduce((s, l) => s + l.pts, 0);
      const spese = u.spese
        .filter((s) => {
          const [dd, mm] = s.d.split("/");
          const iso = `${end.getFullYear()}-${mm}-${dd}`;
          return iso >= sIso && iso <= eIso;
        })
        .reduce((s, x) => s + x.a, 0);
      out.push({
        d: step === 1 ? end.toLocaleDateString("it", { weekday: "short" }) : end.toLocaleDateString("it", { day: "2-digit", month: "2-digit" }),
        pts,
        spese: +spese.toFixed(2),
      });
    }
    return out;
  };

  const findAct = (id: number) => acts.find((a) => a.id === id);

  /**
   * Attività proposte alle ragazze: le nascoste restano in `acts` — l'admin le
   * vede e lo storico continua a risolverne il nome — ma spariscono da qui.
   */
  const visibleActs = acts.filter((a) => !a.hidden);

  /* ── attività ── */

  const draftToActivity = (d: ActivityDraft): Omit<Activity, "id"> => {
    const n = parseInt(d.duration, 10);
    return {
      name: d.name.trim(),
      emoji: d.emoji.trim() || undefined,
      cat: d.cat || "casa",
      pts: d.pts || 3,
      pen: d.pen || 0,
      freq: d.freq || "daily",
      max: Math.max(1, d.max || 1),
      ch: d.ch || 0,
      chPts: d.ch ? (d.pts || 3) * 2 : 0,
      duration: n > 0 ? n : undefined,
    };
  };

  const addAct = async (d: ActivityDraft) => {
    const body = draftToActivity(d);
    const row = await send<api.ActRow>("createActivity", [body]);
    setActs((p) => [...p, row ? toActivity(row) : { ...body, id: Date.now() }]);
  };

  const updateAct = async (d: ActivityDraft) => {
    if (!d.id) return;
    const body = draftToActivity(d);
    setActs((p) => p.map((a) => (a.id === d.id ? { ...body, id: d.id! } : a)));
    await send("updateActivity", [d.id, body]);
  };

  const delAct = async (id: number) => {
    setActs((p) => p.filter((a) => a.id !== id));
    await send("deleteActivity", [id]);
  };

  /**
   * Nasconde o rimostra un'attività: toggle rapido, senza conferma.
   * Se la colonna non c'è ancora non tento nemmeno la scrittura, altrimenti
   * finirebbe in coda offline a fallire per sempre.
   */
  const toggleActHidden = async (id: number, hidden: boolean) => {
    if (!api.schema.activityHidden) return;
    setActs((p) => p.map((a) => (a.id === id ? { ...a, hidden } : a)));
    await send("toggleActivityHidden", [id, hidden]);
  };

  /** Nascondi/mostra in blocco: una sola scrittura sullo stato. */
  const toggleActHiddenMany = async (ids: number[], hidden: boolean) => {
    if (!api.schema.activityHidden || ids.length === 0) return;
    const set = new Set(ids);
    setActs((p) => p.map((a) => (set.has(a.id) ? { ...a, hidden } : a)));
    for (const id of ids) await send("toggleActivityHidden", [id, hidden]);
  };

  /** Eliminazione multipla: una sola scrittura sullo stato, una chiamata per attività. */
  const delActs = async (ids: number[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    setActs((p) => p.filter((a) => !set.has(a.id)));
    for (const id of ids) await send("deleteActivity", [id]);
  };

  /* ── completamenti ── */

  /** `date` è il giorno dell'attività: oggi o ieri, mai più indietro (solo l'admin tocca lo storico). */
  const addLog = async (uid: UserId, actId: number, cnt: number, note: string, tod: Tod, pts: number, date = todayISO()) => {
    const row = await send<api.LogRow>("createActivityLog", [{ userId: uid, actId, pts, cnt, tod, note, date }]);
    const entry: LogEntry = row ? toLog(row) : { id: Date.now(), actId, date, cnt, note, tod, pts, ok: false };
    patch(uid, (u) => ({ ...u, log: [...u.log, entry] }));
  };

  const addBonus = async (uid: UserId, pts: number, reason: string) => {
    const row = await send<api.LogRow>("addBonusPoints", [uid, pts, reason]);
    const entry: LogEntry = row
      ? toLog(row)
      : { id: Date.now(), actId: BONUS_ACT_ID, date: todayISO(), cnt: 1, note: reason, tod: nowTod(), pts, ok: true };
    patch(uid, (u) => ({ ...u, log: [...u.log, entry], totalPts: u.totalPts + pts }));
    await send("updateUser", [uid, { total_pts: users[uid].totalPts + pts }]);
  };

  const approve = async (uid: UserId, logId: number) => {
    const entry = users[uid].log.find((l) => l.id === logId);
    if (!entry || entry.ok) return;
    patch(uid, (u) => ({ ...u, log: u.log.map((l) => (l.id === logId ? { ...l, ok: true } : l)), totalPts: u.totalPts + entry.pts }));
    await send("approveLog", [logId]);
    await send("updateUser", [uid, { total_pts: users[uid].totalPts + entry.pts }]);
  };

  const reject = async (uid: UserId, logId: number) => {
    patch(uid, (u) => ({ ...u, log: u.log.filter((l) => l.id !== logId) }));
    await send("rejectLog", [logId]);
  };

  /**
   * Approvazione in blocco. I punti si sommano una volta sola per figlia e
   * `total_pts` si scrive una volta sola alla fine: N approvazioni fanno N
   * `approveLog` più al massimo due `updateUser`, non N.
   */
  const approveMany = async (picks: { uid: UserId; logId: number }[]) => {
    const fresh = picks.filter(({ uid, logId }) => users[uid].log.some((l) => l.id === logId && !l.ok));
    if (fresh.length === 0) return;

    const gained = {} as Record<UserId, number>;
    USER_IDS.forEach((uid) => {
      gained[uid] = fresh
        .filter((f) => f.uid === uid)
        .reduce((s, f) => s + (users[uid].log.find((l) => l.id === f.logId)?.pts ?? 0), 0);
    });

    setUsers((p) => {
      const next = { ...p };
      USER_IDS.forEach((uid) => {
        const ids = fresh.filter((f) => f.uid === uid).map((f) => f.logId);
        if (ids.length === 0) return;
        next[uid] = {
          ...next[uid],
          log: next[uid].log.map((l) => (ids.includes(l.id) ? { ...l, ok: true } : l)),
          totalPts: next[uid].totalPts + gained[uid],
        };
      });
      return next;
    });

    for (const { logId } of fresh) await send("approveLog", [logId]);
    for (const uid of USER_IDS) {
      if (gained[uid] !== 0) await send("updateUser", [uid, { total_pts: users[uid].totalPts + gained[uid] }]);
    }
  };

  /** Rifiuto in blocco: `rejectLog` cancella la riga, quindi non è reversibile. */
  const rejectMany = async (picks: { uid: UserId; logId: number }[]) => {
    if (picks.length === 0) return;
    setUsers((p) => {
      const next = { ...p };
      USER_IDS.forEach((uid) => {
        const ids = picks.filter((f) => f.uid === uid).map((f) => f.logId);
        if (ids.length === 0) return;
        next[uid] = { ...next[uid], log: next[uid].log.filter((l) => !ids.includes(l.id)) };
      });
      return next;
    });
    for (const { logId } of picks) await send("rejectLog", [logId]);
  };

  /**
   * Correzione della nota da parte della ragazza. Solo finché la voce è in
   * attesa: dopo l'approvazione lo storico non si tocca più.
   */
  const editLogNote = async (uid: UserId, logId: number, note: string) => {
    const entry = users[uid].log.find((l) => l.id === logId);
    if (!entry || entry.ok || entry.revoked) return;
    patch(uid, (u) => ({ ...u, log: u.log.map((l) => (l.id === logId ? { ...l, note } : l)) }));
    await send("updateLogNote", [logId, note]);
  };

  /** Ritiro di un invio sbagliato da parte della ragazza, prima dell'approvazione. */
  const withdrawLog = async (uid: UserId, logId: number) => {
    const entry = users[uid].log.find((l) => l.id === logId);
    if (!entry || entry.ok || entry.revoked) return;
    await reject(uid, logId);
  };

  /**
   * Annulla un'approvazione già data: i punti escono dal totale e dalla
   * settimana in cui cade la data della voce, perché `weekPts` somma i log
   * approvati di quella settimana. Le missioni collegate si aggiornano da
   * sole: il loro progresso guarda i log approvati.
   */
  const revoke = async (uid: UserId, logId: number) => {
    const entry = users[uid].log.find((l) => l.id === logId);
    if (!entry || !entry.ok) return;
    patch(uid, (u) => ({
      ...u,
      log: u.log.map((l) => (l.id === logId ? { ...l, ok: false, revoked: true } : l)),
      totalPts: u.totalPts - entry.pts,
    }));
    await send("revokeLog", [logId]);
  };

  /** Elimina del tutto una voce sbagliata. */
  const delLog = async (uid: UserId, logId: number) => {
    const entry = users[uid].log.find((l) => l.id === logId);
    if (!entry) return;
    patch(uid, (u) => ({
      ...u,
      log: u.log.filter((l) => l.id !== logId),
      totalPts: entry.ok ? u.totalPts - entry.pts : u.totalPts,
    }));
    await send("deleteLog", [logId]);
  };

  /** Punti tolti a mano dall'admin: voce già approvata con punti negativi. */
  const deductPoints = async (uid: UserId, pts: number, reason: string) => {
    const amount = -Math.abs(pts);
    const row = await send<api.LogRow>("deductPoints", [uid, Math.abs(pts), reason]);
    const entry: LogEntry = row
      ? toLog(row)
      : { id: Date.now(), actId: DEDUCT_ACT, date: todayISO(), cnt: 1, note: reason, tod: nowTod(), pts: amount, ok: true };
    patch(uid, (u) => ({ ...u, log: [...u.log, entry], totalPts: u.totalPts + amount }));
    await send("updateUser", [uid, { total_pts: users[uid].totalPts + amount }]);
  };

  /**
   * Penalità legata a un'attività non svolta: voce già approvata con i punti
   * negativi dell'attività, che entra subito nel totale e nella settimana.
   */
  const penalizeActivity = async (uid: UserId, actId: number, pen: number, note: string) => {
    const amount = -Math.abs(pen);
    if (amount === 0) return;
    const row = await send<api.LogRow>("penalizeActivity", [uid, actId, Math.abs(pen), note]);
    const entry: LogEntry = row
      ? toLog(row)
      : { id: Date.now(), actId, date: todayISO(), cnt: 0, note, tod: nowTod(), pts: amount, ok: true };
    patch(uid, (u) => ({ ...u, log: [...u.log, entry], totalPts: u.totalPts + amount }));
    await send("updateUser", [uid, { total_pts: users[uid].totalPts + amount }]);
  };

  /**
   * Riscatto: i soldi escono dall'app perché vengono consegnati a mano alla
   * ragazza. Resta una spesa a storico, non un'entrata: nel bilancio è
   * un'uscita dal salvadanaio, non un guadagno.
   */
  const redeemPiggy = async (uid: UserId, fund: Fund, amount: number, reason: string) => {
    const value = Math.min(users[uid].w[fund], Math.max(0, +amount.toFixed(2)));
    if (value <= 0) return;
    const ds = `💸 Riscatto: ${reason.trim() || "consegnato a mano"}`;
    const row = await send<api.ExpenseRow>("createExpense", [{ userId: uid, amount: value, description: ds, fund }]);
    patch(uid, (u) => ({
      ...u,
      w: { ...u.w, [fund]: Math.max(0, +(u.w[fund] - value).toFixed(2)) },
      spese: [
        { id: row?.id ?? Date.now(), d: new Date().toLocaleDateString("it", { day: "2-digit", month: "2-digit" }), date: todayISO(), ds, a: value, f: fund },
        ...u.spese,
      ],
    }));
    await send("updatePiggybank", [uid, fund, -value]);
  };

  /** Azzeramento: stessa cosa del riscatto, ma per l'intero saldo. */
  const resetPiggy = async (uid: UserId, fund: Fund) => {
    const value = users[uid].w[fund];
    if (value <= 0) return;
    const ds = "🔄 Azzeramento salvadanaio";
    const row = await send<api.ExpenseRow>("createExpense", [{ userId: uid, amount: value, description: ds, fund }]);
    patch(uid, (u) => ({
      ...u,
      w: { ...u.w, [fund]: 0 },
      spese: [
        { id: row?.id ?? Date.now(), d: new Date().toLocaleDateString("it", { day: "2-digit", month: "2-digit" }), date: todayISO(), ds, a: value, f: fund },
        ...u.spese,
      ],
    }));
    await send("updatePiggybank", [uid, fund, -value]);
  };

  /* ── profilo ── */

  const setAvatar = async (uid: UserId, av: string) => {
    patch(uid, (u) => ({ ...u, av }));
    await send("updateUser", [uid, { avatar: av }]);
  };

  const setPhoto = async (uid: UserId, photo?: string) => {
    patch(uid, (u) => ({ ...u, profilePhoto: photo }));
    await send("updateUser", [uid, { profile_photo: photo ?? null }]);
  };

  const setTheme = async (uid: UserId, themeColors: { from: string; to: string }) => {
    patch(uid, (u) => ({ ...u, themeColors }));
    await send("updateUser", [uid, { theme_colors: themeColors }]);
  };

  const setBgPattern = async (uid: UserId, bgPattern: string) => {
    patch(uid, (u) => ({ ...u, bgPattern }));
    await send("updateUser", [uid, { bg_pattern: bgPattern }]);
  };

  const setNickname = async (uid: UserId, nickname: string) => {
    const value = nickname.trim().slice(0, 15);
    patch(uid, (u) => ({ ...u, nickname: value }));
    await send("updateUser", [uid, { nickname: value || null }]);
  };

  /** Nome del salvadanaio. Senza la colonna sul database non è salvabile. */
  const setPiggyName = async (uid: UserId, fund: Fund, name: string) => {
    const value = name.trim().slice(0, FUND_NAME_MAX);
    patch(uid, (u) => ({ ...u, wNick: { ...(u.wNick ?? { risparmio: "", personale: "", beneficenza: "" }), [fund]: value } }));
    await send("setPiggybankName", [uid, fund, value]);
  };

  /** Regalo: l'intero importo entra nel salvadanaio Personale. */
  const addGift = async (uid: UserId, from: string, reason: string, amount: number) => {
    const note = giftNote(from, reason);
    const row = await send<api.IncomeRow>("createGift", [{ userId: uid, amount, note }]);
    patch(uid, (u) => ({
      ...u,
      w: { ...u.w, personale: +(u.w.personale + amount).toFixed(2) },
      income: [
        { id: row?.id ?? Date.now(), date: todayISO(), amount, source: note, split: { ...GIFT_PCT }, type: "regalo" as const, confirmed: true },
        ...(u.income ?? []),
      ],
    }));
    await send("updatePiggybank", [uid, "personale", amount]);
  };

  const setPiggyNote = async (uid: UserId, fund: Fund, note: string) => {
    patch(uid, (u) => ({ ...u, wN: { ...u.wN, [fund]: note } }));
    await send("setPiggybankNote", [uid, fund, note]);
  };

  /* ── PIN ──
     Con le funzioni SQL attive il PIN non lascia mai il database: qui va e
     torna solo un sì/no. Senza, si ricade sul confronto con i PIN caricati. */

  const verifyPin = async (k: PinKey, pin: string) => {
    // se la verifica sul database è attiva, un errore di rete non deve aprire
    // la porta: meglio non entrare che entrare senza controllo
    if (api.schemaPins.rpc) {
      const res = await api.checkPin(k, pin);
      return !res.error && res.data === true;
    }
    return !!pins[k] && pin === pins[k];
  };

  /** Cambio del proprio PIN: serve quello attuale. */
  const changePin = async (k: PinKey, next: string, current: string) => {
    if (api.schemaPins.rpc) {
      const res = await api.setPinRpc(k, current, next);
      if (res.error || res.data !== true) return false;
      setPins((p) => ({ ...p, [k]: next }));
      return true;
    }
    if (current !== pins[k]) return false;
    setPins((p) => ({ ...p, [k]: next }));
    await send("updateUser", [k, { pin: next }]);
    return true;
  };

  /** Cambio o reset fatto dall'admin: serve il PIN dell'admin. */
  const adminSetPin = async (target: PinKey, next: string, adminPin: string) => {
    if (api.schemaPins.rpc) {
      const res = await api.adminSetPinRpc(adminPin, target, next);
      if (res.error || res.data !== true) return false;
      setPins((p) => ({ ...p, [target]: next }));
      return true;
    }
    if (adminPin !== pins.admin) return false;
    setPins((p) => ({ ...p, [target]: next }));
    await send("updateUser", [target, { pin: next }]);
    return true;
  };

  const resetPin = (target: PinKey, adminPin: string) => adminSetPin(target, DEFAULT_PINS[target], adminPin);

  /* ── investimenti ── */

  const setInvest = async (uid: UserId, key: keyof InvestCfg, value: number) => {
    const next = { ...users[uid].inv, [key]: key === "mo" ? Math.max(12, value) : Math.max(0, value) };
    patch(uid, (u) => ({ ...u, inv: next }));
    const id = invIds[uid];
    if (id) await send("updateInvestment", [id, next]);
    else {
      const row = await send<api.InvRow>("createInvestment", [uid, next]);
      if (row) setInvIds((p) => ({ ...p, [uid]: row.id }));
    }
    void grantBadges(uid, ["first_invest"]);
  };

  /* ── movimenti di denaro ── */

  const addSpesa = async (uid: UserId, ds: string, amount: number, fund: Fund) => {
    const row = await send<api.ExpenseRow>("createExpense", [{ userId: uid, amount, description: ds, fund }]);
    patch(uid, (u) => ({
      ...u,
      spese: [
        {
          id: row?.id ?? Date.now(),
          d: new Date().toLocaleDateString("it", { day: "2-digit", month: "2-digit" }),
          date: todayISO(),
          ds,
          a: amount,
          f: fund,
        },
        ...u.spese,
      ],
      w: { ...u.w, [fund]: Math.max(0, +(u.w[fund] - amount).toFixed(2)) },
    }));
    await send("updatePiggybank", [uid, fund, -amount]);
  };

  const addIncome = async (uid: UserId, entry: Omit<IncomeEntry, "id">) => {
    const quote = splitByPct(entry.amount, entry.split);
    const row = await send<api.IncomeRow>("createIncome", [
      { userId: uid, type: "extra", amount: entry.amount, note: entry.source, quote },
    ]);
    patch(uid, (u) => ({
      ...u,
      w: {
        risparmio: +(u.w.risparmio + quote.risparmio).toFixed(2),
        personale: +(u.w.personale + quote.personale).toFixed(2),
        beneficenza: +(u.w.beneficenza + quote.beneficenza).toFixed(2),
      },
      income: [{ ...entry, id: row?.id ?? Date.now() }, ...(u.income ?? [])],
    }));
    for (const f of FUNDS) await send("updatePiggybank", [uid, f, quote[f]]);
  };

  /**
   * Paghetta accreditata e non ancora confermata dalla ragazza: la Home ne
   * mostra una sola alla volta, la più recente.
   */
  const pendingAllowance = (uid: UserId): IncomeEntry | undefined => unconfirmedAllowances(uid)[0];

  /** Tutte le paghette in attesa di conferma: alimentano il badge sul Wallet. */
  const unconfirmedAllowances = (uid: UserId): IncomeEntry[] =>
    (users[uid].income ?? []).filter((i) => i.type === "paghetta" && !i.confirmed);

  /** La ragazza conferma di aver ricevuto la paghetta. */
  const confirmIncome = async (uid: UserId, id: number) => {
    const at = new Date().toISOString();
    patch(uid, (u) => ({
      ...u,
      income: (u.income ?? []).map((i) => (i.id === id ? { ...i, confirmed: true, confirmedAt: at } : i)),
      pays: (u.pays ?? []).map((p) => (p.id === id ? { ...p, confirmed: true, confirmedAt: at } : p)),
    }));
    await send("confirmIncome", [id]);
  };

  /* ── desideri ── */

  const addWish = async (uid: UserId, wish: Omit<Wish, "id" | "done">) => {
    const row = await send<api.WishRow>("createWish", [uid, wish]);
    patch(uid, (u) => ({ ...u, wishes: [...(u.wishes ?? []), { ...wish, id: row?.id ?? Date.now(), done: false }] }));
  };

  const updateWish = async (uid: UserId, id: number, wish: Omit<Wish, "id" | "done">) => {
    patch(uid, (u) => ({ ...u, wishes: (u.wishes ?? []).map((w) => (w.id === id ? { ...w, ...wish } : w)) }));
    await send("updateWish", [id, wish]);
  };

  const delWish = async (uid: UserId, id: number) => {
    patch(uid, (u) => ({ ...u, wishes: (u.wishes ?? []).filter((w) => w.id !== id) }));
    await send("deleteWish", [id]);
  };

  const buyWish = async (uid: UserId, id: number) => {
    const w = (users[uid].wishes ?? []).find((x) => x.id === id);
    if (!w || w.done) return;
    patch(uid, (u) => ({
      ...u,
      w: { ...u.w, [w.fund]: Math.max(0, +(u.w[w.fund] - w.cost).toFixed(2)) },
      wishes: (u.wishes ?? []).map((x) => (x.id === id ? { ...x, done: true } : x)),
      spese: [
        {
          id: Date.now(),
          d: new Date().toLocaleDateString("it", { day: "2-digit", month: "2-digit" }),
          date: todayISO(),
          ds: `🎁 ${w.name}`,
          a: w.cost,
          f: w.fund,
        },
        ...u.spese,
      ],
    }));
    await send("updateWish", [id, { done: true }]);
    await send("createExpense", [{ userId: uid, amount: w.cost, description: `🎁 ${w.name}`, fund: w.fund }]);
    await send("updatePiggybank", [uid, w.fund, -w.cost]);
    void grantBadges(uid, ["wish_bought"]);
  };

  /* ── badge ── */

  const grantBadges = useCallback(
    async (uid: UserId, ids: string[]) => {
      const have = users[uid].badges ?? [];
      const fresh = ids.filter((id) => !have.includes(id));
      if (fresh.length === 0) return [];
      patch(uid, (u) => ({
        ...u,
        badges: [...(u.badges ?? []), ...fresh],
        badgeAt: { ...(u.badgeAt ?? {}), ...Object.fromEntries(fresh.map((id) => [id, todayISO()])) },
      }));
      for (const id of fresh) await send("unlockBadge", [uid, id]);
      return fresh;
    },
    [users, patch, send],
  );

  const syncBadges = (actIds: number[]) => {
    const fresh: { uid: UserId; id: string }[] = [];
    USER_IDS.forEach((uid) => {
      const have = users[uid].badges ?? [];
      earnedBadges(users[uid], actIds)
        .filter((id) => !have.includes(id))
        .forEach((id) => fresh.push({ uid, id }));
    });
    USER_IDS.forEach((uid) => {
      const ids = fresh.filter((f) => f.uid === uid).map((f) => f.id);
      if (ids.length > 0) void grantBadges(uid, ids);
    });
    return fresh;
  };

  /* ── missioni ── */

  const upsertMission = async (id: number | undefined, targets: UserId[], mission: Omit<Mission, "id">) => {
    if (id) {
      setUsers((p) => {
        const next = { ...p };
        USER_IDS.forEach((uid) => {
          const prev = next[uid].miss.find((m) => m.id === id);
          if (!targets.includes(uid)) {
            if (prev) next[uid] = { ...next[uid], miss: next[uid].miss.filter((m) => m.id !== id) };
            return;
          }
          const entry: Mission = {
            ...mission,
            id,
            prog: prev?.prog ?? mission.prog,
            since: prev?.since ?? mission.since,
            progBy: prev?.progBy,
            completedBy: prev?.completedBy,
            // `missionPayload` non tocca `hidden`: lo conservo anche in locale
            hidden: prev?.hidden ?? mission.hidden,
          };
          next[uid] = { ...next[uid], miss: prev ? next[uid].miss.map((m) => (m.id === id ? entry : m)) : [...next[uid].miss, entry] };
        });
        return next;
      });
      await send("updateMission", [id, mission, targets]);
      return;
    }
    const row = await send<api.MissionRow>("createMission", [mission, targets]);
    const newId = row?.id ?? Date.now();
    setUsers((p) => {
      const next = { ...p };
      targets.forEach((uid) => {
        next[uid] = { ...next[uid], miss: [...next[uid].miss, { ...mission, id: newId }] };
      });
      return next;
    });
  };

  /**
   * Nasconde o rimostra una missione. L'id è lo stesso per entrambe le figlie,
   * quindi il toggle vale per tutte e due. Se la colonna non c'è ancora non
   * tento la scrittura, altrimenti finirebbe in coda offline a fallire.
   */
  const toggleMissHidden = async (id: number, hidden: boolean) => {
    if (!api.schema.missionHidden) return;
    setUsers((p) => {
      const next = { ...p };
      USER_IDS.forEach((uid) => {
        next[uid] = { ...next[uid], miss: next[uid].miss.map((m) => (m.id === id ? { ...m, hidden } : m)) };
      });
      return next;
    });
    await send("toggleMissionHidden", [id, hidden]);
  };

  /** Nascondi/mostra missioni in blocco. */
  const toggleMissHiddenMany = async (ids: number[], hidden: boolean) => {
    if (!api.schema.missionHidden || ids.length === 0) return;
    const set = new Set(ids);
    setUsers((p) => {
      const next = { ...p };
      USER_IDS.forEach((uid) => {
        next[uid] = { ...next[uid], miss: next[uid].miss.map((m) => (set.has(m.id) ? { ...m, hidden } : m)) };
      });
      return next;
    });
    for (const id of ids) await send("toggleMissionHidden", [id, hidden]);
  };

  /** Eliminazione multipla di missioni: valgono per entrambe le figlie. */
  const delMissions = async (ids: number[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    setUsers((p) => {
      const next = { ...p };
      USER_IDS.forEach((uid) => {
        next[uid] = { ...next[uid], miss: next[uid].miss.filter((m) => !set.has(m.id)) };
      });
      return next;
    });
    for (const id of ids) await send("deleteMission", [id]);
  };

  /** L'id della missione è lo stesso per entrambe: la tolgo a tutte e due. */
  /**
   * Contatore manuale delle missioni senza attività collegate: senza questo
   * `progress` non veniva mai scritto e la missione restava ferma a zero.
   */
  const bumpMission = async (uid: UserId, id: number, delta: number) => {
    const current = USER_IDS.reduce<Record<string, number>>((acc, who) => {
      const m = users[who].miss.find((x) => x.id === id);
      if (m) Object.assign(acc, m.progBy ?? {});
      return acc;
    }, {});
    const next = { ...current, [uid]: Math.max(0, (current[uid] ?? 0) + delta) };
    setUsers((p) => {
      const out = { ...p };
      USER_IDS.forEach((who) => {
        out[who] = { ...out[who], miss: out[who].miss.map((m) => (m.id === id ? { ...m, progBy: next, prog: next[who] ?? 0 } : m)) };
      });
      return out;
    });
    await send("setMissionProgress", [id, next]);
  };

  /**
   * Punti premio di una missione arrivata all'obiettivo. Il premio è una voce
   * approvata nello storico punti, come i punti bonus: entra nel totale e
   * nella settimana, quindi può far salire lo scaglione della paghetta.
   * `completedBy` sul database impedisce di premiare due volte, anche da due
   * dispositivi diversi.
   */
  const awardMission = useCallback(
    async (m: Mission, targets: UserId[]) => {
      if (targets.length === 0) return;
      const stamp = todayISO();
      const completedBy = { ...(m.completedBy ?? {}), ...Object.fromEntries(targets.map((uid) => [uid, stamp])) };
      setUsers((p) => {
        const out = { ...p };
        targets.forEach((uid) => {
          out[uid] = {
            ...out[uid],
            totalPts: out[uid].totalPts + m.pts,
            log: [
              ...out[uid].log,
              { id: Date.now() + Math.round(m.id), actId: MISSION_ACT, date: stamp, cnt: 1, note: `🎯 ${m.name}`, tod: nowTod(), pts: m.pts, ok: true },
            ],
          };
        });
        USER_IDS.forEach((uid) => {
          out[uid] = { ...out[uid], miss: out[uid].miss.map((x) => (x.id === m.id ? { ...x, completedBy } : x)) };
        });
        return out;
      });
      // prima la guardia, poi i punti: se qui cade la rete la voce resta in
      // coda, mentre premiare senza aver segnato nulla raddoppierebbe
      await send("setMissionCompleted", [m.id, completedBy]);
      for (const uid of targets) {
        await send("awardMissionPoints", [uid, m.pts, m.name]);
        await send("updateUser", [uid, { total_pts: users[uid].totalPts + m.pts }]);
      }
    },
    [users, send],
  );

  /**
   * Passa le missioni e premia quelle appena arrivate all'obiettivo. Gira come
   * `syncBadges` a ogni cambio di stato. Senza la colonna `completed_by` non
   * fa nulla: non c'è modo di ricordare il premio, quindi verrebbe ripetuto.
   */
  const syncMissions = () => {
    if (!api.schema.missionDone) return [];
    const seen = new Set<number>();
    const awarded: { m: Mission; targets: UserId[] }[] = [];
    USER_IDS.forEach((uid) => {
      users[uid].miss.forEach((m) => {
        if (seen.has(m.id)) return;
        seen.add(m.id);
        const targets = toAward(users, m);
        if (targets.length > 0) awarded.push({ m, targets });
      });
    });
    awarded.forEach(({ m, targets }) => void awardMission(m, targets));
    return awarded;
  };

  const delMission = async (_uid: UserId, id: number) => {
    setUsers((p) => {
      const next = { ...p };
      USER_IDS.forEach((x) => {
        next[x] = { ...next[x], miss: next[x].miss.filter((m) => m.id !== id) };
      });
      return next;
    });
    await send("deleteMission", [id]);
  };

  /* ── paghetta settimanale ── */

  const payments = (uid: UserId): Payment[] => users[uid].pays ?? [];

  const paymentFor = (uid: UserId, week = getWeekStart()) => payments(uid).find((p) => p.week === week);

  /** Anteprima dell'accredito di una settimana: di default quella in corso. */
  const duePreview = (uid: UserId, week = getWeekStart()) => {
    const pts = weekPtsOn(uid, week);
    const amount = getTier(pts).r;
    return { pts, amount, split: splitAllowance(amount) };
  };

  /**
   * Perché quella settimana non si può pagare, in chiaro; `null` se si può.
   *
   * Sono due condizioni distinte e nessuna delle due basta da sola: la
   * settimana in corso non è ancora finita, e una già saldata non va saldata di
   * nuovo. La verifica sta qui e non solo nella UI, perché `payWeek` è
   * raggiungibile anche dalla dashboard e dalla scheda della figlia.
   */
  const payBlock = (uid: UserId, week: string): string | null => {
    if (!isWeekOver(week)) return "⏳ La settimana finisce domenica — potrai registrare la paghetta da lunedì.";
    const done = paymentFor(uid, week);
    if (done) return `⚠️ Paghetta già registrata per questa settimana (€${done.amount.toFixed(2)} il ${fmtDay(done.date)})`;
    return null;
  };

  /** Settimane concluse ancora da saldare, dalla più recente: sono le sole pagabili. */
  const payableWeeks = (uid: UserId, count = 8): string[] => pastWeeks(count).filter((w) => !paymentFor(uid, w));

  const payWeek = async (uid: UserId, week = getWeekStart()) => {
    const blocked = payBlock(uid, week);
    if (blocked) return { ok: false as const, error: blocked };
    const { pts, amount, split } = duePreview(uid, week);
    // si saldano solo le voci di *quella* settimana: pagare mercoledì la
    // settimana scorsa non deve marcare come pagati i punti di questa
    const logIds = weekLogs(users[uid].log, fromISO(week)).filter((l) => l.ok && !l.paid).map((l) => l.id);

    const row = await send<api.IncomeRow>("createIncome", [
      { userId: uid, type: "allowance", amount, note: allowanceNote(week), quote: split, tier: amount, weekPts: pts, weekStart: week },
    ]);
    if (logIds.length > 0) await send("markLogsPaid", [logIds, true]);
    for (const f of FUNDS) await send("updatePiggybank", [uid, f, split[f]]);

    const id = row?.id ?? Date.now();
    // senza la migrazione la conferma non è salvabile: l'accredito nasce già confermato
    const confirmed = !api.schema.incomeConfirm;
    patch(uid, (u) => ({
      ...u,
      w: {
        risparmio: +(u.w.risparmio + split.risparmio).toFixed(2),
        personale: +(u.w.personale + split.personale).toFixed(2),
        beneficenza: +(u.w.beneficenza + split.beneficenza).toFixed(2),
      },
      log: u.log.map((l) => (logIds.includes(l.id) ? { ...l, paid: true } : l)),
      pays: [{ id, week, date: todayISO(), pts, amount, split, logIds, confirmed }, ...(u.pays ?? [])],
      income: [
        {
          id,
          date: todayISO(),
          amount,
          source: allowanceNote(week),
          split: { risparmio: SPLIT.risparmio * 100, personale: SPLIT.personale * 100, beneficenza: SPLIT.beneficenza * 100 },
          type: "paghetta" as const,
          confirmed,
        },
        ...(u.income ?? []),
      ],
    }));
    return { ok: true as const };
  };

  const undoPayment = async (uid: UserId, week: string) => {
    const pay = (users[uid].pays ?? []).find((p) => p.week === week);
    if (!pay) return;
    patch(uid, (u) => ({
      ...u,
      w: {
        risparmio: Math.max(0, +(u.w.risparmio - pay.split.risparmio).toFixed(2)),
        personale: Math.max(0, +(u.w.personale - pay.split.personale).toFixed(2)),
        beneficenza: Math.max(0, +(u.w.beneficenza - pay.split.beneficenza).toFixed(2)),
      },
      log: u.log.map((l) => ((pay.logIds ?? []).includes(l.id) ? { ...l, paid: false } : l)),
      pays: (u.pays ?? []).filter((p) => p.week !== week),
      income: (u.income ?? []).filter((i) => i.id !== pay.id),
    }));
    await send("deleteIncome", [pay.id]);
    if ((pay.logIds ?? []).length > 0) await send("markLogsPaid", [pay.logIds, false]);
    for (const f of FUNDS) await send("updatePiggybank", [uid, f, -pay.split[f]]);
  };

  return {
    loading,
    offline,
    error,
    reload: load,
    users,
    acts,
    visibleActs,
    /** false finché la migrazione `activities_hidden` non è applicata. */
    canHideActs: api.schema.activityHidden,
    pins,
    penalizeActivity,
    todayPts,
    weekPts,
    weekPtsOn,
    pendingCnt,
    allPending,
    todayDone,
    periodDone,
    todayByTod,
    periodSeries,
    findAct,
    addAct,
    updateAct,
    delAct,
    delActs,
    toggleActHidden,
    toggleActHiddenMany,
    addLog,
    addBonus,
    approve,
    reject,
    approveMany,
    rejectMany,
    editLogNote,
    withdrawLog,
    revoke,
    delLog,
    deductPoints,
    setAvatar,
    setPhoto,
    setTheme,
    setBgPattern,
    setNickname,
    setPiggyNote,
    setPiggyName,
    addGift,
    piggyNamesSupported: api.schema.piggyName,
    setInvest,
    verifyPin,
    changePin,
    adminSetPin,
    resetPin,
    addSpesa,
    redeemPiggy,
    resetPiggy,
    interestSupported: api.schema.interest,
    addIncome,
    pendingAllowance,
    unconfirmedAllowances,
    confirmIncome,
    addWish,
    updateWish,
    delWish,
    buyWish,
    syncBadges,
    upsertMission,
    toggleMissHidden,
    toggleMissHiddenMany,
    delMissions,
    /** false finché la migrazione `missions_hidden` non è applicata. */
    canHideMiss: api.schema.missionHidden,
    delMission,
    bumpMission,
    syncMissions,
    missionAwardsSupported: api.schema.missionDone,
    payments,
    paymentFor,
    duePreview,
    payBlock,
    payableWeeks,
    payWeek,
    undoPayment,
  };
}

export type SupabaseApi = ReturnType<typeof useSupabase>;
export type UsersApi = SupabaseApi;
export type ActivitiesApi = SupabaseApi;
