// Double opt-in, at the only point where it can quietly fail.
//
// If confirm() is wrong, the symptom is not an error page: it is an empty list, weeks later,
// with every signup sitting in a pending key nobody looks at. So the three states it can be in
// are pinned here rather than discovered in production.

import assert from "node:assert/strict";
import test from "node:test";

import { confirm, notifyOwner, stop } from "../pages/api/newsletter";

type Json = { status: number; body: any };

function fakeRes() {
  const out: Json = { status: 0, body: null };
  const res: any = {
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

function fakeStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
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

test("a pending signup becomes a subscription, and stops being pending", async () => {
  const store = fakeStore({
    "pending:abc": JSON.stringify({ email: "someone@example.com", requested_at: "2026-09-27T10:00:00Z", confirmed_at: null }),
  });
  const { res, out } = fakeRes();
  await confirm(store as any, "abc", res);

  assert.equal(out.status, 200);
  assert.equal(out.body.ok, true);
  assert.ok(store.data.has("news:abc"), "the subscriber must exist under the key the sender reads");
  assert.ok(!store.data.has("pending:abc"), "a confirmed signup must not stay pending");

  const record = JSON.parse(store.data.get("news:abc") as string);
  assert.equal(record.email, "someone@example.com");
  // The pair of timestamps is the evidence that this address asked and then agreed.
  assert.equal(record.requested_at, "2026-09-27T10:00:00Z");
  assert.ok(record.confirmed_at, "confirmation must be dated");
});

test("clicking the same link twice is not an error", async () => {
  const store = fakeStore({ "news:abc": JSON.stringify({ email: "someone@example.com" }) });
  const { res, out } = fakeRes();
  await confirm(store as any, "abc", res);
  assert.equal(out.status, 200);
  assert.equal(out.body.ok, true);
  assert.match(out.body.message, /already/i);
});

test("a link whose week ran out says so instead of silently doing nothing", async () => {
  const store = fakeStore();
  const { res, out } = fakeRes();
  await confirm(store as any, "gone", res);
  assert.equal(out.status, 410);
  assert.equal(out.body.ok, false);
  assert.match(out.body.error, /expired/i);
});

test("an unconfirmed signup is not readable as a subscriber", async () => {
  // The sender reads news: only. This is the guarantee the whole flow rests on.
  const store = fakeStore({ "pending:abc": JSON.stringify({ email: "someone@example.com" }) });
  assert.equal(await store.get("news:abc"), null);
});

test("confirming writes an index, so the same address cannot be subscribed twice", async () => {
  const store = fakeStore({
    "pending:abc": JSON.stringify({ email: "someone@example.com", requested_at: "2026-09-27T10:00:00Z" }),
  });
  const { res } = fakeRes();
  await confirm(store as any, "abc", res);

  const index = [...store.data.keys()].filter((k) => k.startsWith("sub:"));
  assert.equal(index.length, 1, "a confirmed address must be findable again without listing the store");
  assert.equal(store.data.get(index[0]), "abc", "the index points at the subscription");
  // And it is a hash, not the address: this key is an index, not a second copy of the list.
  assert.ok(!index[0].includes("@"));
  assert.match(index[0], /^sub:[0-9a-f]{64}$/);
});

test("a confirmation tells the owner who joined, once, at the address the Worker names", async () => {
  const sent: any[] = [];
  const realFetch = globalThis.fetch;
  const saved = { key: process.env.BREVO_API_KEY, to: process.env.NEWSLETTER_NOTIFY_TO };
  process.env.BREVO_API_KEY = "test-key";
  process.env.NEWSLETTER_NOTIFY_TO = "owner@example.com";
  globalThis.fetch = (async (_url: string, init: any) => {
    sent.push(JSON.parse(init.body));
    return new Response("{}", { status: 201 });
  }) as any;
  try {
    const store = fakeStore({ "pending:abc": JSON.stringify({ email: "new@example.com", company: "Acme", confirmed_at: null }) });
    await confirm(store as any, "abc", fakeRes().res);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].subject, "New Newsletter Registration CTF");
    assert.deepEqual(sent[0].to, [{ email: "owner@example.com" }]);
    assert.match(sent[0].textContent, /new@example\.com/);

    // The same link again: already confirmed, no second note.
    await confirm(store as any, "abc", fakeRes().res);
    assert.equal(sent.length, 1);

    // Markup in a company name is text in the note, not markup.
    await notifyOwner({ email: "x@example.com", company: "<b>Evil</b>" });
    assert.ok(!sent[1].htmlContent.includes("<b>Evil</b>"));
  } finally {
    globalThis.fetch = realFetch;
    if (saved.key === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = saved.key;
    if (saved.to === undefined) delete process.env.NEWSLETTER_NOTIFY_TO; else process.env.NEWSLETTER_NOTIFY_TO = saved.to;
  }
});

test("the mail client's one-click unsubscribe ends the subscription and frees the address", async () => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("gone@example.com"));
  const index = `sub:${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  const store = fakeStore({ "news:k1": JSON.stringify({ email: "gone@example.com" }), [index]: "k1" });
  const first = fakeRes();
  await stop(store as any, "k1", first.res);
  assert.equal(first.out.status, 200);
  assert.ok(!store.data.has("news:k1"));
  assert.ok(!store.data.has(index), "the address must be able to sign up again");
  // A second click, or the client retrying, is not an error.
  const second = fakeRes();
  await stop(store as any, "k1", second.res);
  assert.equal(second.out.status, 200);
});
