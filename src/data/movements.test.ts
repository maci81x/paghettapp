// node --test src/data/movements.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { emptyFilter, filterMovements, inRange, isFiltered, spesaDate, summarize, summaryText } from "./movements.ts";
import type { IncomeEntry, Spesa, User } from "./types";

/** 15 marzo 2026, una domenica: la settimana ISO parte dal 9. */
const TODAY = new Date(2026, 2, 15);

const inc = (id: number, date: string, amount: number, type: IncomeEntry["type"], confirmed?: boolean): IncomeEntry => ({
  id,
  date,
  amount,
  source: type,
  split: { risparmio: 30, personale: 60, beneficenza: 10 },
  type,
  confirmed,
});

const sp = (id: number, date: string, a: number, f: Spesa["f"]): Spesa => ({ id, d: date.slice(8) + "/" + date.slice(5, 7), date, ds: "x", a, f });

const user = (): User =>
  ({
    income: [
      inc(1, "2026-03-14", 15, "paghetta", true),
      inc(2, "2026-03-10", 5, "extra"),
      inc(3, "2026-03-02", 20, "regalo"),
      inc(4, "2026-02-20", 10, "paghetta", false),
      inc(5, "2026-01-05", 7, "extra"),
    ],
    pays: [],
    spese: [sp(10, "2026-03-13", 3, "personale"), sp(11, "2026-03-01", 8, "risparmio"), sp(12, "2026-02-18", 4, "personale")],
  }) as unknown as User;

test("inRange: settimana, mese corrente, mese precedente, tutto", () => {
  assert.equal(inRange("2026-03-14", "week", TODAY), true);
  assert.equal(inRange("2026-03-08", "week", TODAY), false);
  assert.equal(inRange("2026-03-01", "month", TODAY), true);
  assert.equal(inRange("2026-02-28", "month", TODAY), false);
  // "ultimo mese" è il mese scorso e finisce dove comincia quello corrente
  assert.equal(inRange("2026-02-20", "prevMonth", TODAY), true);
  assert.equal(inRange("2026-03-01", "prevMonth", TODAY), false);
  assert.equal(inRange("2026-01-05", "prevMonth", TODAY), false);
  assert.equal(inRange("2020-01-01", "all", TODAY), true);
});

test("il mese corrente prende solo i movimenti di marzo", () => {
  const { income, spese } = filterMovements(user(), { ...emptyFilter(), range: "month" }, TODAY);
  assert.deepEqual(income.map((i) => i.id), [1, 2, 3]);
  assert.deepEqual(spese.map((s) => s.id), [10, 11]);
});

test("i filtri si combinano: periodo più tipo", () => {
  const { income } = filterMovements(user(), { ...emptyFilter(), range: "month", kinds: ["paghetta"] }, TODAY);
  assert.deepEqual(income.map((i) => i.id), [1]);

  const solo = filterMovements(user(), { ...emptyFilter(), range: "all", kinds: ["extra", "regalo"] }, TODAY);
  assert.deepEqual(solo.income.map((i) => i.id), [2, 3, 5]);
});

test("il filtro salvadanaio agisce sulle sole uscite", () => {
  const { income, spese } = filterMovements(user(), { ...emptyFilter(), range: "all", funds: ["risparmio"] }, TODAY);
  assert.equal(income.length, 5, "le entrate non sono toccate dal filtro salvadanaio");
  assert.deepEqual(spese.map((s) => s.id), [11]);
});

test("il filtro conferma riguarda solo le paghette", () => {
  const no = filterMovements(user(), { ...emptyFilter(), range: "all", confirmed: "no" }, TODAY);
  // le entrate non-paghetta restano: la conferma per loro non esiste
  assert.deepEqual(no.income.map((i) => i.id), [2, 3, 4, 5]);
  const si = filterMovements(user(), { ...emptyFilter(), range: "all", confirmed: "yes" }, TODAY);
  assert.deepEqual(si.income.map((i) => i.id), [1, 2, 3, 5]);
});

test("i totali seguono i movimenti filtrati", () => {
  const s = summarize(filterMovements(user(), { ...emptyFilter(), range: "month" }, TODAY));
  assert.equal(s.totalIn, 40);
  assert.equal(s.totalOut, 11);
  assert.equal(s.balance, 29);
  assert.deepEqual(s.byKind.paghetta, { total: 15, count: 1 });
  assert.deepEqual(s.byKind.regalo, { total: 20, count: 1 });
  assert.deepEqual(s.byFund.risparmio, { total: 8, count: 1 });
  assert.equal(s.count, 5);
});

test("saldo negativo quando si spende più di quanto entra", () => {
  const u = { income: [inc(1, "2026-03-10", 2, "extra")], pays: [], spese: [sp(9, "2026-03-11", 9, "personale")] } as unknown as User;
  assert.equal(summarize(filterMovements(u, { ...emptyFilter(), range: "month" }, TODAY)).balance, -7);
});

test("una spesa senza data ISO ricade sul giorno ricostruito da gg/mm", () => {
  const legacy = { id: 1, d: "12/08", ds: "Gelato", a: 3.5, f: "personale" } as Spesa;
  assert.equal(spesaDate(legacy, new Date(2026, 0, 1)), "2026-08-12");
  assert.equal(spesaDate({ ...legacy, date: "2025-08-12" }), "2025-08-12");
});

test("isFiltered: il mese corrente senza altri filtri è lo stato di partenza", () => {
  assert.equal(isFiltered(emptyFilter()), false);
  assert.equal(isFiltered({ ...emptyFilter(), range: "week" }), true);
  assert.equal(isFiltered({ ...emptyFilter(), kinds: ["regalo"] }), true);
  assert.equal(isFiltered({ ...emptyFilter(), confirmed: "no" }), true);
});

test("il testo da copiare elenca solo i tipi presenti", () => {
  const s = summarize(filterMovements(user(), { ...emptyFilter(), range: "month" }, TODAY));
  const txt = summaryText("month", [{ name: "Mia", summary: s }]);
  assert.ok(txt.includes("Questo mese"), txt);
  assert.ok(txt.includes("🟢 Paghetta: €15.00 (1)"), txt);
  assert.ok(txt.includes("💰 Totale entrate: €40.00"), txt);
  assert.ok(txt.includes("📊 Saldo: €29.00"), txt);
});
