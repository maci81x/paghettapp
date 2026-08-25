// node --test src/data/categories.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { CATS, actIcon } from "./constants.ts";

/**
 * Il catalogo attività usa anche `crescita`, `studio` e `famiglia`: senza
 * queste voci le attività finirebbero senza icona né colore.
 */
test("le categorie del catalogo esistono tutte", () => {
  const ids = new Set(CATS.map((c) => c.id));
  for (const id of ["casa", "crescita", "studio", "finanza", "famiglia"]) {
    assert.ok(ids.has(id), `categoria mancante: ${id}`);
  }
});

test("ogni categoria ha icona e colore", () => {
  CATS.forEach((c) => {
    assert.ok(c.i.length > 0, `${c.id} senza icona`);
    assert.match(c.c, /^#[0-9a-f]{6}$/i, `${c.id} senza colore valido`);
  });
});

test("l'icona dell'attività vince su quella della categoria", () => {
  assert.equal(actIcon({ emoji: "🛏️", cat: "casa" }), "🛏️");
  assert.equal(actIcon({ cat: "casa" }), "🏠", "senza emoji vale quella della categoria");
  assert.equal(actIcon({ emoji: "  ", cat: "casa" }), "🏠", "un'emoji di soli spazi non conta");
  assert.equal(actIcon({ cat: "categoria-sparita" }), "⭐", "categoria sconosciuta: icona di riserva");
});
