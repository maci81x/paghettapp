// node --test src/data/split.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { SPLIT, splitAllowance, splitByPct } from "./constants.ts";

test("lo split rispetta le percentuali 30/60/10", () => {
  const s = splitAllowance(10);
  assert.equal(s.risparmio, 3);
  assert.equal(s.personale, 6);
  assert.equal(s.beneficenza, 1);
  assert.equal(+(SPLIT.risparmio + SPLIT.personale + SPLIT.beneficenza).toFixed(2), 1);
});

test("la somma delle quote è sempre l'importo pagato", () => {
  for (const amount of [2, 5, 10, 15, 0, 7.77, 3.33]) {
    const s = splitAllowance(amount);
    const total = +(s.risparmio + s.personale + s.beneficenza).toFixed(2);
    assert.equal(total, +amount.toFixed(2), `importo ${amount}`);
  }
});

test("lo split personalizzato di un'entrata extra non perde centesimi", () => {
  for (const pct of [
    { risparmio: 30, personale: 60, beneficenza: 10 },
    { risparmio: 50, personale: 25, beneficenza: 25 },
    { risparmio: 0, personale: 100, beneficenza: 0 },
    { risparmio: 33, personale: 33, beneficenza: 34 },
  ]) {
    for (const amount of [20, 15.5, 7.77, 100]) {
      const q = splitByPct(amount, pct);
      const total = +(q.risparmio + q.personale + q.beneficenza).toFixed(2);
      assert.equal(total, +amount.toFixed(2), `${amount} con ${JSON.stringify(pct)}`);
    }
  }
  const q = splitByPct(50, { risparmio: 50, personale: 25, beneficenza: 25 });
  assert.deepEqual(q, { risparmio: 25, personale: 12.5, beneficenza: 12.5 });
});

test("nessuna quota negativa e massimo 2 decimali", () => {
  for (const amount of [2, 5, 10, 15]) {
    for (const v of Object.values(splitAllowance(amount))) {
      assert.ok(v >= 0, `quota negativa per ${amount}`);
      assert.equal(v, +v.toFixed(2));
    }
  }
});
