// node --test src/utils/dates.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { allowanceNote, allowanceWeek, getWeekStart, monthKey, periodStart, todayISO } from "../data/constants.ts";
import { fmtDay, fmtDayTime } from "./dates.ts";

test("il giorno si legge sia da una data sia da un timestamp", () => {
  assert.equal(fmtDay("2026-08-24"), "24/08");
  assert.equal(fmtDay("2026-08-24T13:05:00.000Z"), "24/08");
  assert.equal(fmtDay("boh"), "boh", "un valore non riconosciuto resta com'è");
});

test("l'ora compare solo quando il campo la contiene davvero", () => {
  assert.equal(fmtDayTime("2026-08-24"), "24/08");

  // costruito sul fuso locale: il confronto non dipende da dove gira il test
  const local = new Date(2026, 7, 24, 9, 7);
  assert.equal(fmtDayTime(local.toISOString()), "24/08 alle 09:07");
});

test("il periodo di validità del limite dipende dalla frequenza", () => {
  assert.equal(periodStart("daily"), todayISO());
  assert.equal(periodStart("weekly"), getWeekStart());
  assert.equal(periodStart("monthly"), `${monthKey(0)}-01`);

  // un'attività settimanale resta disponibile per tutta la settimana
  assert.ok(periodStart("weekly") <= todayISO());
  assert.ok(periodStart("monthly") <= todayISO());
});

test("la settimana saldata si rilegge dalla nota dell'accredito", () => {
  assert.equal(allowanceWeek(allowanceNote("2026-08-24")), "2026-08-24");
  // le righe scritte prima di questa nota non portano la settimana: chi legge fa il fallback
  assert.equal(allowanceWeek("Paghetta settimanale"), "");
  assert.equal(allowanceWeek(null), "");
});
