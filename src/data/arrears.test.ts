// node --test src/data/arrears.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { arrearsOf, canNudge, weeksWithActivityToClose, type ArrearsLog } from "./arrears.ts";

/** Martedì 24/11/2026: la settimana del 16/11 è finita, quella del 23/11 no. */
const TUE = new Date(2026, 10, 24, 12);

const ok = (date: string, pts: number, paid = false): ArrearsLog => ({ date, pts, ok: true, paid });
const waiting = (date: string, pts: number): ArrearsLog => ({ date, pts, ok: false });
const rejected = (date: string, pts: number): ArrearsLog => ({ date, pts, ok: false, rejected: true });

test("le settimane senza nessuna attività non compaiono", () => {
  const logs = [ok("2026-09-01", 100), ok("2026-10-06", 50)];
  // 7, 14, 21, 28 settembre e 2 novembre restano vuote: nessuna va pagata
  assert.deepEqual(weeksWithActivityToClose(logs, new Set(), TUE), ["2026-10-05", "2026-08-31"]);
});

test("una settimana con le sole voci da approvare va in elenco", () => {
  assert.deepEqual(weeksWithActivityToClose([waiting("2026-11-17", 58)], new Set(), TUE), ["2026-11-16"]);
});

test("una settimana con le sole voci rifiutate conta come vuota", () => {
  assert.deepEqual(weeksWithActivityToClose([rejected("2026-11-17", 5)], new Set(), TUE), []);
});

test("voci già pagate senza riga di paghetta non riaprono la settimana", () => {
  // caso reale di Samira, settimana del 17/08: 3 punti segnati come pagati
  assert.deepEqual(weeksWithActivityToClose([ok("2026-08-20", 3, true)], new Set(), TUE), []);
});

test("le settimane già saldate e quella in corso restano fuori", () => {
  const logs = [ok("2026-08-25", 450), ok("2026-11-24", 10)];
  assert.deepEqual(weeksWithActivityToClose(logs, new Set(["2026-08-24"]), TUE), []);
});

test("arretrati di Mia al 24/11: 8 settimane, €16", () => {
  const logs = [
    ok("2026-08-25", 450, true),
    ok("2026-09-01", 176),
    ok("2026-09-08", 48),
    ok("2026-10-06", 238),
    ok("2026-10-13", 102),
    ok("2026-10-20", 77),
    ok("2026-10-27", 150),
    ok("2026-11-10", 35),
    waiting("2026-11-11", 69),
    waiting("2026-11-17", 58),
  ];
  const a = arrearsOf(logs, new Set(["2026-08-24"]), TUE);
  assert.equal(a.weeks.length, 8);
  assert.equal(a.amount, 16);
  assert.equal(a.waiting, 2);
  const nov9 = a.weeks.find((w) => w.week === "2026-11-09")!;
  assert.deepEqual([nov9.pts, nov9.waitingPts, nov9.amount], [35, 69, 2]);
});

test("la fascia si calcola sui punti approvati", () => {
  const a = arrearsOf([ok("2026-11-16", 260), waiting("2026-11-17", 300)], new Set(), TUE);
  assert.equal(a.amount, 5);
});

test("promemoria a papà: una volta ogni 7 giorni", () => {
  assert.equal(canNudge(null, TUE), true);
  assert.equal(canNudge("2026-11-20T10:00:00Z", TUE), false);
  assert.equal(canNudge("2026-11-17T10:00:00Z", TUE), true);
});
