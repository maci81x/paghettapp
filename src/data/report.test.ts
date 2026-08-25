// node --test src/data/report.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { ownProgress } from "./missions.ts";
import type { LogEntry, Mission, User } from "./types.ts";

const log = (id: number, actId: number, date: string, cnt: number, ok: boolean): LogEntry => ({
  id,
  actId,
  date,
  cnt,
  note: "",
  tod: "mattina",
  pts: 5,
  ok,
});

const mission = (over: Partial<Mission> = {}): Mission => ({
  id: 1,
  name: "M",
  desc: "",
  prog: 3,
  tgt: 5,
  pts: 10,
  team: false,
  deadline: "",
  assignee: "mia",
  actIds: [6, 19],
  since: "2026-08-10",
  emoji: "🎯",
  ...over,
});

const user = (entries: LogEntry[]) => ({ log: entries }) as User;

test("il progresso conta i completamenti approvati delle attività collegate", () => {
  const u = user([
    log(1, 6, "2026-08-12", 1, true),
    log(2, 6, "2026-08-13", 2, true), // stessa attività, altro giorno: si somma
    log(3, 19, "2026-08-13", 1, true),
  ]);
  assert.equal(ownProgress(u, mission(), "mia"), 4);
});

test("non contano i log non approvati, di altre attività o precedenti alla missione", () => {
  const u = user([
    log(1, 6, "2026-08-12", 1, false), // in attesa
    log(2, 1, "2026-08-12", 1, true), // attività non collegata
    log(3, 6, "2026-08-09", 1, true), // prima della creazione
    log(4, 19, "2026-08-11", 1, true), // valido
  ]);
  assert.equal(ownProgress(u, mission(), "mia"), 1);
});

test("senza attività collegate resta il contatore manuale", () => {
  const u = user([log(1, 6, "2026-08-12", 4, true)]);
  assert.equal(ownProgress(u, mission({ actIds: [], progBy: { mia: 3 } }), "mia"), 3);
});
