import { useCallback, useEffect, useState } from "react";
import * as api from "../data/api";
import { BONUS_ACT_ID, DB_FUND, toActivity, toInvest, toLog, toMission, toWish } from "../data/api";
import { earnedBadges } from "../data/badges";
import {
  DEDUCT_ACT,
  DEFAULT_PINS,
  FUNDS,
  PERIOD_DAYS,
  SPLIT,
  USER_IDS,
  getTier,
  getWeekStart,
  isoDate,
  nowTod,
  periodStart,
  splitAllowance,
  splitByPct,
  todayISO,
  weekStartOf,
} from "../data/constants";
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
  createActivityLog: api.createActivityLog,
  approveLog: api.approveLog,
  rejectLog: api.rejectLog,
  updateLogNote: api.updateLogNote,
  revokeLog: api.revokeLog,
  deleteLog: api.deleteLog,
  deductPoints: api.deductPoints,
  markLogsPaid: api.markLogsPaid,
  createMission: api.createMission,
  updateMission: api.updateMission,
  deleteMission: api.deleteMission,
  updatePiggybank: api.updatePiggybank,
  setPiggybankNote: api.setPiggybankNote,
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
      });

    const logRows = rows.logs.filter((l) => l.user_id === uid);
    u.log = logRows.map(toLog);

    u.miss = rows.missions.filter((m) => m.assigned_to?.includes(uid)).map((m) => toMission(m, uid));

    u.spese = rows.expenses
      .filter((e) => e.user_id === uid)
      .map((e) => ({
        id: e.id,
        d: new Date(e.created_at).toLocaleDateString("it", { day: "2-digit", month: "2-digit" }),
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
        type: i.type === "allowance" ? "paghetta" : "extra",
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
          week: weekStartOf(new Date(row.created_at)),
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
    await Promise.all([api.probeSchema(), api.probePinRpc(), api.probeIncomeConfirm(), api.probeLogExtras()]);
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
    saveCache(snap);
    setOffline(false);
    setError(null);
    setLoading(false);
  }, []);

  /** Rispedisce le scritture rimaste in sospeso, poi ricarica. */
  const flush = useCallback(async () => {
    const pending = loadPending();
    if (pending.length === 0) return;
    const rest: PendingOp[] = [];
    for (const op of pending) {
      const res = await runOp(op);
      if (res.error) rest.push(op);
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

  const weekPts = (uid: UserId) => users[uid].log.filter((l) => l.ok && !l.paid).reduce((s, l) => s + l.pts, 0);

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

  /* ── attività ── */

  const draftToActivity = (d: ActivityDraft): Omit<Activity, "id"> => {
    const n = parseInt(d.duration, 10);
    return {
      name: d.name.trim(),
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

  /** Eliminazione multipla: una sola scrittura sullo stato, una chiamata per attività. */
  const delActs = async (ids: number[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    setActs((p) => p.filter((a) => !set.has(a.id)));
    for (const id of ids) await send("deleteActivity", [id]);
  };

  /* ── completamenti ── */

  const addLog = async (uid: UserId, actId: number, cnt: number, note: string, tod: Tod, pts: number) => {
    const row = await send<api.LogRow>("createActivityLog", [{ userId: uid, actId, pts, cnt, tod, note }]);
    const entry: LogEntry = row ? toLog(row) : { id: Date.now(), actId, date: todayISO(), cnt, note, tod, pts, ok: false };
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
   * Annulla un'approvazione già data: i punti escono dal totale e — se la voce
   * non è ancora stata pagata — anche dalla settimana in corso, perché
   * `weekPts` somma solo i log approvati e non saldati. Le missioni collegate
   * si aggiornano da sole: il loro progresso guarda i log approvati.
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
        { id: Date.now(), d: new Date().toLocaleDateString("it", { day: "2-digit", month: "2-digit" }), ds: `🎁 ${w.name}`, a: w.cost, f: w.fund },
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
          const entry: Mission = { ...mission, id, prog: prev?.prog ?? mission.prog, since: prev?.since ?? mission.since };
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

  /** L'id della missione è lo stesso per entrambe: la tolgo a tutte e due. */
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

  const duePreview = (uid: UserId) => {
    const pts = weekPts(uid);
    const amount = getTier(pts).r;
    return { pts, amount, split: splitAllowance(amount) };
  };

  const payWeek = async (uid: UserId) => {
    const week = getWeekStart();
    if (paymentFor(uid, week)) return false;
    const { pts, amount, split } = duePreview(uid);
    const logIds = users[uid].log.filter((l) => l.ok && !l.paid).map((l) => l.id);

    const row = await send<api.IncomeRow>("createIncome", [
      { userId: uid, type: "allowance", amount, note: "Paghetta settimanale", quote: split, tier: amount, weekPts: pts },
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
          source: "Paghetta settimanale",
          split: { risparmio: SPLIT.risparmio * 100, personale: SPLIT.personale * 100, beneficenza: SPLIT.beneficenza * 100 },
          type: "paghetta" as const,
          confirmed,
        },
        ...(u.income ?? []),
      ],
    }));
    return true;
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
    pins,
    todayPts,
    weekPts,
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
    addLog,
    addBonus,
    approve,
    reject,
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
    setInvest,
    verifyPin,
    changePin,
    adminSetPin,
    resetPin,
    addSpesa,
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
    delMission,
    payments,
    paymentFor,
    duePreview,
    payWeek,
    undoPayment,
  };
}

export type SupabaseApi = ReturnType<typeof useSupabase>;
export type UsersApi = SupabaseApi;
export type ActivitiesApi = SupabaseApi;
