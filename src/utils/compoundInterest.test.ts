// node --test src/utils/compoundInterest.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { YIELD_YEAR } from "../data/constants.ts";
import { calcCompoundInterest, weeklyGrowth, yearlyGrowth } from "./compoundInterest.ts";

/** Formula chiusa: A = P(1+i)^n + PMT·[((1+i)^n − 1)/i] */
const closedForm = (p: number, pmt: number, rate: number, months: number, n = 12) => {
  const i = rate / n;
  const g = Math.pow(1 + i, months);
  return p * g + pmt * ((g - 1) / i);
};

test("il calcolo mese per mese coincide con la formula dell'interesse composto", () => {
  for (const [p, pmt, months] of [
    [100, 10, 12],
    [0, 25, 60],
    [1000, 0, 120],
    [42.6, 4.5, 36],
  ]) {
    const r = calcCompoundInterest(p, pmt, 0.1, months);
    assert.ok(Math.abs(r.finalValue - closedForm(p, pmt, 0.1, months)) < 0.02, `P=${p} PMT=${pmt} mesi=${months}`);
  }
});

test("versato e interessi sommano sempre il valore finale", () => {
  const r = calcCompoundInterest(200, 15, 0.1, 24);
  assert.equal(+(r.totalContributed + r.totalGrowth).toFixed(2), r.finalValue);
  assert.equal(r.totalContributed, 200 + 15 * 24);
  assert.equal(r.monthlyBreakdown.length, 24);
  assert.equal(r.monthlyBreakdown[23].balance, r.finalValue);
});

test("senza mesi non cresce nulla", () => {
  const r = calcCompoundInterest(50, 10, 0.1, 0);
  assert.equal(r.finalValue, 50);
  assert.equal(r.totalGrowth, 0);
  assert.deepEqual(r.monthlyBreakdown, []);
});

test("l'interesse composto batte quello semplice sul lungo periodo", () => {
  const composto = calcCompoundInterest(1000, 0, 0.1, 120).finalValue;
  const semplice = 1000 + 1000 * 0.1 * 10;
  assert.ok(composto > semplice, `${composto} deve superare ${semplice}`);
});

test("rendimento settimanale e annuo", () => {
  assert.equal(+weeklyGrowth(520, 0.1).toFixed(2), 1);
  assert.equal(+yearlyGrowth(250, 0.1).toFixed(2), 25);
  assert.equal(weeklyGrowth(0), 0);
});

test("il tasso dell'app è il 10% annuo", () => {
  assert.equal(YIELD_YEAR, 0.1);
  // capitale fermo per un anno: capitalizzato ogni mese rende poco più del 10%
  const r = calcCompoundInterest(1000, 0, YIELD_YEAR, 12);
  assert.ok(r.totalGrowth > 104 && r.totalGrowth < 105, `${r.totalGrowth} atteso ~104.71`);
});

/**
 * Guardia contro la "correzione" sbagliata: con versamenti mensili il
 * rendimento cumulato sul versato dopo un anno vale circa la metà del tasso,
 * perché i versamenti finali lavorano poche settimane. Vedere ~5% in pagina
 * NON vuol dire che il tasso sia stato messo al 5%.
 */
test("col versamento mensile il rendimento cumulato a 12 mesi sta ben sotto al tasso", () => {
  const r = calcCompoundInterest(0, 5.5, YIELD_YEAR, 12);
  const pct = (r.totalGrowth / r.totalContributed) * 100;
  assert.equal(r.totalContributed, 66);
  assert.ok(pct > 4 && pct < 6, `rendimento cumulato ${pct.toFixed(2)}% atteso ~4.7%`);
  assert.ok(pct < YIELD_YEAR * 100, "il cumulato su un anno non può raggiungere il tasso annuo");
});
