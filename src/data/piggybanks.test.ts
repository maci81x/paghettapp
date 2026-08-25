// node --test src/data/piggybanks.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { FUND_LABEL, fundName, giftNote, hasFundNames, isGiftNote, validFundName } from "./constants.ts";
import type { Fund, User } from "./types.ts";

const withNames = (nick?: Partial<Record<Fund, string>>) =>
  ({ wNick: nick as Record<Fund, string> | undefined }) as User;

test("un nome vale fra 2 e 30 caratteri, spazi esclusi", () => {
  assert.equal(validFundName("Il mio tesoretto"), true);
  assert.equal(validFundName("ab"), true);
  assert.equal(validFundName("a"), false);
  assert.equal(validFundName("   "), false);
  assert.equal(validFundName(""), false);
  assert.equal(validFundName("x".repeat(30)), true);
  assert.equal(validFundName("x".repeat(31)), false);
});

test("senza nome si ricade sull'etichetta generica", () => {
  assert.equal(fundName(withNames(), "risparmio"), FUND_LABEL.risparmio);
  assert.equal(fundName(withNames({ risparmio: "  " }), "risparmio"), FUND_LABEL.risparmio);
  assert.equal(fundName(withNames({ risparmio: "Per il futuro" }), "risparmio"), "🏦 Per il futuro");
});

test("hasFundNames chiede tutti e tre i nomi", () => {
  assert.equal(hasFundNames(withNames()), false);
  assert.equal(hasFundNames(withNames({ risparmio: "Futuro", personale: "Tesoretto" })), false);
  assert.equal(hasFundNames(withNames({ risparmio: "Futuro", personale: "Tesoretto", beneficenza: "Per chi ha bisogno" })), true);
  // un nome troppo corto non conta come nome
  assert.equal(hasFundNames(withNames({ risparmio: "F", personale: "Tesoretto", beneficenza: "Dono" })), false);
});

/**
 * Il marchio nella nota è come si riconosce un regalo finché il database non
 * accetta il tipo 'gift' e lo salva come entrata extra: se cambia la forma
 * della nota, i regali già registrati tornano a sembrare entrate normali.
 */
test("la nota del regalo si riconosce da sola", () => {
  const note = giftNote(" Nonna ", " Compleanno ");
  assert.equal(note, "🎁 Da Nonna — Compleanno");
  assert.equal(isGiftNote(note), true);
  assert.equal(isGiftNote("Regalo della nonna"), false);
  assert.equal(isGiftNote("Entrata extra"), false);
  assert.equal(isGiftNote("Paghetta settimanale"), false);
});
