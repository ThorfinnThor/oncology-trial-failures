// Only the site's own pages may place an order: the buy button asks for nothing, so the origin is
// the one thing that separates a customer's click from a script minting grants in a loop.

import assert from "node:assert/strict";
import test from "node:test";

import { sameSite } from "../pages/api/order";

const req = (headers: Record<string, string>) => ({ headers }) as never;

test("the site's own pages may order", () => {
  assert.equal(sameSite(req({ origin: "https://clinicaltrialfailures.com" })), true);
  assert.equal(sameSite(req({ origin: "https://www.clinicaltrialfailures.com" })), true);
  assert.equal(sameSite(req({ referer: "https://clinicaltrialfailures.com/asset-check" })), true);
  assert.equal(sameSite(req({ origin: "http://localhost:3000" })), true);
});

test("anything else may not", () => {
  assert.equal(sameSite(req({})), false);
  assert.equal(sameSite(req({ origin: "https://evil.example" })), false);
  assert.equal(sameSite(req({ origin: "https://clinicaltrialfailures.com.evil.example" })), false);
  assert.equal(sameSite(req({ origin: "not a url" })), false);
});
