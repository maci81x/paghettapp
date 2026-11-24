// node --test src/data/missionPrize.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { isPending, missionNote, prizeLabel } from "./constants.ts";
import { allIncome } from "./report.ts";
import type { Payment, User } from "./types";

test("prizeLabel: euro per le nuove, punti per quelle di prima, entrambi se ci sono", () => {
  assert.equal(prizeLabel({ pts: 0, euro: 2 }), "€2,00");
  assert.equal(prizeLabel({ pts: 30 }), "+30 pt");
  assert.equal(prizeLabel({ pts: 10, euro: 1.5 }), "€1,50 + +10 pt");
  assert.equal(prizeLabel({ pts: 0 }), "—");
});

test("missionNote marca l'entrata del premio", () => {
  assert.equal(missionNote("  Settimana Zen "), "🎯 Missione: Settimana Zen");
});

test("isPending: le rifiutate e le annullate non tornano in coda", () => {
  assert.equal(isPending({ ok: false }), true);
  assert.equal(isPending({ ok: true }), false);
  assert.equal(isPending({ ok: false, revoked: true }), false);
  assert.equal(isPending({ ok: false, rejected: true }), false);
});

test("allIncome: una settimana pagata fuori app non diventa un'entrata", () => {
  const pay = (id: number, outside?: boolean): Payment => ({
    id,
    week: "2026-09-28",
    date: "2026-10-05",
    pts: 120,
    amount: outside ? 0 : 2,
    tier: 2,
    split: { risparmio: 0, personale: 0, beneficenza: 0 },
    logIds: [],
    ...(outside ? { outside: true } : {}),
  });
  const u = { income: [], pays: [pay(1), pay(2, true)] } as unknown as User;
  assert.deepEqual(
    allIncome(u).map((i) => i.id),
    [1],
  );
});
