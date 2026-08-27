// node --test src/data/penalty.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { isPenalty } from "./constants.ts";
import { isPenalizable, penalizableToday, withPenalty } from "./penalty.ts";
import { ownProgress } from "./missions.ts";
import type { Activity, LogEntry, Mission, User } from "./types.ts";

const log = (over: Partial<LogEntry>): LogEntry =>
  ({ id: 1, actId: 7, date: "2026-08-25", cnt: 1, note: "", tod: "mattina", pts: 5, ok: true, ...over }) as LogEntry;

test("penalità = punti negativi su un'attività vera", () => {
  assert.equal(isPenalty(log({ pts: -5 })), true);
  assert.equal(isPenalty(log({ pts: 5 })), false);
  // bonus (-1) e punti tolti a mano (-2) non sono penalità di un'attività
  assert.equal(isPenalty(log({ actId: -2, pts: -10 })), false);
  assert.equal(isPenalty(log({ actId: -1, pts: -10 })), false);
});

test("con cnt 0 la penalità non consuma il limite né fa avanzare le missioni", () => {
  const penalty = log({ id: 2, pts: -5, cnt: 0 });
  // stesso conteggio usato da todayDone/periodDone
  assert.equal([penalty].reduce((s, l) => s + l.cnt, 0), 0);

  const m = { id: 1, actIds: [7], since: "2026-08-01", tgt: 3, prog: 0 } as Mission;
  const u = { log: [penalty] } as User;
  assert.equal(ownProgress(u, m, "mia"), 0);
});

test("la penalità pesa sui punti della settimana", () => {
  const week = [log({ pts: 10 }), log({ id: 2, pts: -5, cnt: 0 })];
  assert.equal(week.filter((l) => l.ok && !l.paid).reduce((s, l) => s + l.pts, 0), 5);
});

const act = (over: Partial<Activity>): Activity =>
  ({ id: 1, name: "A", cat: "casa", pts: 5, pen: 0, freq: "daily", max: 1, ch: 0, ...over }) as Activity;

test("un'attività già fatta oggi non è più penalizzabile", () => {
  const a = act({ id: 7, pen: -5 });
  assert.equal(isPenalizable(a, 0), true, "non ancora fatta: si può addebitare");
  assert.equal(isPenalizable(a, 1), false, "fatta una volta: niente penalità");
  assert.equal(isPenalizable(a, 3), false, "fatta più volte: idem");
});

test("senza penalità configurata non si addebita nulla", () => {
  assert.equal(isPenalizable(act({ pen: 0 }), 0), false);
  // una penalità positiva sarebbe un errore di configurazione: non conta
  assert.equal(isPenalizable(act({ pen: 5 }), 0), false);
});

test("l'elenco addebitabile esclude le fatte ma non le nasconde dal totale", () => {
  const acts = [
    act({ id: 1, name: "Letto", pen: -5 }),
    act({ id: 2, name: "Piatti", pen: -2 }),
    act({ id: 3, name: "Leggere", pen: 0 }),
  ];
  const done = (id: number) => (id === 2 ? 1 : 0);

  assert.deepEqual(withPenalty(acts).map((a) => a.id), [1, 2], "entrambe restano in elenco, una barrata");
  assert.deepEqual(penalizableToday(acts, done).map((a) => a.id), [1], "solo quella non fatta è addebitabile");
});

test("se ha fatto tutto, non resta niente da addebitare", () => {
  const acts = [act({ id: 1, pen: -5 }), act({ id: 2, pen: -3 })];
  assert.equal(penalizableToday(acts, () => 1).length, 0);
});
