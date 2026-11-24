// node --test src/utils/money.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { fmtEuro } from "./money.ts";

test("euro all'italiana", () => {
  assert.equal(fmtEuro(16), "€16,00");
  assert.equal(fmtEuro(1234.5), "€1.234,50");
  assert.equal(fmtEuro(0.6), "€0,60");
  assert.equal(fmtEuro(-2.4), "−€2,40");
});
