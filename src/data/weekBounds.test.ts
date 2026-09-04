import assert from "node:assert/strict";
import { test } from "node:test";
import { isoDate, weekStartOf } from "./constants.ts";
import { fromISO, getWeekBounds, getWeekPts, isWeekOver, pastWeeks, prevWeekStart, weekEnd, weekLabel, weekLogs, weekRange } from "./weekBounds.ts";

/** 2026-09-02 è un mercoledì: la sua settimana va da lunedì 31/08 a domenica 06/09. */
const WED = new Date(2026, 8, 2, 15, 30);

test("getWeekBounds parte dal lunedì a mezzanotte", () => {
  const { start } = getWeekBounds(WED);
  assert.equal(isoDate(start), "2026-08-31");
  assert.equal(start.getDay(), 1);
  assert.deepEqual([start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds()], [0, 0, 0, 0]);
});

test("getWeekBounds finisce la domenica a fine giornata", () => {
  const { end } = getWeekBounds(WED);
  assert.equal(isoDate(end), "2026-09-06");
  assert.equal(end.getDay(), 0);
  assert.deepEqual([end.getHours(), end.getMinutes(), end.getSeconds(), end.getMilliseconds()], [23, 59, 59, 999]);
});

test("la domenica appartiene alla settimana che finisce, non a quella che comincia", () => {
  const sunday = new Date(2026, 8, 6, 23, 0);
  assert.deepEqual(weekRange(sunday), { from: "2026-08-31", to: "2026-09-06" });
  const monday = new Date(2026, 8, 7, 0, 5);
  assert.deepEqual(weekRange(monday), { from: "2026-09-07", to: "2026-09-13" });
});

test("ogni giorno della stessa settimana dà gli stessi estremi", () => {
  const days = ["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06"];
  const ranges = days.map((d) => weekRange(fromISO(d)));
  ranges.forEach((r) => assert.deepEqual(r, { from: "2026-08-31", to: "2026-09-06" }));
});

test("weekStartOf e getWeekBounds restano d'accordo su un anno intero", () => {
  const d = new Date(2026, 0, 1);
  for (let i = 0; i < 366; i++) {
    assert.equal(weekStartOf(d), isoDate(getWeekBounds(d).start), `disallineati il ${isoDate(d)}`);
    d.setDate(d.getDate() + 1);
  }
});

test("prevWeekStart torna al lunedì precedente", () => {
  assert.equal(prevWeekStart(WED), "2026-08-24");
  assert.equal(prevWeekStart(new Date(2026, 8, 6)), "2026-08-24");
  assert.equal(prevWeekStart(new Date(2026, 8, 7)), "2026-08-31");
});

const log = (date: string, pts: number, ok = true) => ({ date, pts, ok });

test("getWeekPts somma solo i log approvati della settimana", () => {
  const logs = [
    log("2026-08-30", 100), // domenica precedente: settimana scorsa
    log("2026-08-31", 10), // lunedì
    log("2026-09-02", 20), // mercoledì
    log("2026-09-06", 5), // domenica
    log("2026-09-07", 50), // lunedì successivo
    log("2026-09-02", 999, false), // in attesa di approvazione
  ];
  assert.equal(getWeekPts(logs, WED), 35);
});

test("le settimane non si mescolano: ogni voce pesa solo nella sua", () => {
  const logs = [log("2026-08-25", 40), log("2026-09-01", 30), log("2026-09-08", 20)];
  assert.equal(getWeekPts(logs, fromISO("2026-08-24")), 40);
  assert.equal(getWeekPts(logs, WED), 30);
  assert.equal(getWeekPts(logs, fromISO("2026-09-07")), 20);
});

test("approvare in ritardo non sposta i punti di settimana", () => {
  // attività fatta martedì, approvata mercoledì: resta nella settimana di martedì
  const late = [log("2026-09-01", 15)];
  assert.equal(getWeekPts(late, WED), 15);
  // attività della settimana scorsa approvata oggi: non entra in quella corrente
  const older = [log("2026-08-26", 15)];
  assert.equal(getWeekPts(older, WED), 0);
  assert.equal(getWeekPts(older, fromISO("2026-08-24")), 15);
});

test("i punti negativi delle penalità abbassano la settimana", () => {
  assert.equal(getWeekPts([log("2026-09-02", 20), log("2026-09-03", -8)], WED), 12);
});

test("weekLogs restituisce le voci della settimana, approvate o no", () => {
  const logs = [log("2026-08-30", 1), log("2026-09-02", 2), log("2026-09-03", 3, false), log("2026-09-07", 4)];
  assert.deepEqual(weekLogs(logs, WED).map((l) => l.date), ["2026-09-02", "2026-09-03"]);
});

test("fromISO resta sullo stesso giorno del calendario", () => {
  assert.equal(isoDate(fromISO("2026-03-29")), "2026-03-29"); // notte del cambio ora legale
  assert.equal(isoDate(fromISO("2026-10-25")), "2026-10-25");
});

test("weekEnd dà la domenica della settimana", () => {
  assert.equal(weekEnd("2026-08-31"), "2026-09-06");
  assert.equal(weekEnd("2026-12-28"), "2027-01-03"); // a cavallo dell'anno
});

test("una settimana è conclusa solo dal lunedì dopo", () => {
  // settimana 31/08–06/09
  assert.equal(isWeekOver("2026-08-31", WED), false); // mercoledì: ancora in corso
  assert.equal(isWeekOver("2026-08-31", fromISO("2026-09-06")), false); // domenica: ultimo giorno
  assert.equal(isWeekOver("2026-08-31", fromISO("2026-09-07")), true); // lunedì: conclusa
  assert.equal(isWeekOver("2026-08-24", WED), true); // quella prima è conclusa da un pezzo
});

test("pastWeeks elenca solo settimane concluse, dalla più recente", () => {
  assert.deepEqual(pastWeeks(3, WED), ["2026-08-24", "2026-08-17", "2026-08-10"]);
  // la settimana in corso non compare mai
  assert.equal(pastWeeks(8, WED).includes("2026-08-31"), false);
  pastWeeks(8, WED).forEach((w) => assert.equal(isWeekOver(w, WED), true, `${w} non è conclusa`));
});

test("weekLabel mostra lunedì e domenica in giorno/mese", () => {
  assert.equal(weekLabel("2026-08-24"), "24/08 – 30/08");
});
