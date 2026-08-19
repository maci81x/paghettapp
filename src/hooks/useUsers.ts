import { useCallback } from "react";
import { BONUS_ACT, PERIOD_DAYS, SPLIT, USER_IDS, getTier, getWeekStart, isoDate, nowTod, splitAllowance, splitByPct, todayISO } from "../data/constants";
import { initUsers } from "../data/defaults";
import { useLocalStorage } from "../data/storage";
import type { Fund, IncomeEntry, InvestCfg, Mission, Payment, Period, Tod, User, UserId, Users, Wish } from "../data/types";

/** Assegna i badge non ancora sbloccati, annotando il giorno. */
const grant = (u: User, ids: string[]): User => {
  const have = u.badges ?? [];
  const fresh = ids.filter((id) => !have.includes(id));
  if (fresh.length === 0) return u;
  const at = { ...(u.badgeAt ?? {}) };
  fresh.forEach((id) => {
    at[id] = todayISO();
  });
  return { ...u, badges: [...have, ...fresh], badgeAt: at };
};

/** Badge meritati in base allo stato attuale (first_invest si sblocca invece agendo). */
const earnedBadges = (u: User, actIds: number[]): string[] => {
  const out: string[] = [];
  const weekPts = u.log.filter((l) => l.ok && !l.paid).reduce((s, l) => s + l.pts, 0);
  if (weekPts >= 500 || (u.pays ?? []).some((p) => p.pts >= 500)) out.push("first_15");
  if (u.streak >= 10) out.push("streak_10");
  if (u.streak >= 30) out.push("streak_30");
  if (u.w.risparmio >= 100) out.push("saver_100");
  if ((u.wishes ?? []).some((w) => w.done)) out.push("wish_bought");

  const byDay = new Map<string, { pts: number; acts: Set<number> }>();
  u.log.forEach((l) => {
    if (!l.ok) return;
    const d = byDay.get(l.date) ?? { pts: 0, acts: new Set<number>() };
    d.pts += l.pts;
    d.acts.add(l.actId);
    byDay.set(l.date, d);
  });
  for (const d of byDay.values()) {
    if (d.pts >= 100) out.push("pts_100_day");
    if (actIds.length > 0 && actIds.every((id) => d.acts.has(id))) out.push("all_activities");
  }
  return out;
};

export function useUsers() {
  const [users, setUsers] = useLocalStorage<Users>("users", initUsers);

  const patch = useCallback(
    (uid: UserId, fn: (u: User) => User) => setUsers((p) => ({ ...p, [uid]: fn(p[uid]) })),
    [setUsers],
  );

  /* ── letture ── */
  const todayPts = (uid: UserId) =>
    users[uid].log.filter((l) => l.date === todayISO() && l.ok).reduce((s, l) => s + l.pts, 0);

  /**
   * Punti che concorrono alla prossima paghetta: approvati e non ancora accreditati.
   * Si azzerano quando l'admin paga la settimana; i punti guadagnati dopo l'accredito
   * restano validi e confluiscono nel pagamento successivo.
   */
  const weekPts = (uid: UserId) => users[uid].log.filter((l) => l.ok && !l.paid).reduce((s, l) => s + l.pts, 0);

  const pendingCnt = (uid: UserId) => users[uid].log.filter((l) => !l.ok).length;

  const allPending = USER_IDS.reduce((s, uid) => s + pendingCnt(uid), 0);

  /** Quante volte l'attività è già stata segnata oggi (approvata o no). */
  const todayDone = (uid: UserId, actId: number) =>
    users[uid].log.filter((l) => l.date === todayISO() && l.actId === actId).reduce((s, l) => s + l.cnt, 0);

  /** Completamenti di oggi divisi per momento della giornata: alimenta i chip della lista. */
  const todayByTod = (uid: UserId, actId: number) => {
    const out: Record<Tod, number> = { mattina: 0, pomeriggio: 0, sera: 0 };
    users[uid].log
      .filter((l) => l.date === todayISO() && l.actId === actId)
      .forEach((l) => {
        out[l.tod] += l.cnt;
      });
    return out;
  };

  /** Punti e spese giorno per giorno sul periodo scelto: alimenta il grafico Wallet. */
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
          // le spese sono salvate come "gg/mm": le riporto all'anno corrente
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

  /* ── scritture ── */
  const addLog = (uid: UserId, actId: number, cnt: number, note: string, tod: Tod, pts: number) =>
    patch(uid, (u) => ({
      ...u,
      log: [...u.log, { id: Date.now(), actId, date: todayISO(), cnt, note, tod, pts, ok: false }],
    }));

  /**
   * Punti bonus assegnati dall'admin: già approvati, quindi entrano subito nei
   * punti totali e in quelli della settimana (contano per il tier).
   */
  const addBonus = (uid: UserId, pts: number, reason: string) =>
    patch(uid, (u) => ({
      ...u,
      totalPts: u.totalPts + pts,
      log: [...u.log, { id: Date.now(), actId: BONUS_ACT, date: todayISO(), cnt: 1, note: reason, tod: nowTod(), pts, ok: true }],
    }));

  const approve = (uid: UserId, logId: number) =>
    patch(uid, (u) => {
      const entry = u.log.find((l) => l.id === logId);
      if (!entry || entry.ok) return u;
      return { ...u, log: u.log.map((l) => (l.id === logId ? { ...l, ok: true } : l)), totalPts: u.totalPts + entry.pts };
    });

  const reject = (uid: UserId, logId: number) => patch(uid, (u) => ({ ...u, log: u.log.filter((l) => l.id !== logId) }));

  const setAvatar = (uid: UserId, av: string) => patch(uid, (u) => ({ ...u, av }));

  /* ── personalizzazione del profilo ── */

  const setPhoto = (uid: UserId, photo?: string) => patch(uid, (u) => ({ ...u, profilePhoto: photo }));

  const setTheme = (uid: UserId, themeColors: { from: string; to: string }) => patch(uid, (u) => ({ ...u, themeColors }));

  const setBgPattern = (uid: UserId, bgPattern: string) => patch(uid, (u) => ({ ...u, bgPattern }));

  /** Nickname: vuoto = torna al nome di battesimo. */
  const setNickname = (uid: UserId, nickname: string) => patch(uid, (u) => ({ ...u, nickname: nickname.trim().slice(0, 15) }));

  const setPiggyNote = (uid: UserId, fund: Fund, note: string) => patch(uid, (u) => ({ ...u, wN: { ...u.wN, [fund]: note } }));

  const setInvest = (uid: UserId, key: keyof InvestCfg, value: number) =>
    patch(uid, (u) => grant({ ...u, inv: { ...u.inv, [key]: key === "mo" ? Math.max(12, value) : Math.max(0, value) } }, ["first_invest"]));

  const addSpesa = (uid: UserId, ds: string, amount: number, fund: Fund) =>
    patch(uid, (u) => ({
      ...u,
      spese: [{ id: Date.now(), d: new Date().toLocaleDateString("it", { day: "2-digit", month: "2-digit" }), ds, a: amount, f: fund }, ...u.spese],
      w: { ...u.w, [fund]: Math.max(0, u.w[fund] - amount) },
    }));

  /* ── entrate ── */

  /**
   * Registra un'entrata (regalo, lavoretto, paghetta) e la divide sui tre
   * salvadanai secondo le percentuali indicate.
   */
  const addIncome = (uid: UserId, entry: Omit<IncomeEntry, "id">) => {
    const q = splitByPct(entry.amount, entry.split);
    patch(uid, (u) => ({
      ...u,
      w: {
        risparmio: +(u.w.risparmio + q.risparmio).toFixed(2),
        personale: +(u.w.personale + q.personale).toFixed(2),
        beneficenza: +(u.w.beneficenza + q.beneficenza).toFixed(2),
      },
      income: [{ ...entry, id: Date.now() }, ...(u.income ?? [])],
    }));
  };

  /* ── lista desideri ── */

  const addWish = (uid: UserId, wish: Omit<Wish, "id" | "done">) =>
    patch(uid, (u) => ({ ...u, wishes: [...(u.wishes ?? []), { ...wish, id: Date.now(), done: false }] }));

  const updateWish = (uid: UserId, id: number, wish: Omit<Wish, "id" | "done">) =>
    patch(uid, (u) => ({ ...u, wishes: (u.wishes ?? []).map((w) => (w.id === id ? { ...w, ...wish } : w)) }));

  const delWish = (uid: UserId, id: number) => patch(uid, (u) => ({ ...u, wishes: (u.wishes ?? []).filter((w) => w.id !== id) }));

  /** Segna il desiderio come comprato e scala il costo dal salvadanaio scelto. */
  const buyWish = (uid: UserId, id: number) =>
    patch(uid, (u) => {
      const w = (u.wishes ?? []).find((x) => x.id === id);
      if (!w || w.done) return u;
      return grant(
        {
          ...u,
          w: { ...u.w, [w.fund]: Math.max(0, +(u.w[w.fund] - w.cost).toFixed(2)) },
          wishes: (u.wishes ?? []).map((x) => (x.id === id ? { ...x, done: true } : x)),
          spese: [
            { id: Date.now(), d: new Date().toLocaleDateString("it", { day: "2-digit", month: "2-digit" }), ds: `🎁 ${w.name}`, a: w.cost, f: w.fund },
            ...u.spese,
          ],
        },
        ["wish_bought"],
      );
    });

  /* ── badge ── */

  /** Sblocca i badge meritati; ritorna quelli nuovi, per il toast. */
  const syncBadges = (actIds: number[]) => {
    const fresh: { uid: UserId; id: string }[] = [];
    USER_IDS.forEach((uid) => {
      const u = users[uid];
      const have = u.badges ?? [];
      earnedBadges(u, actIds)
        .filter((id) => !have.includes(id))
        .forEach((id) => {
          if (!fresh.some((f) => f.uid === uid && f.id === id)) fresh.push({ uid, id });
        });
    });
    if (fresh.length > 0) {
      setUsers((p) => {
        const next = { ...p };
        USER_IDS.forEach((uid) => {
          const ids = fresh.filter((f) => f.uid === uid).map((f) => f.id);
          if (ids.length > 0) next[uid] = grant(next[uid], ids);
        });
        return next;
      });
    }
    return fresh;
  };

  /**
   * Crea o aggiorna una missione. La stessa missione vive con lo stesso id su
   * entrambe le figlie: cambiare assegnataria la toglie a chi non la ha più.
   */
  const upsertMission = (id: number | undefined, targets: UserId[], mission: Omit<Mission, "id">) => {
    const mid = id ?? Date.now();
    setUsers((p) => {
      const next = { ...p };
      USER_IDS.forEach((uid) => {
        const prev = next[uid].miss.find((m) => m.id === mid);
        if (!targets.includes(uid)) {
          if (prev) next[uid] = { ...next[uid], miss: next[uid].miss.filter((m) => m.id !== mid) };
          return;
        }
        // il progresso già maturato non si perde con una modifica
        const entry: Mission = { ...mission, id: mid, prog: prev?.prog ?? mission.prog, since: prev?.since ?? mission.since };
        next[uid] = { ...next[uid], miss: prev ? next[uid].miss.map((m) => (m.id === mid ? entry : m)) : [...next[uid].miss, entry] };
      });
      return next;
    });
  };

  const delMission = (uid: UserId, id: number) => patch(uid, (u) => ({ ...u, miss: u.miss.filter((m) => m.id !== id) }));

  /* ── paghetta settimanale ── */

  const payments = (uid: UserId): Payment[] => users[uid].pays ?? [];

  /** Pagamento già accreditato per la settimana indicata (default: quella corrente). */
  const paymentFor = (uid: UserId, week = getWeekStart()) => payments(uid).find((p) => p.week === week);

  /** Anteprima di quanto spetta: punti non ancora accreditati e relativo tier. */
  const duePreview = (uid: UserId) => {
    const pts = weekPts(uid);
    const amount = getTier(pts).r;
    return { pts, amount, split: splitAllowance(amount) };
  };

  /**
   * Accredita la paghetta della settimana corrente sui tre salvadanai (30/60/10)
   * e marca come pagate le voci di log conteggiate: il contatore settimanale riparte da 0.
   * I punti totali (livelli) non vengono toccati.
   * Idempotente: una settimana già pagata non viene riaccreditata.
   */
  const payWeek = (uid: UserId) => {
    const week = getWeekStart();
    if (paymentFor(uid, week)) return false;
    const { pts, amount, split } = duePreview(uid);
    const logIds = users[uid].log.filter((l) => l.ok && !l.paid).map((l) => l.id);
    // stesso id per pagamento ed entrata: annullare la settimana rimuove entrambi
    const id = Date.now();
    patch(uid, (u) => ({
      ...u,
      w: {
        risparmio: +(u.w.risparmio + split.risparmio).toFixed(2),
        personale: +(u.w.personale + split.personale).toFixed(2),
        beneficenza: +(u.w.beneficenza + split.beneficenza).toFixed(2),
      },
      log: u.log.map((l) => (logIds.includes(l.id) ? { ...l, paid: true } : l)),
      pays: [{ id, week, date: todayISO(), pts, amount, split, logIds }, ...(u.pays ?? [])],
      income: [
        {
          id,
          date: todayISO(),
          amount,
          source: "Paghetta settimanale",
          split: { risparmio: SPLIT.risparmio * 100, personale: SPLIT.personale * 100, beneficenza: SPLIT.beneficenza * 100 },
          type: "paghetta" as const,
        },
        ...(u.income ?? []),
      ],
    }));
    return true;
  };

  /** Annulla l'accredito di una settimana: storna i salvadanai e rimette in conto i punti. */
  const undoPayment = (uid: UserId, week: string) =>
    patch(uid, (u) => {
      const pay = (u.pays ?? []).find((p) => p.week === week);
      if (!pay) return u;
      const ids = pay.logIds ?? [];
      return {
        ...u,
        w: {
          risparmio: Math.max(0, +(u.w.risparmio - pay.split.risparmio).toFixed(2)),
          personale: Math.max(0, +(u.w.personale - pay.split.personale).toFixed(2)),
          beneficenza: Math.max(0, +(u.w.beneficenza - pay.split.beneficenza).toFixed(2)),
        },
        log: u.log.map((l) => (ids.includes(l.id) ? { ...l, paid: false } : l)),
        pays: (u.pays ?? []).filter((p) => p.week !== week),
        income: (u.income ?? []).filter((i) => i.id !== pay.id),
      };
    });

  return {
    users,
    todayPts,
    weekPts,
    pendingCnt,
    allPending,
    todayDone,
    todayByTod,
    periodSeries,
    addLog,
    addBonus,
    approve,
    reject,
    setAvatar,
    setPhoto,
    setTheme,
    setBgPattern,
    setNickname,
    setPiggyNote,
    setInvest,
    addSpesa,
    addIncome,
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

export type UsersApi = ReturnType<typeof useUsers>;
