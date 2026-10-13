// node --test src/data/activityImport.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { parseCsv } from "../utils/spreadsheet.ts";
import { parseActivityRows } from "./activityImport.ts";

const HEAD = ["Nome", "Descrizione", "Punteggio", "Penalità", "Categoria", "Daily", "Sfida"];

test("legge le colonne dell'Excel, in qualunque ordine e con o senza accenti", () => {
  const rows = [
    ["categoria", "nome", "punti", "penalita", "giornaliera"],
    ["Cucina", "Apparecchiare", "4", "2", "sì"],
  ];
  const { items, errors } = parseActivityRows(rows, []);
  assert.deepEqual(errors, []);
  assert.equal(items.length, 1);
  assert.deepEqual(
    { name: items[0].name, cat: items[0].cat, pts: items[0].pts, pen: items[0].pen, freq: items[0].freq, ch: items[0].ch },
    { name: "Apparecchiare", cat: "cucina", pts: 4, pen: -2, freq: "daily", ch: 0 },
  );
});

test("categoria per nome, id o icona; sfida e non-daily", () => {
  const rows = [HEAD, ["A", "", "5", "", "🐕", "no", "x"], ["B", "desc", "3", "-1", "lingue", "", ""], ["C", "", "2", "0", "Creatività", "", ""]];
  const { items } = parseActivityRows(rows, []);
  assert.deepEqual(
    items.map((i) => [i.cat, i.freq, i.ch]),
    [
      ["tia", "weekly", 1],
      ["lingue", "weekly", 0],
      ["creativita", "weekly", 0],
    ],
  );
  assert.equal(items[1].desc, "desc");
});

test("scarta le righe incomplete con il motivo, tiene le altre", () => {
  const rows = [HEAD, ["", "", "5", "", "casa", "", ""], ["X", "", "zero", "", "casa", "", ""], ["Y", "", "5", "", "spazio", "", ""], ["Z", "", "5", "", "", "", ""]];
  const { items, errors } = parseActivityRows(rows, []);
  assert.equal(items.length, 1);
  assert.equal(items[0].cat, "casa");
  assert.equal(errors.length, 3);
  assert.match(errors[0], /Riga 2/);
  assert.match(errors[2], /spazio/);
});

test("segna i doppioni, anche dentro lo stesso file", () => {
  const rows = [HEAD, ["Rifarsi il letto", "", "3", "-5", "casa", "sì", ""], ["Nuova", "", "3", "", "casa", "", ""], ["nuova ", "", "3", "", "casa", "", ""]];
  const { items } = parseActivityRows(rows, ["Rifarsi il Letto"]);
  assert.deepEqual(
    items.map((i) => i.duplicate),
    [true, false, true],
  );
});

test("senza nome o punteggio nell'intestazione non importa nulla", () => {
  const { items, errors } = parseActivityRows([["titolo", "valore"], ["a", "1"]], []);
  assert.equal(items.length, 0);
  assert.equal(errors.length, 1);
});

test("parseCsv: punto e virgola, virgolette e righe vuote", () => {
  const csv = '﻿nome;punteggio;descrizione\r\n"Letto; fatto";3;"dice ""ciao"""\r\n\r\nCena;7;\n';
  assert.deepEqual(parseCsv(csv), [
    ["nome", "punteggio", "descrizione"],
    ["Letto; fatto", "3", 'dice "ciao"'],
    ["Cena", "7", ""],
  ]);
});
