// node --test src/utils/money.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { fmtEuro, parseAmount } from "./money.ts";

test("parseAmount accetta la virgola e arrotonda al centesimo", () => {
  assert.equal(parseAmount("7,5"), 7.5);
  assert.equal(parseAmount(" 10.129 "), 10.13);
});

test("parseAmount rifiuta zero, negativi, testo e vuoto", () => {
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount("-3"), null);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount(""), null);
});

test("fmtEuro: virgola per i decimali, punto per le migliaia", () => {
  assert.equal(fmtEuro(16), "€16,00");
  assert.equal(fmtEuro(1234.5), "€1.234,50");
  assert.equal(fmtEuro(0.6), "€0,60");
  assert.equal(fmtEuro(-2.4), "−€2,40");
});
