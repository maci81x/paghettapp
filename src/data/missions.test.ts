// node --test src/data/missions.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { assignees, byState, missionProgress, missionState, ownProgress, toAward, visibleMissions } from "./missions.ts";
import type { LogEntry, Mission, User, Users } from "./types.ts";

const TODAY = new Date(2026, 7, 20); // 20 agosto 2026

const log = (id: number, actId: number, date: string, cnt: number, ok = true, revoked = false): LogEntry => ({
  id,
  actId,
  date,
  cnt,
  note: "",
  tod: "mattina",
  pts: 5,
  ok,
  revoked,
});

const mission = (over: Partial<Mission> = {}): Mission => ({
  id: 1,
  name: "M",
  emoji: "🎯",
  desc: "",
  prog: 0,
  tgt: 10,
  pts: 50,
  team: false,
  deadline: "",
  assignee: "both",
  actIds: [6],
  since: "2026-08-01",
  ...over,
});

const users = (mia: LogEntry[], sam: LogEntry[]): Users => ({ mia: { log: mia } as User, samira: { log: sam } as User });

test("in squadra i contributi si sommano verso un obiettivo comune", () => {
  const us = users([log(1, 6, "2026-08-10", 4)], [log(2, 6, "2026-08-11", 3)]);
  const m = mission({ team: true });
  const p = missionProgress(us, m, "mia");
  assert.equal(p.own, 4);
  assert.equal(p.current, 7, "somma dei due contributi");
  assert.deepEqual(p.byUser, { mia: 4, samira: 3 });
  assert.equal(p.done, false);
  // stesso quadro visto dall'altra sorella: cambia solo `own`
  assert.equal(missionProgress(us, m, "samira").current, 7);
  assert.equal(missionProgress(us, m, "samira").own, 3);
});

test("da sole ognuna corre verso il proprio obiettivo", () => {
  const us = users([log(1, 6, "2026-08-10", 10)], [log(2, 6, "2026-08-11", 3)]);
  const m = mission({ team: false });
  assert.equal(missionProgress(us, m, "mia").done, true);
  assert.equal(missionProgress(us, m, "samira").done, false, "il traguardo di una non conta per l'altra");
  assert.equal(missionProgress(us, m, "samira").current, 3);
});

test("il progresso ignora i log non approvati, annullati, di altre attività o precedenti", () => {
  const us = users(
    [
      log(1, 6, "2026-08-10", 5, false), // in attesa
      log(2, 6, "2026-08-10", 5, true, true), // annullato dall'admin
      log(3, 9, "2026-08-10", 5), // attività non collegata
      log(4, 6, "2026-07-30", 5), // prima della creazione
      log(5, 6, "2026-08-10", 2), // valido
    ],
    [],
  );
  assert.equal(ownProgress(us.mia, mission(), "mia"), 2);
});

test("la percentuale non supera il 100 anche oltre l'obiettivo", () => {
  const us = users([log(1, 6, "2026-08-10", 99)], []);
  const p = missionProgress(us, mission(), "mia");
  assert.equal(p.current, 99, "il conteggio grezzo resta");
  assert.equal(p.pct, 100, "la barra si ferma");
  assert.equal(p.done, true);
});

test("il contatore manuale vale quando non ci sono attività collegate", () => {
  const us = users([log(1, 6, "2026-08-10", 7)], []);
  const m = mission({ actIds: [], progBy: { mia: 4, samira: 1 } });
  assert.equal(missionProgress(us, m, "mia").own, 4, "i log non contano su una missione manuale");
  assert.equal(missionProgress(us, { ...m, team: true }, "mia").current, 5);
});

test("stato: completata batte scaduta", () => {
  assert.equal(missionState(mission({ deadline: "2026-08-01" }), false, TODAY), "expired");
  assert.equal(missionState(mission({ deadline: "2026-08-01" }), true, TODAY), "done");
  assert.equal(missionState(mission({ deadline: "2026-09-01" }), false, TODAY), "active");
  assert.equal(missionState(mission({ deadline: "" }), false, TODAY), "active");
});

test("ordinamento: prima le attive, poi le completate, in fondo le scadute", () => {
  const rows = [
    { state: "expired" as const, m: mission({ id: 1 }) },
    { state: "done" as const, m: mission({ id: 2 }) },
    { state: "active" as const, m: mission({ id: 3 }) },
  ];
  assert.deepEqual(rows.slice().sort(byState).map((r) => r.state), ["active", "done", "expired"]);
});

test("assignees segue l'assegnazione", () => {
  assert.deepEqual(assignees(mission({ assignee: "both" })), ["mia", "samira"]);
  assert.deepEqual(assignees(mission({ assignee: "mia" })), ["mia"]);
});

test("in squadra il premio va a entrambe, una volta sola", () => {
  const us = users([log(1, 6, "2026-08-10", 6)], [log(2, 6, "2026-08-11", 4)]);
  const m = mission({ team: true });
  assert.deepEqual(toAward(us, m), ["mia", "samira"], "obiettivo comune raggiunto insieme");
  // chi è già stato premiato non torna nell'elenco
  assert.deepEqual(toAward(us, { ...m, completedBy: { mia: "2026-08-19" } }), ["samira"]);
  assert.deepEqual(toAward(us, { ...m, completedBy: { mia: "2026-08-19", samira: "2026-08-19" } }), []);
});

test("da sole il premio va solo a chi ha finito", () => {
  const us = users([log(1, 6, "2026-08-10", 10)], [log(2, 6, "2026-08-11", 2)]);
  assert.deepEqual(toAward(us, mission({ team: false })), ["mia"]);
});

test("nessun premio prima dell'obiettivo", () => {
  const us = users([log(1, 6, "2026-08-10", 9)], [log(2, 6, "2026-08-11", 9)]);
  assert.deepEqual(toAward(us, mission({ team: false })), []);
});

test("le missioni nascoste spariscono per le ragazze ma restano nel modello", () => {
  const aperta = mission({ id: 1 });
  const nascosta = mission({ id: 2, hidden: true });
  const u = { miss: [aperta, nascosta] } as User;

  assert.deepEqual(
    visibleMissions(u).map((m) => m.id),
    [1],
    "la ragazza vede solo quella visibile",
  );
  assert.equal(u.miss.length, 2, "l'admin continua a vederle entrambe");

  // il progresso non viene toccato: rimostrandola riprende da dov'era
  assert.equal(nascosta.prog, aperta.prog);
});

test("senza il campo hidden le missioni restano tutte visibili", () => {
  const u = { miss: [mission({ id: 1 }), mission({ id: 2 })] } as User;
  assert.equal(visibleMissions(u).length, 2);
});
