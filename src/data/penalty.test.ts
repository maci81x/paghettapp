// node --test src/data/penalty.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { isPenalty } from "./constants.ts";
import { ownProgress } from "./missions.ts";
import type { LogEntry, Mission, User } from "./types.ts";

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
