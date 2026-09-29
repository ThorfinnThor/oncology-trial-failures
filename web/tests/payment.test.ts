// Webhook verification, and what a grant opens before it is paid for.
//
// Both halves are security-shaped. A webhook that accepts an unverified body lets anyone grant
// themselves access by posting JSON; one that accepts a valid-but-old signature lets a captured
// request be replayed forever. And a grant that opens before payment settles is a product given
// away by a bug rather than a decision.

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { checkoutUrl, isSettled, settlesOrder, verifySignature } from "../lib/server/payment";
import { grantCovers, isUnlocked } from "../lib/server/grants";

const SECRET = "whsec_testsecret";
const BODY = JSON.stringify({ type: "checkout.session.completed", data: { object: { client_reference_id: "abc" } } });

function sign(body: string, timestamp: number, secret = SECRET): string {
  const v1 = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

test("a signature Stripe produced is accepted", async () => {
  const now = 1_700_000_000;
  const result = await verifySignature(BODY, sign(BODY, now), SECRET, 300, now);
  assert.equal(result.ok, true);
});

test("a body that was altered after signing is rejected", async () => {
  const now = 1_700_000_000;
  const header = sign(BODY, now);
  const tampered = BODY.replace("abc", "someone-elses-token");
  const result = await verifySignature(tampered, header, SECRET, 300, now);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "signature does not match");
});

test("a captured request cannot be replayed later", async () => {
  // The signature stays valid forever; the timestamp is what stops it being reused. Without this
  // check, one intercepted webhook grants access again every time it is sent.
  const signedAt = 1_700_000_000;
  const header = sign(BODY, signedAt);
  const muchLater = signedAt + 3600;
  assert.equal((await verifySignature(BODY, header, SECRET, 300, muchLater)).ok, false);
  assert.equal((await verifySignature(BODY, header, SECRET, 300, signedAt + 60)).ok, true);
});

test("a signature made with the wrong secret is rejected", async () => {
  const now = 1_700_000_000;
  const result = await verifySignature(BODY, sign(BODY, now, "whsec_wrong"), SECRET, 300, now);
  assert.equal(result.ok, false);
});

test("a missing or malformed header is rejected rather than ignored", async () => {
  const now = 1_700_000_000;
  for (const header of ["", "nonsense", "t=abc,v1=deadbeef", `t=${now}`]) {
    assert.equal((await verifySignature(BODY, header, SECRET, 300, now)).ok, false, `accepted: ${header}`);
  }
  assert.equal((await verifySignature(BODY, sign(BODY, now), "", 300, now)).ok, false, "no secret, no trust");
});

test("with no payment links set, an order opens immediately", () => {
  // The state the site is in until the links exist. A half-connected checkout that refuses to
  // deliver would be worse than no checkout at all.
  assert.equal(checkoutUrl("molecule", "tok", "a@b.co"), "");
  const grant = { scope: "molecule" as const, slugs: ["oncology-egfr"], paid: false };
  assert.equal(isUnlocked(grant), true);
  assert.equal(grantCovers(grant, "oncology-egfr"), true);
});

test("a paid grant opens whatever it covers, and nothing else", () => {
  const grant = { scope: "molecule" as const, slugs: ["oncology-egfr"], paid: true };
  assert.equal(isUnlocked(grant), true);
  assert.equal(grantCovers(grant, "oncology-egfr"), true);
  assert.equal(grantCovers(grant, "oncology-her2"), false);
});

test("once the links are set, an unpaid order opens nothing", () => {
  // The test that matters: everything above is about rejecting bad webhooks, this is about not
  // giving the product away while waiting for a good one.
  const before = process.env.STRIPE_LINK_PACKAGE;
  process.env.STRIPE_LINK_PACKAGE = "https://buy.stripe.com/test_123";
  try {
    const unpaid = { scope: "molecule" as const, slugs: ["oncology-egfr"], paid: false };
    assert.equal(isUnlocked(unpaid), false, "an unpaid order must not open");
    assert.equal(grantCovers(unpaid, "oncology-egfr"), false, "and must not cover its own cohort");

    const paid = { ...unpaid, paid: true };
    assert.equal(isUnlocked(paid), true);
    assert.equal(grantCovers(paid, "oncology-egfr"), true);

    const url = new URL(checkoutUrl("molecule", "tok-123", "buyer@example.com"));
    assert.equal(url.searchParams.get("client_reference_id"), "tok-123",
      "the token must travel to Stripe, or the webhook cannot find the grant");
    assert.equal(url.searchParams.get("prefilled_email"), "buyer@example.com");
  } finally {
    if (before === undefined) delete process.env.STRIPE_LINK_PACKAGE;
    else process.env.STRIPE_LINK_PACKAGE = before;
  }
});

test("full access is a separate link, so one tier cannot be bought at the other's price", () => {
  const before = { ...process.env };
  process.env.STRIPE_LINK_PACKAGE = "https://buy.stripe.com/test_package";
  process.env.STRIPE_LINK_ACCESS = "https://buy.stripe.com/test_access";
  try {
    assert.match(checkoutUrl("molecule", "t", ""), /test_package/);
    assert.match(checkoutUrl("all", "t", ""), /test_access/);
    assert.equal(isUnlocked({ scope: "all", slugs: [], paid: false }), false);
  } finally {
    process.env = before;
  }
});

test("a delayed payment settles on async_payment_succeeded, not only on completed", () => {
  assert.equal(settlesOrder("checkout.session.completed"), true);
  assert.equal(settlesOrder("checkout.session.async_payment_succeeded"), true);
  assert.equal(settlesOrder("checkout.session.async_payment_failed"), false);
  assert.equal(settlesOrder("checkout.session.expired"), false);
  assert.equal(settlesOrder(undefined), false);
});

test("a zero-total checkout (100% promotion code) settles; an unpaid one does not", () => {
  assert.equal(isSettled("paid"), true);
  assert.equal(isSettled("no_payment_required"), true);
  assert.equal(isSettled("unpaid"), false);
  assert.equal(isSettled(""), false);
  assert.equal(isSettled(undefined), false);
});
