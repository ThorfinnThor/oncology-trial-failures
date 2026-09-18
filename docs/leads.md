# Lead capture for the sample form

The `/data-licensing` sample form posts to `web/pages/api/sample-request.ts`. Every request is
written twice: to Workers Logs (short retention) and, when the binding exists, to a KV namespace
that keeps it indefinitely. Without KV, a lead is lost once the log retention window passes.

## One-time setup

```bash
cd web
npx wrangler login                       # opens the browser; no token is pasted anywhere
npx wrangler kv namespace create LEADS   # prints the namespace id
```

Then uncomment the `kv_namespaces` block at the bottom of `web/wrangler.jsonc` and paste the id.
Deploy as usual (`npm run cloudflare:deploy`). A placeholder id fails the deploy, so the block
stays commented until the real id is in place.

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
