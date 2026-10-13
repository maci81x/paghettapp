// node --test src/data/weekStatus.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import type { Payment } from "./types";
import { weekStatus } from "./weekStatus.ts";

const pay = (amount: number, tier?: number): Payment => ({
  id: 1,
  week: "2026-08-31",
  date: "2026-09-08",
  pts: 260,
  amount,
  tier,
  split: { risparmio: 0, personale: 0, beneficenza: 0 },
  logIds: [],
});

/** Mercoledì 2026-09-09: la settimana del 31/08 è finita, quella del 07/09 no. */
const WED = new Date(2026, 8, 9, 12);

test("una settimana finita e non pagata è da confermare", () => {
  assert.equal(weekStatus("2026-08-31", undefined, WED), "da_confermare");
});

test("la settimana in corso non è chiudibile", () => {
  assert.equal(weekStatus("2026-09-07", undefined, WED), "in_corso");
});

test("pagata con l'importo del tier è confermata", () => {
  assert.equal(weekStatus("2026-08-31", pay(5, 5), WED), "confermata");
});

test("pagata con un importo diverso dal tier è modificata", () => {
  assert.equal(weekStatus("2026-08-31", pay(7.5, 5), WED), "modificata");
});

test("le paghette di prima, senza tier, restano confermate", () => {
  assert.equal(weekStatus("2026-08-31", pay(5), WED), "confermata");
});
