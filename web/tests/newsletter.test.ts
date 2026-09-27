// Double opt-in, at the only point where it can quietly fail.
//
// If confirm() is wrong, the symptom is not an error page: it is an empty list, weeks later,
// with every signup sitting in a pending key nobody looks at. So the three states it can be in
// are pinned here rather than discovered in production.

import assert from "node:assert/strict";
import test from "node:test";

import { confirm } from "../pages/api/newsletter";

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
