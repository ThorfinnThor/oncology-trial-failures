// Returning from checkout: a paid order must open at once, and nothing else may open it.
//
// Workers KV can serve an edge's old copy of a grant for up to a minute after the webhook wrote the
// paid one. A buyer who paid saw "waiting for your payment" for half a minute and had to reload.
// With a read-only Stripe key the return asks Stripe itself; these tests pin what that may and may
// not unlock.

import assert from "node:assert/strict";
import test from "node:test";

import { loadGrant, tokenForCheckout, type KvStore } from "../lib/server/access";
import { checkoutPays, isCheckoutId, retrieveCheckoutSession, settleGrant } from "../lib/server/payment";

const CS = "cs_live_b1QPBKOOjTlnRsbhvC6FnChoCACB3rTObhQsV7KQ7Ff2MtZZGf0HmuwJWo";

function memoryStore(initial: Record<string, string> = {}): KvStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    async get(key) {
      return key in data ? data[key] : null;
    },
    async put(key, value) {
      data[key] = value;
    },
  };
}

function stripeAnswers(session: Record<string, unknown> | null, status = 200) {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string | URL) => {
    calls.push(String(url));
    return new Response(JSON.stringify(session || {}), { status });
  }) as typeof fetch;
  return calls;
}

const unpaid = () => JSON.stringify({ scope: "molecule", asset: "belantamab", slugs: ["oncology-bcma"], paid: false });

test("checkout ids are recognised and nothing else is sent to Stripe", () => {
  assert.equal(isCheckoutId(CS), true);
  assert.equal(isCheckoutId("cs_test_a1B2c3D4e5F6g7"), true);
  for (const bad of ["", "cs_live_", "pi_123456789012", "cs_live_abc/../../v1/charges", "cs_live_abc?x=1"]) {
    assert.equal(isCheckoutId(bad), false, bad);
  }
});

test("a checkout pays only for the token it carries, and only once settled", () => {
  assert.equal(checkoutPays({ client_reference_id: "tok", payment_status: "paid" }, "tok"), true);
  assert.equal(checkoutPays({ client_reference_id: "tok", payment_status: "no_payment_required" }, "tok"), true);
  assert.equal(checkoutPays({ client_reference_id: "tok", payment_status: "unpaid" }, "tok"), false);
  assert.equal(checkoutPays({ client_reference_id: "other", payment_status: "paid" }, "tok"), false);
  assert.equal(checkoutPays(null, "tok"), false);
});

test("settling copies what Stripe collected without overwriting what the order had", () => {
  const grant = settleGrant({ email: "kept@example.com" } as Record<string, unknown>, {
    id: CS, amount_total: 9900, currency: "eur",
    customer_details: { email: "other@example.com", name: "A. Buyer", business_name: "Example Bio" },
  });
  assert.equal(grant.paid, true);
  assert.equal(grant.stripe_session, CS);
  assert.equal(grant.email, "kept@example.com");
  assert.equal(grant.company, "Example Bio");
});

test("without a read key nothing is asked of Stripe", async () => {
  delete process.env.STRIPE_READ_KEY;
  const calls = stripeAnswers({ client_reference_id: "tok", payment_status: "paid" });
  assert.equal(await retrieveCheckoutSession(CS), null);
  const store = memoryStore({ "grant:tok": unpaid() });
  const grant = await loadGrant(store, "tok", CS);
  assert.equal(grant?.paid, false, "without the key the grant waits for the webhook, as before");
  assert.equal(calls.length, 0);
});

test("with a read key, a paid checkout opens the report on return and is written back", async () => {
  process.env.STRIPE_READ_KEY = "rk_test_only";
  const calls = stripeAnswers({ id: CS, client_reference_id: "tok", payment_status: "paid", customer_details: {} });
  const store = memoryStore({ "grant:tok": unpaid() });
  const { token, checkout } = await tokenForCheckout(store, CS);
  assert.equal(token, "tok");
  const grant = await loadGrant(store, token, CS, checkout);
  assert.equal(grant?.paid, true);
  assert.equal(JSON.parse(store.data["grant:tok"]).paid, true);
  assert.equal(store.data[`session:${CS}`], "tok");
  assert.ok(store.data[`payment:${CS}`]);
  assert.equal(calls.length, 1, "one question to Stripe, not two");
  delete process.env.STRIPE_READ_KEY;
});

test("a checkout paid for a different order does not open this one", async () => {
  process.env.STRIPE_READ_KEY = "rk_test_only";
  stripeAnswers({ id: CS, client_reference_id: "someone-else", payment_status: "paid" });
  const store = memoryStore({ "grant:tok": unpaid() });
  const grant = await loadGrant(store, "tok", CS);
  assert.equal(grant?.paid, false);
  assert.equal(JSON.parse(store.data["grant:tok"]).paid, false);
  delete process.env.STRIPE_READ_KEY;
});

test("an unpaid checkout, or Stripe not answering, leaves the grant unpaid", async () => {
  process.env.STRIPE_READ_KEY = "rk_test_only";
  stripeAnswers({ id: CS, client_reference_id: "tok", payment_status: "unpaid" });
  assert.equal((await loadGrant(memoryStore({ "grant:tok": unpaid() }), "tok", CS))?.paid, false);
  stripeAnswers(null, 500);
  assert.equal((await loadGrant(memoryStore({ "grant:tok": unpaid() }), "tok", CS))?.paid, false);
  delete process.env.STRIPE_READ_KEY;
});
