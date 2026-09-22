# Lead capture

Three forms write a lead: the full-access waiting list on `/pricing` and a custom-cohort request
(`web/pages/api/package-request.ts`), a brief PDF request (`brief-request.ts`) and the dataset
sample (`sample-request.ts`, no longer linked from a page). Every request is written twice: to
Workers Logs (short retention) and, when the binding exists, to a KV namespace that keeps it
indefinitely. Without KV, a lead is lost once the log retention window passes.

## Being told, rather than going to look

`package-request.ts` also sends a short mail when `BREVO_API_KEY` is set **as a secret on the
Worker** (the GitHub secret of the same name is for the weekly workflow and does not reach the
site). `LEAD_NOTIFY_TO` overrides the recipient; the default is `contact@clinicaltrialfailures.com`.

Without that secret nothing is sent and the lead is only in KV — which is a waiting list that
rings nowhere, so set it at the same time as the Brevo key for the newsletter. The mail is best
effort: the person has already been answered when it is attempted, and a failure is logged as
`lead_notify_failed` rather than turning their request into an error.

A paid order does not need this: Stripe mails you on every payment.

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
