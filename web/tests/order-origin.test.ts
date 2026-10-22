// Only the site's own pages may place an order. The form asks for an email, but an address costs
// nothing to invent, so the origin is what separates a reader's click from a script minting grants.

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
