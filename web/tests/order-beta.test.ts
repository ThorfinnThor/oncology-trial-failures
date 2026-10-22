// The beta offer: the report for a work email, and the newsletter only on request.
//
// Three promises are pinned here. The address is required. Ticking the newsletter box starts the
// newsletter's own double opt-in and never subscribes anybody directly. And the report is
// delivered whether or not the box is ticked, or the newsletter can send its mail at all. Plus the
// one that keeps the beta from outliving it: once the Payment Link is set, the order charges again.

import assert from "node:assert/strict";
import test from "node:test";

import handler, { isFreeMail } from "../pages/api/order";

const CF = Symbol.for("__cloudflare-context__");

function fakeStore() {
  const data = new Map<string, string>();
  return {
    data,
    async get(key: string) {
      return data.has(key) ? (data.get(key) as string) : null;
    },
    async put(key: string, value: string) {
      data.set(key, value);
    },
    async delete(key: string) {
      data.delete(key);
    },
  };
}

function fakeRes() {
  const out: { status: number; body: any } = { status: 0, body: null };
  const res: any = {
    setHeader() {},
    status(code: number) {
      out.status = code;
      return res;
    },
    json(body: any) {
      out.body = body;
      return out;
    },
  };
  return { res, out };
}

async function order(body: Record<string, unknown>, env: Record<string, string> = {}, origin = "https://clinicaltrialfailures.com") {
  const store = fakeStore();
  (globalThis as any)[CF] = { env: { LEADS: store, ...env } };
  const { res, out } = fakeRes();
  try {
    await handler({ method: "POST", headers: { origin }, body } as any, res);
  } finally {
    delete (globalThis as any)[CF];
  }
  return { store, out };
}

const keys = (store: ReturnType<typeof fakeStore>, prefix: string) => [...store.data.keys()].filter((k) => k.startsWith(prefix));

test("no email, no report", async () => {
  const { store, out } = await order({ asset: "osimertinib" });
  assert.equal(out.status, 400);
  assert.equal(out.body.ok, false);
  assert.equal(store.data.size, 0, "nothing is minted without an address");

  const bad = await order({ asset: "osimertinib", email: "not-an-address" });
  assert.equal(bad.out.status, 400);
  assert.equal(bad.store.data.size, 0);
});

test("a work email gets the report straight away, and nobody is put on the newsletter", async () => {
  const { store, out } = await order({ asset: "osimertinib", email: "Analyst@Pharma.example" });
  assert.equal(out.status, 200);
  assert.equal(out.body.ok, true);
  assert.equal(out.body.payment, false);
  assert.match(out.body.url, /^\/access\?token=[0-9a-f]{40}$/);
  assert.equal(out.body.newsletter, "not_requested");

  const [grantKey] = keys(store, "grant:");
  const grant = JSON.parse(store.data.get(grantKey) as string);
  assert.equal(grant.email, "analyst@pharma.example");
  assert.equal(grant.free_mail_domain, false);
  assert.equal(grant.newsletter_requested, false);
  assert.equal(keys(store, "order:").length, 1);
  assert.deepEqual(keys(store, "pending:"), []);
  assert.deepEqual(keys(store, "news:"), []);
});

test("a free-mail address is accepted, and flagged on the order", async () => {
  assert.equal(isFreeMail("someone@gmail.com"), true);
  assert.equal(isFreeMail("someone@pharma.example"), false);
  const { store, out } = await order({ asset: "osimertinib", email: "someone@gmail.com" });
  assert.equal(out.status, 200);
  assert.equal(out.body.ok, true);
  const grant = JSON.parse(store.data.get(keys(store, "grant:")[0]) as string);
  assert.equal(grant.free_mail_domain, true);
});

test("ticking the newsletter box starts the double opt-in and subscribes nobody", async () => {
  const realFetch = globalThis.fetch;
  const sent: string[] = [];
  globalThis.fetch = (async (url: string, init: any) => {
    sent.push(`${url} ${JSON.parse(init.body).to[0].email}`);
    return new Response("{}", { status: 201 });
  }) as any;
  try {
    const { store, out } = await order(
      { asset: "osimertinib", email: "analyst@pharma.example", newsletter: true },
      { BREVO_API_KEY: "test-key" },
    );
    assert.equal(out.body.ok, true, "the report is delivered");
    assert.equal(out.body.newsletter, "confirmation_sent");
    assert.equal(keys(store, "grant:").length, 1);
    assert.equal(keys(store, "pending:").length, 1, "a pending signup waits for the click");
    assert.deepEqual(keys(store, "news:"), [], "nobody is subscribed before confirming");
    assert.equal(sent.length, 1, "exactly one mail: the confirmation");
    assert.match(sent[0], /analyst@pharma\.example$/);
    const grant = JSON.parse(store.data.get(keys(store, "grant:")[0]) as string);
    assert.equal(grant.newsletter_requested, true);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("the report does not depend on the newsletter being able to send", async () => {
  const { store, out } = await order({ asset: "osimertinib", email: "analyst@pharma.example", newsletter: "on" });
  assert.equal(out.status, 200);
  assert.equal(out.body.ok, true);
  assert.equal(out.body.newsletter, "unavailable");
  assert.equal(keys(store, "grant:").length, 1);
  assert.deepEqual(keys(store, "pending:"), []);
});

test("once the Payment Link is set, the order goes to Stripe again", async () => {
  const { store, out } = await order(
    { asset: "osimertinib", email: "analyst@pharma.example" },
    { STRIPE_LINK_PACKAGE: "https://buy.stripe.com/test_abc" },
  );
  assert.equal(out.body.ok, true);
  assert.equal(out.body.payment, true);
  const url = new URL(out.body.url);
  assert.equal(url.hostname, "buy.stripe.com");
  const token = keys(store, "grant:")[0].slice("grant:".length);
  assert.equal(url.searchParams.get("client_reference_id"), token);
  assert.equal(url.searchParams.get("prefilled_email"), "analyst@pharma.example");
});

test("an order from anywhere else is still refused, email or not", async () => {
  const { store, out } = await order({ asset: "osimertinib", email: "analyst@pharma.example" }, {}, "https://evil.example");
  assert.equal(out.status, 403);
  assert.equal(store.data.size, 0);
});
