# Lead capture for the sample form

The `/data-licensing` sample form posts to `web/pages/api/sample-request.ts`. Every request is
written twice: to Workers Logs (short retention) and, when the binding exists, to a KV namespace
that keeps it indefinitely. Without KV, a lead is lost once the log retention window passes.

## Setup

Done: the namespace `LEADS` exists in the Cloudflare account and its id is bound in
`web/wrangler.jsonc`. It takes effect on the next deploy (`npm run cloudflare:deploy`).

To recreate it in another account: Cloudflare dashboard → Storage & databases → Workers KV →
Create a KV namespace → name it `LEADS`, then put the id shown in the namespace URL into the
`kv_namespaces` block in `web/wrangler.jsonc`. (`npx wrangler kv namespace create LEADS` does the
same from the CLI.) The id is an identifier, not a secret; it grants nothing on its own.

## Reading the leads

```bash
cd web
npx wrangler kv key list --binding LEADS                 # keys are lead:<iso timestamp>:<email>
npx wrangler kv key get --binding LEADS "<key>"          # one lead as JSON
```

Each record holds: email, name, company, use case, whether the email is a free-mail domain,
the dataset version requested, the request time and the country header from Cloudflare.

## What is stored, and why

The form asks for a work email, company and use case, and requires consent before the sample is
issued. That is the minimum needed to follow up on an evaluation and is covered by the privacy
notice linked in the form. The honeypot field (`website`) is never stored: a filled honeypot gets
a success response without a sample and without a lead record.

If the API ever logs `lead_store_missing`, the KV binding is gone and leads are only in Workers Logs.
