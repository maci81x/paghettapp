// node --test src/data/interest.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { MONTH_RATE, effectiveYield, monthlyInterest, nextPeriod, pendingPeriods, periodLabel, periodOf, prevPeriod } from "./interest.ts";

const AUG = new Date(2026, 7, 20); // 20 agosto 2026

test("il tasso mensile, capitalizzato dodici volte, fa esattamente il 10% annuo", () => {
  assert.equal(+(Math.pow(1 + MONTH_RATE, 12) - 1).toFixed(10), 0.1);
  assert.equal(+MONTH_RATE.toFixed(5), 0.00797);
});

test("periodi: formato, passo avanti e indietro, scavalco d'anno", () => {
  assert.equal(periodOf(AUG), "2026-08");
  assert.equal(nextPeriod("2026-08"), "2026-09");
  assert.equal(nextPeriod("2026-12"), "2027-01");
  assert.equal(prevPeriod("2026-01"), "2025-12");
  assert.equal(periodLabel("2026-08"), "Agosto 2026");
});

/** Il mese in corso non si capitalizza: gli interessi arrivano a mese chiuso. */
test("il mese corrente non viene mai accreditato", () => {
  assert.deepEqual(pendingPeriods("2026-07", "2026-01", AUG), [], "luglio è l'ultimo chiuso ed è già fatto");
  assert.deepEqual(pendingPeriods("2026-06", "2026-01", AUG), ["2026-07"]);
});

test("recupera tutti i mesi mancanti, non solo l'ultimo", () => {
  assert.deepEqual(pendingPeriods("2026-04", "2026-01", AUG), ["2026-05", "2026-06", "2026-07"]);
});

test("senza storico si parte dal primo movimento del risparmio", () => {
  assert.deepEqual(pendingPeriods(null, "2026-05", AUG), ["2026-05", "2026-06", "2026-07"]);
  // primo movimento nel mese in corso: niente da accreditare ancora
  assert.deepEqual(pendingPeriods(null, "2026-08", AUG), []);
  // e nemmeno se è nel futuro
  assert.deepEqual(pendingPeriods(null, "2026-11", AUG), []);
});

test("il recupero è limitato, così una data sbagliata non manda in loop", () => {
  const many = pendingPeriods(null, "1990-01", AUG, 12);
  assert.equal(many.length, 12);
  assert.equal(many[0], "1990-01");
});

test("l'interesse del mese è il saldo per il tasso, al centesimo", () => {
  assert.equal(monthlyInterest(120), 0.96); // 120 × 0.0079741 = 0.9569…
  assert.equal(monthlyInterest(42.6), 0.34); // 0.33970… al centesimo
  assert.equal(monthlyInterest(0), 0);
  assert.equal(monthlyInterest(-5), 0, "un saldo negativo non produce interessi");
});

test("dodici mesi capitalizzati fanno il 10% annuo, a meno degli arrotondamenti", () => {
  let balance = 1000;
  for (let i = 0; i < 12; i++) balance = +(balance + monthlyInterest(balance)).toFixed(2);
  assert.ok(Math.abs(balance - 1100) < 0.1, `${balance} deve stare a pochi centesimi da 1100`);
});

test("rendimento effettivo sul versato", () => {
  assert.equal(effectiveYield(5, 100), 5);
  assert.equal(effectiveYield(0, 0), 0, "nessun versamento: nessuna percentuale da mostrare");
});
