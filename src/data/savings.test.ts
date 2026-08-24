// node --test src/data/savings.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { isoDate, nextTier, tierProgress } from "./constants.ts";
import { nextMilestone, savingsSeries, savingsSummary } from "./savings.ts";
import type { SavingsMove } from "./types";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
};

test("il saldo di ogni giorno si ricostruisce dai movimenti successivi", () => {
  const moves: SavingsMove[] = [
    { date: daysAgo(60), delta: 10, label: "Paghetta" },
    { date: daysAgo(30), delta: 10, label: "Paghetta" },
    { date: daysAgo(1), delta: 10, label: "Paghetta" },
  ];
  const series = savingsSeries(moves, 30, 90, 13);

  assert.equal(series.length, 13);
  // il punto più recente è il saldo di oggi
  assert.equal(series[series.length - 1].saldo, 30);
  // 90 giorni fa non era ancora entrato nulla
  assert.equal(series[0].saldo, 0);
  // la serie va dal più vecchio al più recente e non torna mai indietro senza prelievi
  for (let i = 1; i < series.length; i++) {
    assert.ok(series[i].iso > series[i - 1].iso, "date crescenti");
    assert.ok(series[i].saldo >= series[i - 1].saldo, "senza prelievi il saldo non scende");
  }
});

test("versato, prelevato e crescita separano i movimenti dal rendimento", () => {
  const moves: SavingsMove[] = [
    { date: daysAgo(40), delta: 20, label: "Paghetta" },
    { date: daysAgo(20), delta: -5, label: "Libro" },
    { date: daysAgo(5), delta: 10, label: "Regalo" },
  ];
  const series = savingsSeries(moves, 26, 90, 13);
  const s = savingsSummary(moves, 26, series);

  assert.equal(s.contributed, 30);
  assert.equal(s.withdrawn, 5);
  // 26 in cassa contro 25 netti versati: 1 euro arriva dagli interessi
  assert.equal(s.growth, 1);
  assert.equal(s.current, 26);
});

test("il trend segue la differenza fra il primo e l'ultimo punto", () => {
  const cresce: SavingsMove[] = [{ date: daysAgo(10), delta: 15, label: "Paghetta" }];
  assert.equal(savingsSummary(cresce, 15, savingsSeries(cresce, 15)).trend, "up");

  const fermo: SavingsMove[] = [{ date: daysAgo(200), delta: 15, label: "Vecchia paghetta" }];
  assert.equal(savingsSummary(fermo, 15, savingsSeries(fermo, 15)).trend, "flat");

  const scende: SavingsMove[] = [{ date: daysAgo(10), delta: -8, label: "Prelievo" }];
  assert.equal(savingsSummary(scende, 7, savingsSeries(scende, 7)).trend, "down");
});

test("il traguardo successivo sale a scatti di 100 euro", () => {
  assert.equal(nextMilestone(0), 100);
  assert.equal(nextMilestone(23), 100);
  assert.equal(nextMilestone(99.99), 100);
  // già a quota: il traguardo diventa quello dopo
  assert.equal(nextMilestone(100), 200);
  assert.equal(nextMilestone(154), 200);
});

test("il tier successivo e la barra di avanzamento seguono gli scaglioni", () => {
  assert.equal(nextTier(0)?.min, 250);
  assert.equal(nextTier(300)?.r, 10);
  assert.equal(nextTier(600), undefined, "sopra l'ultimo scaglione non c'è un dopo");

  assert.equal(tierProgress(0), 0);
  assert.equal(tierProgress(125), 50);
  assert.equal(tierProgress(300), 50);
  assert.equal(tierProgress(600), 100, "al massimo la barra è piena");
});
