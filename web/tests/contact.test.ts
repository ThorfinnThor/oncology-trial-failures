import assert from "node:assert/strict";
import test from "node:test";

import { CONTACT_EMAIL } from "../lib/siteContact";
import contactHandler from "../pages/api/contact";

function fakeRes() {
  const output: { status: number; body: any; headers: Record<string, string> } = {
    status: 0,
    body: null,
    headers: {},
  };
  const response: any = {
    setHeader(name: string, value: string) {
      output.headers[name] = value;
    },
    status(code: number) {
      output.status = code;
      return response;
    },
    json(body: any) {
      output.body = body;
      return response;
    },
  };
  return { response, output };
}

test("the contact form sends to contact@ and replies to the visitor", async () => {
  const sent: any[] = [];
  const realFetch = globalThis.fetch;
  const savedKey = process.env.BREVO_API_KEY;
  const savedFrom = process.env.MAIL_FROM;
  process.env.BREVO_API_KEY = "test-key";
  process.env.MAIL_FROM = "old-address@example.com";
  globalThis.fetch = (async (_url: string, init: any) => {
    sent.push(JSON.parse(init.body));
    return new Response("{}", { status: 201 });
  }) as any;

  try {
    const { response, output } = fakeRes();
    await contactHandler({
      method: "POST",
      body: {
        topic: "correction",
        name: "Dr Example",
        email: "researcher@example.org",
        pageUrl: "https://clinicaltrialfailures.com/trial/NCT00000000",
        message: "Please review <b>this source text</b> before changing the record.",
      },
    } as any, response);

    assert.equal(output.status, 200);
    assert.equal(output.body.ok, true);
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].to, [{ email: CONTACT_EMAIL }]);
    assert.deepEqual(sent[0].sender, { email: CONTACT_EMAIL, name: "Clinical Trial Failures" });
    assert.deepEqual(sent[0].replyTo, { email: "researcher@example.org", name: "Dr Example" });
    assert.match(sent[0].subject, /Data correction/);
    assert.ok(!sent[0].htmlContent.includes("<b>this source text</b>"), "message markup must be escaped");
    assert.match(sent[0].textContent, /NCT00000000/);
  } finally {
    globalThis.fetch = realFetch;
    if (savedKey === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = savedKey;
    if (savedFrom === undefined) delete process.env.MAIL_FROM; else process.env.MAIL_FROM = savedFrom;
  }
});

test("the contact form validates topics and quietly absorbs honeypot submissions", async () => {
  const invalid = fakeRes();
  await contactHandler({
    method: "POST",
    body: { topic: "medical-advice", email: "person@example.org", message: "This is long enough." },
  } as any, invalid.response);
  assert.equal(invalid.output.status, 400);
  assert.match(invalid.output.body.error, /choose/i);

  const honeypot = fakeRes();
  await contactHandler({ method: "POST", body: { website: "spam.example" } } as any, honeypot.response);
  assert.equal(honeypot.output.status, 200);
  assert.equal(honeypot.output.body.ok, true);
});
