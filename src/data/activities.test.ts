// node --test src/data/activities.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { byFreqThenPenalty } from "./constants.ts";
import type { Activity } from "./types.ts";

const act = (id: number, freq: Activity["freq"], pen: number): Activity =>
  ({ id, name: `a${id}`, cat: "casa", pts: 5, pen, freq, max: 1, ch: 0 }) as Activity;

test("prima la frequenza, poi la penalità più pesante", () => {
  const list = [act(1, "monthly", 0), act(2, "daily", 0), act(3, "daily", -5), act(4, "weekly", -2)];
  assert.deepEqual(list.slice().sort(byFreqThenPenalty).map((a) => a.id), [3, 2, 4, 1]);
});

test("a parità di frequenza e penalità l'ordine è stabile sull'id", () => {
  const list = [act(9, "daily", -3), act(2, "daily", -3), act(5, "daily", -3)];
  assert.deepEqual(list.slice().sort(byFreqThenPenalty).map((a) => a.id), [2, 5, 9]);
});

test("il filtro 'solo con penalità' guarda il segno, non il valore", () => {
  const list = [act(1, "daily", 0), act(2, "daily", -1)];
  assert.deepEqual(list.filter((a) => a.pen < 0).map((a) => a.id), [2]);
});
