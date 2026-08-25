// node --test src/data/tier.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { TIERS, getTier, nextTier, tierPos } from "./constants.ts";

test("il tier segue le soglie 0/250/350/500", () => {
  assert.equal(getTier(0).r, 2);
  assert.equal(getTier(249).r, 2);
  assert.equal(getTier(250).r, 5);
  assert.equal(getTier(349).r, 5);
  assert.equal(getTier(350).r, 10);
  assert.equal(getTier(499).r, 10);
  assert.equal(getTier(500).r, 15);
  assert.equal(getTier(9999).r, 15);
});

test("nextTier è undefined solo al massimo", () => {
  assert.equal(nextTier(0)?.r, 5);
  assert.equal(nextTier(300)?.r, 10);
  assert.equal(nextTier(400)?.r, 15);
  assert.equal(nextTier(500), undefined);
});

test("tierPos: tacche esatte, interpolazione in mezzo, sempre dentro 0-100", () => {
  TIERS.forEach((t, i) => assert.equal(tierPos(t.min), i * (100 / (TIERS.length - 1)), `tacca €${t.r}`));
  assert.equal(+tierPos(125).toFixed(2), 16.67); // metà del primo segmento
  for (const p of [-50, 0, 1, 249, 250, 480, 500, 12000]) {
    const v = tierPos(p);
    assert.ok(v >= 0 && v <= 100, `pos fuori scala per ${p}: ${v}`);
  }
});
