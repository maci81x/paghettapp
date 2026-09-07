// node --test src/data/periodRange.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { periodRange } from "./constants.ts";

test("giornaliera: il periodo è il giorno stesso, anche per un arretrato", () => {
  assert.deepEqual(periodRange("daily", "2026-09-07"), { from: "2026-09-07", to: "2026-09-07" });
  assert.deepEqual(periodRange("daily", "2026-09-06"), { from: "2026-09-06", to: "2026-09-06" });
});

test("settimanale: lunedì-domenica della settimana che contiene la data", () => {
  assert.deepEqual(periodRange("weekly", "2026-09-07"), { from: "2026-09-07", to: "2026-09-13" });
  assert.deepEqual(periodRange("weekly", "2026-09-06"), { from: "2026-08-31", to: "2026-09-06" });
});

test("mensile: dal primo all'ultimo giorno, febbraio compreso", () => {
  assert.deepEqual(periodRange("monthly", "2026-09-07"), { from: "2026-09-01", to: "2026-09-30" });
  assert.deepEqual(periodRange("monthly", "2026-02-14"), { from: "2026-02-01", to: "2026-02-28" });
  assert.deepEqual(periodRange("monthly", "2028-02-14"), { from: "2028-02-01", to: "2028-02-29" });
  assert.deepEqual(periodRange("monthly", "2026-12-31"), { from: "2026-12-01", to: "2026-12-31" });
});

/**
 * È la ragione per cui il periodo ha una fine. Con un intervallo aperto in
 * avanti (`date >= from`) le voci di ieri cadono prima dell'inizio del periodo
 * di oggi: non consumerebbero mai un limite, e "Ieri" diventerebbe un modo per
 * segnare la stessa attività quante volte si vuole.
 */
test("il limite di ieri conta le voci di ieri, non quelle di oggi", () => {
  const log = [
    { date: "2026-09-06", cnt: 1 },
    { date: "2026-09-07", cnt: 1 },
    { date: "2026-09-07", cnt: 1 },
  ];
  const done = (date: string) => {
    const { from, to } = periodRange("daily", date);
    return log.filter((l) => l.date >= from && l.date <= to).reduce((s, l) => s + l.cnt, 0);
  };
  assert.equal(done("2026-09-06"), 1);
  assert.equal(done("2026-09-07"), 2);
});
