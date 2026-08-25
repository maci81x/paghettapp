// node --test src/data/defaults.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { initMatches } from "./defaults.ts";

/**
 * Guardia contro il ritorno del match fantasma: i match stanno solo in
 * localStorage, quindi qualunque valore iniziale viene riseminato su ogni
 * dispositivo senza la chiave e su quello dove era stato cancellato dopo una
 * pulizia dei dati del sito. Un esempio con id fisso tornava all'infinito.
 */
test("i match partono vuoti: nessun dato di esempio da riseminare", () => {
  assert.deepEqual(initMatches(), []);
});
